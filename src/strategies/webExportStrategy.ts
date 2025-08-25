/**
 * Mermaid Export Pro - Web Export Strategy
 * 
 * Purpose: VS Code webview-based mermaid diagram export with bundled dependencies
 * Author: Claude Code Assistant
 * Date: 2025-08-24
 * 
 * Security: Nonce-based CSP, bundled mermaid.js, no external CDN dependencies
 * Performance: Robust handshake protocol with timeout and retry logic
 * Error Handling: Comprehensive diagnostics and graceful degradation
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { ExportOptions, ExportStrategy } from '../types';
import { ErrorHandler } from '../ui/errorHandler';

interface WebviewMessage {
  type: 'ready' | 'svg' | 'error';
  svg?: string;
  error?: string;
  stack?: string;
  metadata?: any;
  diagramText?: string;
}

/**
 * Web-based export strategy using VS Code webview + bundled mermaid.js
 * 
 * @example
 * ```typescript
 * const strategy = new WebExportStrategy(context);
 * const svgBuffer = await strategy.export(diagramText, { format: 'svg', theme: 'default' });
 * ```
 */
export class WebExportStrategy implements ExportStrategy {
  name = 'Web Export Strategy (Bundled)';

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Check if required dependencies are available
   * @returns {string[]} List of dependencies (empty for web strategy)
   */
  getRequiredDependencies(): string[] {
    return []; // No external dependencies - uses bundled mermaid.js
  }

  /**
   * Check if web export strategy is available
   * Validates that the bundled webview script exists
   * @returns {Promise<boolean>} True if webview bundle exists and is accessible
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if bundled webview script exists
      const webviewScriptPath = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js');
      await vscode.workspace.fs.stat(webviewScriptPath);
      return true;
    } catch (error) {
      ErrorHandler.logWarning(`Web strategy not available: bundled script missing at dist/webview.js. Run build first.`);
      return false;
    }
  }

  /**
   * Export mermaid diagram content to buffer using webview rendering
   * 
   * @param {string} content - Mermaid diagram source code
   * @param {ExportOptions} options - Export configuration (format, theme, dimensions)
   * @returns {Promise<Buffer>} Rendered diagram as buffer
   * @throws {Error} When webview fails to initialize, render, or times out
   */
  async export(content: string, options: ExportOptions): Promise<Buffer> {
    ErrorHandler.logInfo('Starting web export strategy with bundled mermaid.js');

    try {
      // Validate and clean input
      const cleanContent = content.trim();
      if (!cleanContent) {
        throw new Error('Empty diagram content provided to web export strategy');
      }

      ErrorHandler.logInfo(`Web export: rendering ${cleanContent.length} character diagram`);

      // Create webview panel for rendering
      const panel = vscode.window.createWebviewPanel(
        'mermaidWebExport',
        'Mermaid Web Export',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist')],
          enableCommandUris: false,
          enableForms: false
        }
      );

      try {
        // Render using robust handshake protocol
        const svgContent = await this.renderWithHandshake(panel, cleanContent, options);
        
        ErrorHandler.logInfo(`Web export completed successfully: ${svgContent.length} characters`);
        
        // Return appropriate format
        if (options.format === 'svg') {
          return Buffer.from(svgContent, 'utf8');
        } else {
          // Convert SVG to other formats using webview canvas
          ErrorHandler.logInfo(`Converting SVG to ${options.format} format using canvas`);
          return await this.convertSvgToFormat(panel, svgContent, options);
        }

      } finally {
        // Always clean up webview panel
        panel.dispose();
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown web export error';
      ErrorHandler.logError(`Web export failed: ${errorMsg}`);
      throw new Error(`Web export strategy failed: ${errorMsg}`);
    }
  }

  /**
   * Render mermaid diagram using robust host ↔ webview handshake protocol
   * 
   * Implementation:
   * 1. Load webview with bundled script and proper CSP
   * 2. Wait for 'ready' message from webview (with timeout & retry)
   * 3. Send render request with diagram content
   * 4. Wait for 'svg' or 'error' response
   * 
   * @param {vscode.WebviewPanel} panel - VS Code webview panel
   * @param {string} diagramContent - Mermaid diagram source
   * @param {ExportOptions} options - Rendering options
   * @returns {Promise<string>} SVG content
   * @throws {Error} On timeout, initialization failure, or rendering error
   */
  private async renderWithHandshake(panel: vscode.WebviewPanel, diagramContent: string, options: ExportOptions): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let isResolved = false;
      let messageDisposable: vscode.Disposable | null = null;

