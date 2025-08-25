import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { ErrorHandler } from '../ui/errorHandler';
import { PathUtils } from '../utils/pathUtils';
import { ExportOptions } from '../types';

interface DebugResult {
  strategy: string;
  success: boolean;
  duration: number;
  error?: string;
  outputFiles: string[];
  version?: string;
  stdout?: string;
  stderr?: string;
}

export async function runDebugExport(context: vscode.ExtensionContext): Promise<void> {
  ErrorHandler.logInfo('Starting debug export command...');

  const testDiagram = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`;

  const testFormats = ['svg', 'png', 'jpg'] as const;
  const testOptions: ExportOptions = {
    format: 'svg', // Will be updated per format
    theme: 'default',
    width: 800,
    height: 600,
    backgroundColor: 'white'
  };

  // Create timestamped debug folder
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0] + 'Z';
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
  const debugRoot = path.join(workspaceRoot, 'debug-exports', timestamp);
  const cliFolder = path.join(debugRoot, 'cli');
  const webFolder = path.join(debugRoot, 'web');

  try {
    // Create directories
    await fs.promises.mkdir(debugRoot, { recursive: true });
    await fs.promises.mkdir(cliFolder, { recursive: true });
    await fs.promises.mkdir(webFolder, { recursive: true });

    ErrorHandler.logInfo(`Created debug folder: ${debugRoot}`);

    const results: DebugResult[] = [];

    // Test with progress indication
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Running Debug Export Tests...',
      cancellable: false
    }, async (progress) => {
      
      let totalTests = testFormats.length * 2; // CLI + Web for each format
      let completedTests = 0;
      
      // Test each format
      for (const format of testFormats) {
        const formatOptions = { ...testOptions, format };
        
        // Test CLI Strategy
        progress.report({ 
          increment: (completedTests / totalTests) * 100, 
          message: `Testing CLI Export (${format.toUpperCase()})...` 
        });
        const cliResult = await testCLIStrategy(testDiagram, formatOptions, cliFolder);
        cliResult.strategy = `CLI (${format.toUpperCase()})`;
        results.push(cliResult);
        completedTests++;

        // Test Web Strategy  
        progress.report({ 
          increment: (completedTests / totalTests) * 100, 
          message: `Testing Web Export (${format.toUpperCase()})...` 
        });
        const webResult = await testWebStrategy(testDiagram, formatOptions, webFolder, context);
        webResult.strategy = `Web (${format.toUpperCase()})`;
        results.push(webResult);
        completedTests++;
      }
      
      progress.report({ increment: 100 });
    });

    // Generate debug report
    await generateDebugReport(debugRoot, testDiagram, testOptions, results);

    // Show completion message
    const openFolder = await vscode.window.showInformationMessage(
      `Debug export completed! Results saved to: ${path.basename(debugRoot)}`,
      'Open Debug Folder',
      'View Report',
      'Show in Explorer'
    );

    if (openFolder === 'Open Debug Folder') {
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(debugRoot), { forceNewWindow: true });
    } else if (openFolder === 'View Report') {
      const reportPath = path.join(debugRoot, 'debug.md');
      const doc = await vscode.workspace.openTextDocument(reportPath);
      await vscode.window.showTextDocument(doc);
    } else if (openFolder === 'Show in Explorer') {
      await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(debugRoot));
    }

  } catch (error) {
    ErrorHandler.logError(`Debug export failed: ${error}`);
    throw error;
  }
}

async function testCLIStrategy(diagram: string, options: ExportOptions, outputFolder: string): Promise<DebugResult> {
  const startTime = Date.now();
  const result: DebugResult = {
    strategy: 'CLI',
    success: false,
    duration: 0,
    outputFiles: []
  };

  try {
    const cliStrategy = new CLIExportStrategy();
    
    // Check if CLI is available
    const isAvailable = await cliStrategy.isAvailable();
    if (!isAvailable) {
      result.error = 'CLI not available - mmdc command not found. Install with: npm install -g @mermaid-js/mermaid-cli';
      result.duration = Date.now() - startTime;
      return result;
    }

    // Get version info
    try {
      result.version = await cliStrategy.getVersion();
    } catch (error) {
      result.version = 'Unknown - version check failed';
    }

    // Export diagram
    const buffer = await cliStrategy.export(diagram, options);
    
    // Save output file
    const outputPath = path.join(outputFolder, `diagram.${options.format}`);
    await fs.promises.writeFile(outputPath, buffer);
    
    result.success = true;
    result.outputFiles.push(outputPath);
    ErrorHandler.logInfo(`CLI export successful: ${outputPath}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide specific guidance for common errors
    if (errorMessage.includes('EFTYPE') || errorMessage.includes('spawn')) {
      result.error = `Puppeteer/Chromium launch failed: ${errorMessage}. Try: 1) Install Chrome/Edge, 2) Set PUPPETEER_EXECUTABLE_PATH, or 3) Use web strategy`;
    } else if (errorMessage.includes('ENOENT')) {
      result.error = 'Mermaid CLI not found. Install with: npm install -g @mermaid-js/mermaid-cli';
    } else if (errorMessage.includes('timeout')) {
      result.error = `Export timed out: ${errorMessage}. Diagram may be too complex for CLI strategy`;
    } else {
      result.error = errorMessage;
    }
    
    ErrorHandler.logError(`CLI export failed: ${result.error}`);
  }

  result.duration = Date.now() - startTime;
  return result;
}

