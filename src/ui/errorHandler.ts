import * as vscode from 'vscode';
import { MermaidExportError, ErrorInfo } from '../types';

/**
 * Provides a centralized mechanism for handling and logging errors within the VS Code extension.
 *
 * This is a static utility class that manages a dedicated VS Code `OutputChannel` for detailed logging.
 * It differentiates between generic `Error` types and custom `MermaidExportError` to provide
 * tailored user feedback and recovery options. It can display error messages to the user with
 * actionable buttons, such as installing dependencies, opening documentation, or reporting an issue on GitHub.
 *
 * All methods are static, so this class should not be instantiated.
 *
 * @example
 * try {
 *   // Some operation that might fail
 *   throw new Error('Something went wrong');
 * } catch (error) {
 *   if (error instanceof Error) {
 *     ErrorHandler.handleError(error, 'ExportOperation');
 *   }
 * }
 *
 * @see {@link vscode.OutputChannel}
 * @see {@link vscode.window.showErrorMessage}
 * @see {@link MermaidExportError}
 */
export class ErrorHandler {
  private static outputChannel: vscode.OutputChannel;

  static initialize(): void {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('Mermaid Export Pro');
    }
  }

  /**
   * Handles errors with appropriate user feedback
   */
  static async handleError(error: Error | MermaidExportError, context?: string): Promise<void> {
    this.initialize();

    const timestamp = new Date().toISOString();
    const contextInfo = context ? ` [${context}]` : '';
    
    if (error instanceof MermaidExportError) {
      await this.handleMermaidError(error, contextInfo);
    } else {
      await this.handleGenericError(error, contextInfo);
    }

    // Log to output channel
    this.outputChannel.appendLine(`${timestamp}${contextInfo} ${error.message}`);
    if (error.stack) {
      this.outputChannel.appendLine(error.stack);
    }
  }

  private static async handleMermaidError(error: MermaidExportError, contextInfo: string): Promise<void> {
    const message = `${error.errorInfo.message}${contextInfo}`;
    
    const actions: string[] = [];
    if (error.errorInfo.recoveryAction) {
      actions.push(error.errorInfo.recoveryAction);
    }
    actions.push('Show Log');

    const selection = await vscode.window.showErrorMessage(message, ...actions);
    
    if (selection === 'Show Log') {
      this.outputChannel.show();
    } else if (selection === error.errorInfo.recoveryAction) {
      await this.executeRecoveryAction(error.errorInfo);
    }
  }

  private static async handleGenericError(error: Error, contextInfo: string): Promise<void> {
    const message = `Mermaid Export Pro Error: ${error.message}${contextInfo}`;
    const selection = await vscode.window.showErrorMessage(message, 'Show Log', 'Report Issue');
    
    if (selection === 'Show Log') {
      this.outputChannel.show();
    } else if (selection === 'Report Issue') {
      await this.openIssueReporter(error);
    }
  }

  private static async executeRecoveryAction(errorInfo: ErrorInfo): Promise<void> {
    switch (errorInfo.code) {
      case 'CLI_NOT_INSTALLED':
        await this.handleCliNotInstalled();
        break;
      case 'INVALID_MERMAID_SYNTAX':
        await this.handleInvalidSyntax();
        break;
      case 'OUTPUT_PERMISSION_DENIED':
        await this.handlePermissionDenied();
        break;
      default:
        vscode.window.showInformationMessage('Recovery action not implemented for this error type.');
    }
  }

  private static async handleCliNotInstalled(): Promise<void> {
    const selection = await vscode.window.showInformationMessage(
      'Mermaid CLI is not installed. Would you like to install it now?',
      'Install via npm',
      'Install Globally',
      'Use Web Fallback'
    );

    if (selection === 'Install via npm') {
      const terminal = vscode.window.createTerminal('Mermaid CLI Install');
      terminal.sendText('npm install @mermaid-js/mermaid-cli');
      terminal.show();
    } else if (selection === 'Install Globally') {
      const terminal = vscode.window.createTerminal('Mermaid CLI Install');
      terminal.sendText('npm install -g @mermaid-js/mermaid-cli');
      terminal.show();
    }
  }

  private static async handleInvalidSyntax(): Promise<void> {
    const selection = await vscode.window.showInformationMessage(
      'The Mermaid diagram contains syntax errors. Would you like to validate it?',
      'Open Mermaid Live Editor',
      'Check Documentation'
    );

    if (selection === 'Open Mermaid Live Editor') {
      vscode.env.openExternal(vscode.Uri.parse('https://mermaid.live'));
    } else if (selection === 'Check Documentation') {
      vscode.env.openExternal(vscode.Uri.parse('https://mermaid.js.org/'));
    }
  }

  private static async handlePermissionDenied(): Promise<void> {
    const selection = await vscode.window.showInformationMessage(
      'Permission denied when writing to output directory. Please check folder permissions.',
      'Choose Different Location',
      'Open Output Folder'
    );

    if (selection === 'Choose Different Location') {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('diagram.png'),
        filters: {
          'Images': ['png', 'svg', 'pdf', 'webp']
        }
      });
      
      if (uri) {
        vscode.window.showInformationMessage(`Selected new location: ${uri.fsPath}`);
      }
    }
  }

  private static async openIssueReporter(error: Error): Promise<void> {
    const issueBody = encodeURIComponent(
      `## Error Report\n\n` +
      `**Error Message:** ${error.message}\n\n` +
      `**Stack Trace:**\n\`\`\`\n${error.stack || 'No stack trace available'}\n\`\`\`\n\n` +
      `**Environment:**\n` +
      `- VS Code Version: ${vscode.version}\n` +
      `- OS: ${process.platform}\n` +
      `- Extension Version: 0.0.1\n\n` +
      `**Steps to Reproduce:**\n1. \n2. \n3. \n\n` +
      `**Expected Behavior:**\n\n` +
      `**Actual Behavior:**\n`
    );

    const issueUrl = `https://github.com/your-username/mermaid-export-pro/issues/new?body=${issueBody}`;
    vscode.env.openExternal(vscode.Uri.parse(issueUrl));
  }

  /**
   * Creates standardized error info objects
   */
  static createErrorInfo(
    code: string, 
    message: string, 
    details?: string, 
    recoveryAction?: string
  ): ErrorInfo {
    return { code, message, details, recoveryAction };
  }

  /**
   * Logs information to output channel
   */
  static logInfo(message: string): void {
    this.initialize();
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`${timestamp} [INFO] ${message}`);
  }

  /**
   * Logs warnings to output channel
   */
  static logWarning(message: string): void {
    this.initialize();
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`${timestamp} [WARN] ${message}`);
  }

  /**
   * Logs errors to output channel
   */
  static logError(message: string): void {
    this.initialize();
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`${timestamp} [ERROR] ${message}`);
  }

  /**
   * Shows the output channel
   */
  static showOutput(): void {
    this.initialize();
    this.outputChannel.show();
  }

  /**
   * Disposes of resources
   */
  static dispose(): void {
    if (this.outputChannel) {
      this.outputChannel.dispose();
    }
  }
}