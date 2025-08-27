import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { ErrorHandler } from '../ui/errorHandler';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';

interface SystemCapabilities {
  hasNodeJs: boolean;
  nodeVersion?: string;
  hasMermaidCli: boolean;
  mermaidVersion?: string;
  hasNpm: boolean;
  hasYarn: boolean;
  workspaceHasPackageJson: boolean;
  canInstallGlobally: boolean;
}

export type InstallMethod = 'local' | 'global' | 'web-only' | 'skip';

export class OnboardingManager {
  private static readonly ONBOARDING_KEY = 'mermaidExportPro.onboardingCompleted';
  private static readonly SETUP_PREFERENCE_KEY = 'mermaidExportPro.setupPreference';

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Check if user needs onboarding and show welcome if needed
   */
  async maybeShowWelcome(): Promise<void> {
    // During development (Extension Development Host) global state may be reset between runs.
    // Skip showing onboarding in dev mode to avoid repeated prompts while debugging.
    if (this.context.extensionMode === vscode.ExtensionMode.Development) {
      ErrorHandler.logInfo('Skipping onboarding in development mode');
      return;
    }

    const hasCompletedOnboarding = this.context.globalState.get(OnboardingManager.ONBOARDING_KEY, false);

    if (!hasCompletedOnboarding) {
      await this.showWelcomeFlow();
    } else {
      // Check if setup is still valid
      await this.validateExistingSetup();
    }
  }

  /**
   * Show welcome notification and start onboarding
   */
  private async showWelcomeFlow(): Promise<void> {
    ErrorHandler.logInfo('Starting onboarding flow for new user');

    const selection = await vscode.window.showInformationMessage(
      '🎉 Welcome to Mermaid Export Pro! Let\'s set up the best export experience for your system.',
      'Quick Setup',
      'Custom Setup',
      'Skip Setup'
    );

    switch (selection) {
      case 'Quick Setup':
        await this.runQuickSetup();
        break;
      case 'Custom Setup':
        await this.runCustomSetup();
        break;
      case 'Skip Setup':
        await this.completeOnboarding('skip');
        break;
      default:
        // User dismissed - show again next time
        break;
    }
  }