async function testWebStrategy(diagram: string, options: ExportOptions, outputFolder: string, context: vscode.ExtensionContext): Promise<DebugResult> {
  const startTime = Date.now();
  const result: DebugResult = {
    strategy: 'Web',
    success: false,
    duration: 0,
    outputFiles: []
  };

  try {
    const webStrategy = new WebExportStrategy(context);
    
    // Export diagram
    const buffer = await webStrategy.export(diagram, options);
    
    // Save output file  
    const outputPath = path.join(outputFolder, `diagram.${options.format}`);
    await fs.promises.writeFile(outputPath, buffer);
    
    result.success = true;
    result.outputFiles.push(outputPath);
    ErrorHandler.logInfo(`Web export successful: ${outputPath}`);

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    ErrorHandler.logError(`Web export failed: ${result.error}`);
  }

  result.duration = Date.now() - startTime;
  return result;
}

async function generateDebugReport(debugRoot: string, diagram: string, options: ExportOptions, results: DebugResult[]): Promise<void> {
  const reportPath = path.join(debugRoot, 'debug.md');
  
  let report = `# Mermaid Export Pro - Debug Report

**Timestamp**: ${new Date().toISOString()}
**Test Diagram**:
\`\`\`mermaid
${diagram}
\`\`\`

**Export Options**:
- Format: ${options.format}
- Theme: ${options.theme}
- Dimensions: ${options.width}x${options.height}
- Background: ${options.backgroundColor}

## Results

`;

  for (const result of results) {
    report += `### ${result.strategy} Strategy

- **Status**: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}
- **Duration**: ${result.duration}ms
- **Version**: ${result.version || 'N/A'}
`;

    if (result.error) {
      report += `- **Error**: ${result.error}\n`;
    }

    if (result.outputFiles.length > 0) {
      report += `- **Output Files**:\n`;
      for (const file of result.outputFiles) {
        const exists = await fs.promises.access(file).then(() => true).catch(() => false);
        const size = exists ? (await fs.promises.stat(file)).size : 0;
        report += `  - ${path.basename(file)} (${exists ? `${size} bytes` : 'NOT FOUND'})\n`;
      }
    }

    if (result.stdout) {
      report += `- **Stdout**: \`${result.stdout}\`\n`;
    }

    if (result.stderr) {
      report += `- **Stderr**: \`${result.stderr}\`\n`;
    }

    report += '\n';
  }

  report += `## File Verification

`;

  // Check each output file
  const allFiles = results.flatMap(r => r.outputFiles);
  for (const filePath of allFiles) {
    const exists = await fs.promises.access(filePath).then(() => true).catch(() => false);
    if (exists) {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const hasSvgContent = content.includes('<svg');
      const hasGraphContent = content.includes('graph') || content.includes('<g ') || content.includes('<path');
      
      report += `- **${path.basename(filePath)}**: ${exists ? '✅' : '❌'} exists, ${hasSvgContent ? '✅' : '❌'} contains SVG, ${hasGraphContent ? '✅' : '❌'} contains graph data\n`;
    } else {
      report += `- **${path.basename(filePath)}**: ❌ file not found\n`;
    }
  }

  report += `
## Quick Commands

To inspect files manually:
\`\`\`bash
# Windows PowerShell
Get-Content "${debugRoot.replace(/\\/g, '/')}/*/diagram.*" | Select-String "<svg"

# Mac/Linux  
ls -la ${debugRoot}/*/
grep -l "svg" ${debugRoot}/*/diagram.*
\`\`\`

## Next Steps

1. **If CLI failed**: Install @mermaid-js/mermaid-cli globally or locally
2. **If Web failed**: Check VS Code webview support and browser security
3. **If both succeeded**: Compare output quality and file sizes
4. **Performance**: CLI took ${results.find(r => r.strategy === 'CLI')?.duration || 0}ms, Web took ${results.find(r => r.strategy === 'Web')?.duration || 0}ms
`;

  await fs.promises.writeFile(reportPath, report, 'utf8');
  ErrorHandler.logInfo(`Debug report generated: ${reportPath}`);
}