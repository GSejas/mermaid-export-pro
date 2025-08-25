import * as vscode from 'vscode';
import { ExportOptions, ExportStrategy } from '../types';
import { ErrorHandler } from '../ui/errorHandler';

/**
 * Simple web-based export strategy using inline mermaid.js
 * Fallback strategy that doesn't require bundling
 */
export class SimpleWebExportStrategy implements ExportStrategy {
  name = 'Simple Web Export Strategy';

  constructor(private context: vscode.ExtensionContext) {}

  getRequiredDependencies(): string[] {
    return []; // No external dependencies required
  }

  async isAvailable(): Promise<boolean> {
    // Web strategy is always available in VS Code
    return true;
  }

  async export(content: string, options: ExportOptions): Promise<Buffer> {
    ErrorHandler.logInfo('Starting simple web export strategy...');

    try {
      // Clean and validate content first
      const cleanContent = content.trim();
      if (!cleanContent) {
        throw new Error('Empty diagram content provided');
      }

      ErrorHandler.logInfo(`Rendering diagram with ${cleanContent.length} characters`);

      // Create a hidden webview panel for rendering
      const panel = vscode.window.createWebviewPanel(
        'mermaidSimpleExport',
        'Mermaid Simple Export',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [],
          enableCommandUris: false,
          enableForms: false
        }
      );

      const svgContent = await this.renderMermaidSVG(panel, cleanContent, options);
      
      ErrorHandler.logInfo(`Simple web export completed, SVG length: ${svgContent.length}`);
      
      // Clean up
      panel.dispose();

      return Buffer.from(svgContent, 'utf8');

    } catch (error) {
      ErrorHandler.logError(`Simple web export failed: ${error}`);
      throw new Error(`Simple web export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async renderMermaidSVG(panel: vscode.WebviewPanel, diagramContent: string, options: ExportOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Simple web export timeout after 15 seconds'));
      }, 15000);

      // Listen for messages from webview
      const messageDisposable = panel.webview.onDidReceiveMessage(
        (message) => {
          clearTimeout(timeout);
          messageDisposable.dispose();

          if (message.type === 'success') {
            resolve(message.svg);
          } else if (message.type === 'error') {
            reject(new Error(message.error));
          }
        },
        undefined,
        this.context.subscriptions
      );

      // Set webview HTML content with inline mermaid
      panel.webview.html = this.getSimpleWebviewContent(diagramContent, options);
    });
  }

  private getSimpleWebviewContent(diagramContent: string, options: ExportOptions): string {
    const theme = options.theme || 'default';
    const backgroundColor = options.backgroundColor || 'white';
    const width = options.width || 800;
    const height = options.height || 600;

    // Generate nonce for CSP
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; font-src data:; img-src data:;">
    <title>Simple Mermaid Export</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: ${backgroundColor};
            font-family: Arial, sans-serif;
        }
        #container {
            width: ${width}px;
            height: ${height}px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .error {
            color: red;
            padding: 16px;
            border: 1px solid red;
            background-color: #ffeaea;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="diagram">Loading...</div>
    </div>
    
    <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"></script>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const diagramText = \`${diagramContent}\`;
        
        console.log('Simple webview loaded, initializing mermaid...');
        
        // Configure mermaid
        mermaid.initialize({
            startOnLoad: false,
            theme: '${theme}',
            securityLevel: 'loose',
            htmlLabels: true,
            themeVariables: {
                background: '${backgroundColor}',
                primaryColor: '#fff',
                primaryTextColor: '#000',
                primaryBorderColor: '#000',
                lineColor: '#000'
            }
        });
        
        async function renderDiagram() {
            const diagramElement = document.getElementById('diagram');
            
            try {
                console.log('Starting simple mermaid render...');
                
                if (!diagramText.trim()) {
                    throw new Error('Empty diagram content');
                }
                
                // Use mermaid.render
                const renderResult = await mermaid.render('simple-diagram-' + Date.now(), diagramText.trim());
                console.log('Simple mermaid render successful');
                
                // Insert the SVG
                diagramElement.innerHTML = renderResult.svg;
                
                // Get the SVG element
                const svgElement = diagramElement.querySelector('svg');
                if (svgElement) {
                    // Set dimensions
                    svgElement.setAttribute('width', '${width}');
                    svgElement.setAttribute('height', '${height}');
                    
                    // Send success message
                    vscode.postMessage({
                        type: 'success',
                        svg: svgElement.outerHTML
                    });
                } else {
                    throw new Error('No SVG element generated');
                }
                
            } catch (error) {
                console.error('Simple mermaid rendering failed:', error);
                
                diagramElement.innerHTML = \`<div class="error">
                    <strong>Error:</strong> \${error.message}<br>
                    <strong>Diagram:</strong><br>
                    <pre>\${diagramText}</pre>
                </div>\`;
                
                vscode.postMessage({
                    type: 'error',
                    error: error.message || 'Simple rendering failed'
                });
            }
        }
        
        // Wait for mermaid to load
        if (typeof mermaid !== 'undefined') {
            setTimeout(renderDiagram, 500);
        } else {
            setTimeout(() => {
                if (typeof mermaid !== 'undefined') {
                    renderDiagram();
                } else {
                    vscode.postMessage({
                        type: 'error',
                        error: 'Mermaid library failed to load from CDN'
                    });
                }
            }, 2000);
        }
    </script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}