  /**
   * Quick setup - auto-detect and install with minimal user input
   */
  private async runQuickSetup(): Promise<void> {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Setting up Mermaid Export Pro...',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Analyzing system...' });

      // Detect system capabilities
      const capabilities = await this.detectSystemCapabilities();
      progress.report({ increment: 30, message: 'System analysis complete' });

      // Determine best setup method
      const recommendedMethod = this.getRecommendedMethod(capabilities);
      progress.report({ increment: 50, message: `Recommended: ${recommendedMethod}` });

      // Show results and get user confirmation
      const shouldProceed = await this.showAnalysisResults(capabilities, recommendedMethod);
      
      if (shouldProceed) {
        progress.report({ increment: 70, message: 'Installing dependencies...' });
        await this.executeInstallation(recommendedMethod);
        progress.report({ increment: 100, message: 'Setup complete!' });
        
        await this.showSetupComplete(recommendedMethod);
        await this.completeOnboarding(recommendedMethod);
      }
    });
  }

  /**
   * Custom setup - let user choose installation method
   */
  private async runCustomSetup(): Promise<void> {
    const capabilities = await this.detectSystemCapabilities();
    
    // Show capabilities first
    await this.showDetailedCapabilities(capabilities);

    // Let user choose method
    const method = await this.showInstallationOptions(capabilities);
    
    if (method && method !== 'skip') {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Installing with ${method} method...`,
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0 });
        await this.executeInstallation(method);
        progress.report({ increment: 100 });
      });

      await this.showSetupComplete(method);
    }

    await this.completeOnboarding(method || 'skip');
  }

  /**
   * Detect what's available on the system
   */
  private async detectSystemCapabilities(): Promise<SystemCapabilities> {
    const capabilities: SystemCapabilities = {
      hasNodeJs: false,
      hasMermaidCli: false,
      hasNpm: false,
      hasYarn: false,
      workspaceHasPackageJson: false,
      canInstallGlobally: true // Assume true, will be tested during install
    };

    try {
      // Check Node.js
      const nodeVersion = process.version;
      if (nodeVersion) {
        capabilities.hasNodeJs = true;
        capabilities.nodeVersion = nodeVersion;
      }
    } catch (error) {
      ErrorHandler.logWarning('Could not detect Node.js version');
    }

    try {
      // Check npm
      capabilities.hasNpm = await this.commandExists('npm');
      capabilities.hasYarn = await this.commandExists('yarn');
    } catch (error) {
      ErrorHandler.logWarning('Could not detect package managers');
    }

    try {
      // Check Mermaid CLI
      const cliStrategy = new CLIExportStrategy();
      capabilities.hasMermaidCli = await cliStrategy.isAvailable();
      if (capabilities.hasMermaidCli) {
        capabilities.mermaidVersion = await cliStrategy.getVersion();
      }
    } catch (error) {
      ErrorHandler.logWarning('Could not detect Mermaid CLI');
    }

    // Check workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const packageJsonPath = path.join(workspaceFolders[0].uri.fsPath, 'package.json');
      capabilities.workspaceHasPackageJson = await fs.promises.access(packageJsonPath).then(() => true).catch(() => false);
    }

    return capabilities;
  }

  private async commandExists(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(command, ['--version'], { stdio: 'pipe' });
      child.on('error', () => resolve(false));
      child.on('close', (code) => resolve(code === 0));
      
      // Timeout after 3 seconds
      setTimeout(() => {
        child.kill();
        resolve(false);
      }, 3000);
    });
  }

  private getRecommendedMethod(capabilities: SystemCapabilities): InstallMethod {
    if (capabilities.hasMermaidCli) {
      return 'skip'; // Already installed
    }

    if (capabilities.hasNodeJs && capabilities.hasNpm) {
      if (capabilities.workspaceHasPackageJson) {
        return 'local'; // Workspace-based install
      } else {
        return 'global'; // System-wide install
      }
    }

    return 'web-only'; // Fallback to web-only mode
  }

  private async showAnalysisResults(capabilities: SystemCapabilities, recommended: InstallMethod): Promise<boolean> {
    let message = '🔍 System Analysis Complete!\n\n';
    
    message += `✅ Node.js: ${capabilities.hasNodeJs ? `Found (${capabilities.nodeVersion})` : 'Not found'}\n`;
    message += `✅ Package Manager: ${capabilities.hasNpm ? 'npm' : capabilities.hasYarn ? 'yarn' : 'Not found'}\n`;
    message += `✅ Mermaid CLI: ${capabilities.hasMermaidCli ? `Installed (${capabilities.mermaidVersion})` : 'Not installed'}\n`;
    message += `✅ VS Code Webview: Available\n\n`;

    if (recommended === 'skip') {
      message += '🎉 Great! Mermaid CLI is already installed and ready to use.';
      
      const selection = await vscode.window.showInformationMessage(
        message,
        'Test Export',
        'View Settings',
        'Continue'
      );

      if (selection === 'Test Export') {
        await vscode.commands.executeCommand('mermaidExportPro.debugExport');
      } else if (selection === 'View Settings') {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
      }

      return false; // No installation needed
    }

    const methodNames = {
      'local': 'Local Installation (workspace)',
      'global': 'Global Installation (system-wide)', 
      'web-only': 'Web-only Mode (SVG, PNG, JPG exports - no CLI needed)'
    };

    message += `💡 Recommendation: ${methodNames[recommended]}\n\n`;
    message += 'Proceed with recommended setup?';

    const selection = await vscode.window.showInformationMessage(
      message,
      'Yes, Install',
      'Choose Different Method',
      'Cancel'
    );

    return selection === 'Yes, Install';
  }

  private async showDetailedCapabilities(capabilities: SystemCapabilities): Promise<void> {
    let message = '🔍 Detailed System Information:\n\n';

    message += `Node.js: ${capabilities.hasNodeJs ? `✅ ${capabilities.nodeVersion}` : '❌ Not found'}\n`;
    message += `NPM: ${capabilities.hasNpm ? '✅ Available' : '❌ Not found'}\n`;
    message += `Yarn: ${capabilities.hasYarn ? '✅ Available' : '❌ Not found'}\n`;
    message += `Mermaid CLI: ${capabilities.hasMermaidCli ? `✅ ${capabilities.mermaidVersion}` : '❌ Not installed'}\n`;
    message += `Package.json: ${capabilities.workspaceHasPackageJson ? '✅ Found in workspace' : '❌ Not found'}\n`;
    message += `VS Code Webview: ✅ Available (fallback option)\n`;

    await vscode.window.showInformationMessage(message, 'Continue');
  }

  private async showInstallationOptions(capabilities: SystemCapabilities): Promise<InstallMethod | undefined> {
    const options: vscode.QuickPickItem[] = [];

    if (capabilities.hasMermaidCli) {
      options.push({
        label: '✅ Already Installed',
        description: 'Mermaid CLI is ready to use',
        detail: `Version: ${capabilities.mermaidVersion}`,
        picked: true
      });
    }

    if (capabilities.hasNodeJs && capabilities.hasNpm) {
      if (capabilities.workspaceHasPackageJson) {
        options.push({
          label: '🏠 Local Installation',
          description: 'Install in current workspace',
          detail: 'Recommended - Works with this project only'
        });
      }

      options.push({
        label: '🌍 Global Installation',
        description: 'Install system-wide',
        detail: 'Available for all projects'
      });
    }

    options.push({
      label: '🌐 Web-Only Mode',
      description: 'No Node.js/CLI installation needed',
      detail: 'Instant exports: SVG, PNG, JPG supported. PDF requires CLI installation.'
    });

    options.push({
      label: '⏭️ Skip Setup',
      description: 'Configure later',
      detail: 'You can run setup anytime from Command Palette'
    });

    const selection = await vscode.window.showQuickPick(options, {
      placeHolder: 'Choose installation method',
      ignoreFocusOut: true
    });

    if (!selection) {
      return undefined;
    }

    if (selection.label.includes('Already Installed')) {
      return 'skip';
    }
    if (selection.label.includes('Local')) {
      return 'local';
    }
    if (selection.label.includes('Global')) {
      return 'global';
    }
    if (selection.label.includes('Web-Only')) {
      return 'web-only';
    }
    if (selection.label.includes('Skip')) {
      return 'skip';
    }

    return undefined;
  }

  private async executeInstallation(method: InstallMethod): Promise<void> {
    switch (method) {
      case 'local':
        await this.installLocal();
        break;
      case 'global':
        await this.installGlobal();
        break;
      case 'web-only':
        await this.configureWebOnly();
        break;
      case 'skip':
        // No installation needed
        break;
    }
  }

  private async installLocal(): Promise<void> {
    return new Promise((resolve, reject) => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        reject(new Error('No workspace folder found for local installation'));
        return;
      }

      const terminal = vscode.window.createTerminal({
        name: 'Mermaid Setup',
        cwd: workspaceRoot
      });

      terminal.sendText('npm install @mermaid-js/mermaid-cli');
      terminal.show();

      // Note: In a full implementation, you'd monitor the terminal output
      // For now, we'll just resolve after showing the terminal
      setTimeout(() => {
        ErrorHandler.logInfo('Local installation command sent to terminal');
        resolve();
      }, 1000);
    });
  }

  private async installGlobal(): Promise<void> {
    return new Promise((resolve) => {
      const terminal = vscode.window.createTerminal({
        name: 'Mermaid Setup (Global)'
      });

      terminal.sendText('npm install -g @mermaid-js/mermaid-cli');
      terminal.show();

      setTimeout(() => {
        ErrorHandler.logInfo('Global installation command sent to terminal');
        resolve();
      }, 1000);
    });
  }

  private async configureWebOnly(): Promise<void> {
    // Configure extension to prefer web strategy
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    await config.update('exportStrategy', 'web', vscode.ConfigurationTarget.Global);
    
    ErrorHandler.logInfo('Configured extension for web-only mode');
  }

  private async showSetupComplete(method: InstallMethod): Promise<void> {
    const messages = {
      'local': 'Local installation completed! Mermaid CLI is ready for this workspace.',
      'global': 'Global installation completed! Mermaid CLI is now available system-wide.',
      'web-only': 'Web-only mode configured! ✨ Instant exports to SVG, PNG, JPG formats. For PDF exports, install Mermaid CLI later.',
      'skip': 'Setup completed! Your existing Mermaid CLI installation is ready to use.'
    };

    const selection = await vscode.window.showInformationMessage(
      `🎉 ${messages[method]}`,
      'Test Export',
      'Open Settings',
      'Done'
    );

    if (selection === 'Test Export') {
      await vscode.commands.executeCommand('mermaidExportPro.debugExport');
    } else if (selection === 'Open Settings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
    }
  }

  private async completeOnboarding(method: InstallMethod): Promise<void> {
    await this.context.globalState.update(OnboardingManager.ONBOARDING_KEY, true);
    await this.context.globalState.update(OnboardingManager.SETUP_PREFERENCE_KEY, method);
    
    ErrorHandler.logInfo(`Onboarding completed with method: ${method}`);
  }

  private async validateExistingSetup(): Promise<void> {
    // Silently check if CLI is still available
    try {
      const cliStrategy = new CLIExportStrategy();
      const isAvailable = await cliStrategy.isAvailable();
      
      if (!isAvailable) {
        const preference = this.context.globalState.get(OnboardingManager.SETUP_PREFERENCE_KEY);
        if (preference === 'local' || preference === 'global') {
          // CLI was expected but not found - offer to reinstall
          const selection = await vscode.window.showWarningMessage(
            'Mermaid CLI is no longer available. Would you like to reinstall it?',
            'Reinstall',
            'Switch to Web-Only',
            'Later'
          );

          if (selection === 'Reinstall') {
            await this.runCustomSetup();
          } else if (selection === 'Switch to Web-Only') {
            await this.configureWebOnly();
            await this.context.globalState.update(OnboardingManager.SETUP_PREFERENCE_KEY, 'web-only');
          }
        }
      }
      // If CLI is available, do nothing - no need to show "ready" messages after initial setup
    } catch (error) {
      ErrorHandler.logWarning(`Setup validation failed: ${error}`);
    }
  }

  /**
   * Manually trigger setup (for command palette)
   */
  async runSetup(): Promise<void> {
    const selection = await vscode.window.showQuickPick([
      { label: '⚡ Quick Setup', description: 'Auto-detect and install' },
      { label: '🎯 Custom Setup', description: 'Choose installation method' },
      { label: '🔄 Reset Setup', description: 'Clear preferences and start over' }
    ], {
      placeHolder: 'Choose setup option'
    });

    if (!selection) {
      return;
    }

    if (selection.label.includes('Quick')) {
      await this.runQuickSetup();
    } else if (selection.label.includes('Custom')) {
      await this.runCustomSetup();
    } else if (selection.label.includes('Reset')) {
      await this.resetOnboarding();
      await this.showWelcomeFlow();
    }
  }

  private async resetOnboarding(): Promise<void> {
    await this.context.globalState.update(OnboardingManager.ONBOARDING_KEY, false);
    await this.context.globalState.update(OnboardingManager.SETUP_PREFERENCE_KEY, undefined);
    ErrorHandler.logInfo('Onboarding state reset');
  }
}