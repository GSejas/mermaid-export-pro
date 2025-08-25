import * as vscode from 'vscode';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { ErrorHandler } from './errorHandler';
import { OnboardingManager } from '../services/onboardingManager';

export type ExportStrategyStatus = 'not-configured' | 'cli-available' | 'web-only' | 'checking';

interface StatusBarState {
  status: ExportStrategyStatus;
  details?: string;
  lastCheck?: Date;
  diagramCount?: number;
  fileName?: string;
}

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private currentState: StatusBarState;
  private onboardingManager: OnboardingManager;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, onboardingManager: OnboardingManager) {
    this.context = context;
    this.onboardingManager = onboardingManager;
    
    // Create status bar item (right side, before language mode)
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      100 // Priority - higher number = more to the left
    );
    
    this.currentState = { status: 'checking' };
    
    // Register click command
    this.statusBarItem.command = 'mermaidExportPro.statusBarClick';
    
    // Add to disposal
    context.subscriptions.push(this.statusBarItem);
    
    // Listen for active editor changes to show/hide status bar
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.updateVisibility();
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        // Update diagram count when document content changes
        if (e.document === vscode.window.activeTextEditor?.document) {
          this.updateVisibility();
        }
      })
    );
    
    // Initial setup
    this.checkStrategyStatus();
    this.updateVisibility();
  }

  /**
   * Check current export strategy availability and update status
   */
  async checkStrategyStatus(): Promise<void> {
    this.currentState.status = 'checking';
    this.updateStatusBar();

    try {
      const cliStrategy = new CLIExportStrategy();
      const isCliAvailable = await cliStrategy.isAvailable();
      
      if (isCliAvailable) {
        try {
          const version = await cliStrategy.getVersion();
          this.currentState = {
            status: 'cli-available',
            details: `CLI v${version}`,
            lastCheck: new Date()
          };
        } catch (error) {
          this.currentState = {
            status: 'cli-available',
            details: 'CLI available',
            lastCheck: new Date()
          };
        }
      } else {
        // Check if user has explicitly chosen web-only mode
        const config = vscode.workspace.getConfiguration('mermaidExportPro');
        const strategy = config.get<string>('exportStrategy');
        
        if (strategy === 'web') {
          this.currentState = {
            status: 'web-only',
            details: 'Web strategy configured',
            lastCheck: new Date()
          };
        } else {
          this.currentState = {
            status: 'not-configured',
            details: 'CLI not found, needs setup',
            lastCheck: new Date()
          };
        }
      }
    } catch (error) {
      this.currentState = {
        status: 'not-configured',
        details: 'Error checking status',
        lastCheck: new Date()
      };
      ErrorHandler.logWarning(`Status check failed: ${error}`);
    }

    this.updateStatusBar();
  }

  /**
   * Update the visual appearance of the status bar item
   */
  private updateStatusBar(): void {
    // Get current diagram count and file info
    const { diagramCount, fileName } = this.getMermaidDiagramInfo();
    this.currentState.diagramCount = diagramCount;
    this.currentState.fileName = fileName;

    if (diagramCount === 0) {
      this.statusBarItem.hide();
      return;
    }

    // Build status text based on configuration status and diagram count
    let statusText = '';
    let tooltip = '';
    let backgroundColor: vscode.ThemeColor | undefined;
    let color: vscode.ThemeColor | undefined;

    switch (this.currentState.status) {
      case 'not-configured':
        statusText = `$(alert) ${diagramCount} Mermaid${diagramCount > 1 ? 's' : ''} - Setup`;
        tooltip = `Mermaid Export Pro: ${diagramCount} diagram${diagramCount > 1 ? 's' : ''} found in ${fileName}\nClick to setup export tools`;
        backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        color = new vscode.ThemeColor('statusBarItem.warningForeground');
        break;

      case 'cli-available':
        statusText = `$(file-media) ${diagramCount} Mermaid${diagramCount > 1 ? 's' : ''}`;
        tooltip = `Mermaid Export Pro: ${diagramCount} diagram${diagramCount > 1 ? 's' : ''} in ${fileName}\nClick to export with ${this.currentState.details || 'CLI'}`;
        backgroundColor = undefined;
        color = new vscode.ThemeColor('statusBarItem.prominentForeground');
        break;

      case 'web-only':
        statusText = `$(globe) ${diagramCount} Mermaid${diagramCount > 1 ? 's' : ''}`;
        tooltip = `Mermaid Export Pro: ${diagramCount} diagram${diagramCount > 1 ? 's' : ''} in ${fileName}\nClick to export with Web strategy`;
        backgroundColor = undefined;
        color = new vscode.ThemeColor('statusBarItem.prominentForeground');
        break;

      case 'checking':
        statusText = `$(loading~spin) ${diagramCount} Mermaid${diagramCount > 1 ? 's' : ''}`;
        tooltip = `Mermaid Export Pro: ${diagramCount} diagram${diagramCount > 1 ? 's' : ''} in ${fileName}\nChecking export tools...`;
        backgroundColor = undefined;
        color = undefined;
        break;
    }

    this.statusBarItem.text = statusText;
    this.statusBarItem.tooltip = tooltip;
    this.statusBarItem.backgroundColor = backgroundColor;
    this.statusBarItem.color = color;
    this.statusBarItem.show();
  }

  /**
   * Get mermaid diagram information from current file
   */
  private getMermaidDiagramInfo(): { diagramCount: number; fileName: string } {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return { diagramCount: 0, fileName: '' };
    }

    const document = editor.document;
    const fileName = document.fileName;
    const baseName = fileName.split(/[\\/]/).pop() || '';
    const content = document.getText();
    
    // Check file extension
    if (fileName.endsWith('.mmd')) {
      // Pure mermaid file - count as 1 diagram if not empty
      return { 
        diagramCount: content.trim() ? 1 : 0, 
        fileName: baseName 
      };
    }
    
    // Check for markdown files with mermaid content
    if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
      const diagramCount = this.countMermaidBlocksInMarkdown(content);
      return { diagramCount, fileName: baseName };
    }
    
    return { diagramCount: 0, fileName: baseName };
  }

  /**
   * Count mermaid blocks in markdown content
   */
  private countMermaidBlocksInMarkdown(content: string): number {
    const lines = content.split('\n');
    let count = 0;
    let inMermaidBlock = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '```mermaid') {
        inMermaidBlock = true;
      } else if (trimmedLine === '```' && inMermaidBlock) {
        inMermaidBlock = false;
        count++;
      }
    }
    
    return count;
  }

  /**
   * Check if current editor has mermaid content
   */
  private hasMermaidContent(): boolean {
    const { diagramCount } = this.getMermaidDiagramInfo();
    return diagramCount > 0;
  }

  /**
   * Update visibility based on current editor
   */
  private updateVisibility(): void {
    if (this.hasMermaidContent()) {
      this.updateStatusBar(); // This calls show()
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * Handle status bar item clicks
   */
  async handleClick(): Promise<void> {
    // If configured properly, directly export current file
    if (this.currentState.status === 'cli-available' || this.currentState.status === 'web-only') {
      await this.exportCurrentFile();
      return;
    }

    // Otherwise show setup options
    switch (this.currentState.status) {
      case 'not-configured':
        await this.showSetupOptions();
        break;

      case 'checking':
        vscode.window.showInformationMessage('Still checking export strategy status...');
        break;
    }
  }

  /**
   * Export current file directly
   */
  private async exportCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found');
      return;
    }

    try {
      // Use the existing export command
      await vscode.commands.executeCommand('mermaidExportPro.exportCurrent');
    } catch (error) {
      // If main export fails, show options
      await this.showConfiguredOptions();
    }
  }

  /**
   * Show setup options for unconfigured state
   */
  private async showSetupOptions(): Promise<void> {
    const selection = await vscode.window.showQuickPick([
      {
        label: '⚡ Quick Setup',
        description: 'Auto-detect and configure',
        detail: 'Recommended - Let us configure the best option for you'
      },
      {
        label: '🎯 Custom Setup',
        description: 'Choose installation method',
        detail: 'Select between CLI, web-only, or other options'
      },
      {
        label: '🔄 Refresh Status',
        description: 'Check current state',
        detail: 'Re-scan for available export tools'
      }
    ], {
      placeHolder: 'Mermaid Export Pro is not configured. Choose an option:'
    });

    if (!selection) {
      return;
    }

    if (selection.label.includes('Quick Setup')) {
      // Delegate to onboarding manager
      const onboarding = this.onboardingManager;
      await onboarding.runSetup();
      // Refresh status after setup
      await this.checkStrategyStatus();
    } else if (selection.label.includes('Custom Setup')) {
      const onboarding = this.onboardingManager;
      await onboarding.runSetup();
      await this.checkStrategyStatus();
    } else if (selection.label.includes('Refresh')) {
      await this.checkStrategyStatus();
    }
  }

  /**
   * Show options when CLI is available and working
   */
  private async showConfiguredOptions(): Promise<void> {
    const selection = await vscode.window.showQuickPick([
      {
        label: '📊 Test Export',
        description: 'Run debug export test',
        detail: 'Test both CLI and web export strategies'
      },
      {
        label: '⚙️ Settings',
        description: 'Open extension settings',
        detail: 'Configure export preferences'
      },
      {
        label: '🔄 Refresh Status',
        description: 'Check current state',
        detail: 'Re-scan export tool availability'
      },
      {
        label: '🛠️ Reconfigure',
        description: 'Change setup',
        detail: 'Run setup wizard again'
      }
    ], {
      placeHolder: `Mermaid CLI is ready (${this.currentState.details}). Choose an option:`
    });

    if (!selection) {
      return;
    }

    if (selection.label.includes('Test Export')) {
      await vscode.commands.executeCommand('mermaidExportPro.debugExport');
    } else if (selection.label.includes('Settings')) {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
    } else if (selection.label.includes('Refresh')) {
      await this.checkStrategyStatus();
    } else if (selection.label.includes('Reconfigure')) {
      await this.onboardingManager.runSetup();
      await this.checkStrategyStatus();
    }
  }

  /**
   * Show options for web-only mode
   */
  private async showWebOnlyOptions(): Promise<void> {
    const selection = await vscode.window.showQuickPick([
      {
        label: '📊 Test Export',
        description: 'Test web export',
        detail: 'Run debug export to test web strategy'
      },
      {
        label: '⬆️ Upgrade to CLI',
        description: 'Install CLI tools',
        detail: 'Get better export quality with CLI strategy'
      },
      {
        label: '⚙️ Settings',
        description: 'Open extension settings',
        detail: 'Configure export preferences'
      },
      {
        label: '🔄 Refresh Status',
        description: 'Check for CLI',
        detail: 'See if CLI tools have been installed'
      }
    ], {
      placeHolder: 'Mermaid is in web-only mode. Choose an option:'
    });

    if (!selection) {
      return;
    }

    if (selection.label.includes('Test Export')) {
      await vscode.commands.executeCommand('mermaidExportPro.debugExport');
    } else if (selection.label.includes('Upgrade')) {
      await this.onboardingManager.runSetup();
      await this.checkStrategyStatus();
    } else if (selection.label.includes('Settings')) {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
    } else if (selection.label.includes('Refresh')) {
      await this.checkStrategyStatus();
    }
  }

  /**
   * Refresh status (public method for external calls)
   */
  async refresh(): Promise<void> {
    await this.checkStrategyStatus();
  }

  /**
   * Update status based on configuration changes
   */
  async onConfigurationChanged(): Promise<void> {
    await this.checkStrategyStatus();
  }

  /**
   * Hide the status bar item
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Show the status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Dispose of the status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}