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
   * Generates and displays a rich markdown report with visualizations
   */
  static async showOutputReport(): Promise<void> {
    this.initialize();

    try {
      const report = await this.generateMarkdownReport();

      // Create a new untitled markdown document
      const doc = await vscode.workspace.openTextDocument({
        content: report,
        language: 'markdown'
      });

      await vscode.window.showTextDocument(doc, { preview: false });

      // Show success message
      vscode.window.showInformationMessage('Export Log Report generated successfully!', 'View in Preview')
        .then(choice => {
          if (choice === 'View in Preview') {
            vscode.commands.executeCommand('markdown.showPreview');
          }
        });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates a comprehensive markdown report with mermaid diagrams
   */
  private static async generateMarkdownReport(): Promise<string> {
    const telemetryService = await this.getTelemetryService();
    const logs = this.getRecentLogs();

    let report = `# Mermaid Export Pro - Diagnostic Report\n\n`;
    report += `**Generated**: ${new Date().toLocaleString()}\n\n`;
    report += `---\n\n`;

    // If telemetry is available and enabled, include statistics
    if (telemetryService) {
      try {
        const summary = telemetryService.generateSummary();

        report += `## 📊 Export Statistics\n\n`;

        // Summary metrics
        report += `### Overview\n\n`;
        report += `- **Total Exports**: ${summary.totalExports}\n`;
        report += `- **Total Errors**: ${summary.totalErrors}\n`;
        report += `- **Success Rate**: ${summary.totalExports > 0 ? ((summary.totalExports - summary.totalErrors) / summary.totalExports * 100).toFixed(1) : 0}%\n`;
        report += `- **Average Export Time**: ${summary.averageExportTime.toFixed(2)}ms\n`;
        report += `- **Sessions**: ${summary.sessionCount}\n\n`;

        // Export formats pie chart
        if (Object.keys(summary.exportsByFormat).length > 0) {
          report += `### Export Formats Distribution\n\n`;
          report += this.generatePieChart('Export Formats', summary.exportsByFormat);
          report += `\n`;
        }

        // Export strategies pie chart
        if (Object.keys(summary.exportsByStrategy).length > 0) {
          report += `### Export Strategies Distribution\n\n`;
          report += this.generatePieChart('Export Strategies', summary.exportsByStrategy);
          report += `\n`;
        }

        // Diagram types bar chart
        if (Object.keys(summary.exportsByDiagramType).length > 0) {
          report += `### Diagram Types\n\n`;
          report += this.generateBarChart('Diagram Types', summary.exportsByDiagramType);
          report += `\n`;
        }

        // Command usage bar chart
        if (Object.keys(summary.commandUsage).length > 0) {
          report += `### Command Usage\n\n`;
          report += this.generateBarChart('Command Usage', summary.commandUsage);
          report += `\n`;
        }

        // Performance metrics
        report += `### Performance Metrics\n\n`;
        report += '```mermaid\n';
        report += 'graph LR\n';
        report += `    A[CLI Strategy] -->|Success Rate: ${summary.cliSuccessRate.toFixed(1)}%| B[✓ Exports]\n`;
        report += `    C[Web Strategy] -->|Success Rate: ${summary.webSuccessRate.toFixed(1)}%| D[✓ Exports]\n`;
        report += '    style B fill:#90EE90\n';
        report += '    style D fill:#90EE90\n';
        report += '```\n\n';

        // Error statistics
        if (summary.totalErrors > 0) {
          report += `### Error Statistics\n\n`;
          report += `**Total Errors**: ${summary.totalErrors}\n\n`;

          if (Object.keys(summary.errorsByType).length > 0) {
            report += this.generatePieChart('Errors by Type', summary.errorsByType);
            report += `\n`;
          }
        }

        // Usage timeline
        report += `### Usage Timeline\n\n`;
        report += `- **First Used**: ${summary.firstUsed}\n`;
        report += `- **Last Used**: ${summary.lastUsed}\n\n`;

      } catch (error) {
        report += `*Unable to load telemetry statistics*\n\n`;
      }
    } else {
      report += `## 📊 Export Statistics\n\n`;
      report += `*Telemetry is disabled. Enable it in settings to see detailed statistics.*\n\n`;
      report += `To enable: \`Settings > Mermaid Export Pro > Telemetry > Enabled\`\n\n`;
    }

    // System health status
    report += `---\n\n`;
    report += `## 🏥 System Health\n\n`;
    report += await this.generateHealthStatus();
    report += `\n`;

    // Recent logs
    report += `---\n\n`;
    report += `## 📝 Recent Activity Log\n\n`;

    if (logs.length > 0) {
      report += this.generateLogTimeline(logs);
      report += `\n`;
      report += `### Detailed Logs\n\n`;
      report += '```\n';
      report += logs.join('\n');
      report += '\n```\n\n';
    } else {
      report += `*No recent activity logged*\n\n`;
    }

    // Footer
    report += `---\n\n`;
    report += `*Report generated by Mermaid Export Pro v${this.getExtensionVersion()}*\n`;
    report += `*To export raw telemetry data: Command Palette > "Mermaid Export Pro: Export Telemetry Data"*\n`;

    return report;
  }

  /**
   * Generate a mermaid pie chart from data
   */
  private static generatePieChart(title: string, data: Record<string, number>): string {
    let chart = '```mermaid\n';
    chart += `%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#4A90E2', 'primaryTextColor': '#fff', 'primaryBorderColor': '#2E5C8A', 'lineColor': '#4A90E2', 'secondaryColor': '#50C878', 'tertiaryColor': '#FFB347'}}}%%\n`;
    chart += 'pie title ' + title + '\n';

    for (const [key, value] of Object.entries(data)) {
      chart += `    "${key}" : ${value}\n`;
    }

    chart += '```\n';
    return chart;
  }

  /**
   * Generate a mermaid bar chart from data
   */
  private static generateBarChart(title: string, data: Record<string, number>): string {
    let chart = '```mermaid\n';
    chart += `%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#4A90E2'}}}%%\n`;
    chart += 'graph TD\n';
    chart += `    Title["${title}"]\n`;

    let index = 0;
    for (const [key, value] of Object.entries(data)) {
      const nodeId = `N${index}`;
      const sanitizedKey = key.replace(/['"]/g, '');
      chart += `    Title --> ${nodeId}["${sanitizedKey}: ${value}"]\n`;
      index++;
    }

    chart += '```\n';
    return chart;
  }

  /**
   * Generate a timeline diagram from logs
   */
  private static generateLogTimeline(logs: string[]): string {
    // Parse recent logs and create a simplified timeline
    const recentLogs = logs.slice(-10); // Last 10 events
    const timelineItems: Array<{ time: string; level: string; message: string }> = [];

    for (const log of recentLogs) {
      const match = log.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[(INFO|WARN|ERROR)\]\s+(.+)/);
      if (match) {
        timelineItems.push({
          time: new Date(match[1]).toLocaleTimeString(),
          level: match[2],
          message: match[3].substring(0, 40) + (match[3].length > 40 ? '...' : '')
        });
      }
    }

    if (timelineItems.length === 0) {
      return '*No timeline data available*\n';
    }

    let timeline = '```mermaid\n';
    timeline += 'timeline\n';
    timeline += '    title Recent Activity Timeline\n';

    for (const item of timelineItems) {
      const levelIcon = item.level === 'ERROR' ? '❌' : item.level === 'WARN' ? '⚠️' : '✓';
      timeline += `    ${item.time} : ${levelIcon} ${item.message.replace(/:/g, ' ')}\n`;
    }

    timeline += '```\n';
    return timeline;
  }

  /**
   * Generate system health status diagram
   */
  private static async generateHealthStatus(): Promise<string> {
    // This would ideally check actual system health
    let health = '```mermaid\n';
    health += 'graph LR\n';
    health += '    System[System Status] --> CLI{CLI Available?}\n';
    health += '    System --> Node{Node.js}\n';
    health += '    System --> VSCode{VS Code}\n';
    health += '    CLI -->|Check Status| CLIStatus[Run Diagnostics]\n';
    health += '    Node -->|Runtime| NodeOK[✓ Available]\n';
    health += '    VSCode -->|Extension Host| VSCodeOK[✓ Running]\n';
    health += '    style NodeOK fill:#90EE90\n';
    health += '    style VSCodeOK fill:#90EE90\n';
    health += '    click CLIStatus "command:mermaidExportPro.diagnostics" "Run Full Diagnostics"\n';
    health += '```\n\n';
    health += `*Click "Run Diagnostics" in the preview or run: Command Palette > "Mermaid Export Pro: Run Diagnostics"*\n`;
    return health;
  }

  /**
   * Get recent logs from the output channel
   */
  private static getRecentLogs(): string[] {
    // Return logs from the buffer if available
    return this.logBuffer.slice();
  }

  /**
   * Log buffer to store recent log entries for report generation
   */
  private static logBuffer: string[] = [];
  private static readonly MAX_LOG_BUFFER_SIZE = 100;

  /**
   * Get telemetry service if available
   */
  private static async getTelemetryService(): Promise<any | null> {
    try {
      const { TelemetryService } = await import('../services/telemetryService.js');
      const context = this.getExtensionContext();
      if (context) {
        return TelemetryService.getInstance(context);
      }
    } catch (error) {
      // Telemetry service not available
    }
    return null;
  }

  /**
   * Get extension context (cached from initialization)
   */
  private static extensionContext?: vscode.ExtensionContext;

  static setExtensionContext(context: vscode.ExtensionContext): void {
    this.extensionContext = context;
  }

  private static getExtensionContext(): vscode.ExtensionContext | undefined {
    return this.extensionContext;
  }

  /**
   * Get extension version
   */
  private static getExtensionVersion(): string {
    try {
      const context = this.getExtensionContext();
      return context?.extension.packageJSON.version || 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
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