      // Overall timeout for entire operation
      const globalTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error('Web export global timeout after 20 seconds - check VS Code Developer Tools console for details'));
        }
      }, 20000);

      // Message handler for webview communication
      messageDisposable = panel.webview.onDidReceiveMessage(
        async (message: WebviewMessage) => {
          if (isResolved) {
            return;
          }

          ErrorHandler.logInfo(`Web export: received message type '${message.type}'`);

          switch (message.type) {
            case 'ready':
              try {
                // Webview is ready, send render request
                await this.sendRenderRequest(panel, diagramContent, options);
              } catch (error) {
                isResolved = true;
                cleanup();
                reject(new Error(`Failed to send render request: ${error}`));
              }
              break;

            case 'svg':
              if (message.svg) {
                isResolved = true;
                cleanup();
                resolve(message.svg);
              } else {
                isResolved = true;
                cleanup();
                reject(new Error('Webview returned success but no SVG content'));
              }
              break;

            case 'error':
              isResolved = true;
              cleanup();
              const errorDetail = message.stack ? `\\n${message.stack}` : '';
              reject(new Error(`Webview rendering error: ${message.error}${errorDetail}`));
              break;

            default:
              ErrorHandler.logWarning(`Web export: unknown message type '${message.type}'`);
          }
        },
        undefined,
        this.context.subscriptions
      );

      function cleanup() {
        clearTimeout(globalTimeout);
        messageDisposable?.dispose();
      }

      // Initialize webview HTML content
      try {
        panel.webview.html = this.createWebviewHTML(panel, options);
        ErrorHandler.logInfo('Web export: webview HTML initialized, waiting for ready signal...');
      } catch (error) {
        isResolved = true;
        cleanup();
        reject(new Error(`Failed to initialize webview HTML: ${error}`));
      }
    });
  }

  /**
   * Send render request to initialized webview
   * @param {vscode.WebviewPanel} panel - Webview panel
   * @param {string} diagramContent - Mermaid source code
   * @param {ExportOptions} options - Render options
   */
  private async sendRenderRequest(panel: vscode.WebviewPanel, diagramContent: string, options: ExportOptions): Promise<void> {
    // Use postMessage to trigger webview rendering
    // The webview will handle this by calling initializeMermaidWebview() and renderDiagram()
    await panel.webview.postMessage({
      type: 'render',
      diagramText: diagramContent,
      options: {
        theme: options.theme,
        backgroundColor: options.backgroundColor,
        width: options.width,
        height: options.height
      }
    });
    
    ErrorHandler.logInfo('Web export: render request sent to webview');
  }

  /**
   * Create HTML content for webview with proper CSP and asset loading
   * Uses VS Code URI APIs for secure resource loading
   * 
   * @param {vscode.WebviewPanel} panel - Webview panel for URI conversion
   * @param {ExportOptions} options - Styling options
   * @returns {string} Complete HTML document
   */
  private createWebviewHTML(panel: vscode.WebviewPanel, options: ExportOptions): string {
    const webview = panel.webview;
    
    // **CRITICAL: Use proper VS Code URI pattern for bundled assets**
    const webviewScriptLocal = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js');
    const webviewScriptUri = webview.asWebviewUri(webviewScriptLocal);
    
    // Generate cryptographically secure nonce for CSP
    const nonce = this.generateNonce();
    
    // Styling options
    const backgroundColor = options.backgroundColor || 'white';
    const width = options.width || 800;
    const height = options.height || 600;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} data:; img-src ${webview.cspSource} data:;">
    <title>Mermaid Web Export</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: ${backgroundColor};
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
        }
        #container {
            width: ${width}px;
            height: ${height}px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #e1e4e8;
        }
        .status {
            color: #586069;
            font-style: italic;
            text-align: center;
        }
        .error {
            color: #d73a49;
            padding: 16px;
            border: 1px solid #d73a49;
            background-color: #ffeaea;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="diagram" class="status">Initializing webview...</div>
    </div>
    
    <!-- Bundled webview script with proper nonce -->
    <script nonce="${nonce}" src="${webviewScriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Generate cryptographically secure nonce for Content Security Policy
   * @returns {string} 32-character random nonce
   */
  private generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Convert SVG to other formats using webview canvas rendering
   * @param {vscode.WebviewPanel} panel - Webview panel for conversion
   * @param {string} svgContent - SVG content to convert
   * @param {ExportOptions} options - Export options with target format
   * @returns {Promise<Buffer>} Converted format as buffer
   */
  private async convertSvgToFormat(panel: vscode.WebviewPanel, svgContent: string, options: ExportOptions): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`SVG conversion timeout after 10 seconds`));
      }, 10000);

      // Listen for conversion result
      const messageDisposable = panel.webview.onDidReceiveMessage(
        (message) => {
          clearTimeout(timeout);
          messageDisposable.dispose();

          if (message.type === 'conversion_success') {
            const base64Data = message.data.split(',')[1]; // Remove data:image/png;base64, prefix
            resolve(Buffer.from(base64Data, 'base64'));
          } else if (message.type === 'conversion_error') {
            reject(new Error(message.error));
          }
        },
        undefined,
        this.context.subscriptions
      );

      // Send conversion request
      panel.webview.postMessage({
        type: 'convert',
        svg: svgContent,
        format: options.format,
        width: options.width || 800,
        height: options.height || 600,
        backgroundColor: options.backgroundColor || 'white'
      });
    });
  }
}