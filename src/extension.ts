import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigManager } from './services/configManager';
import { ErrorHandler } from './ui/errorHandler';
import { CLIExportStrategy } from './strategies/cliExportStrategy';
import { WebExportStrategy } from './strategies/webExportStrategy';
import { PathUtils } from './utils/pathUtils';
import { ExportFormat } from './types';
import { runDebugExport } from './commands/debugCommand';
import { runExportCommand } from './commands/exportCommand';
import { runBatchExport } from './commands/batchExportCommand';
import { toggleAutoExport, initializeAutoExport, disposeAutoExport } from './commands/watchCommand';
import { OnboardingManager } from './services/onboardingManager';
import { StatusBarManager } from './ui/statusBarManager';
import { MermaidCodeLensProvider } from './providers/mermaidCodeLensProvider';
import { MermaidHoverProvider } from './providers/mermaidHoverProvider';

// Extension state
let configManager: ConfigManager;
let cliStrategy: CLIExportStrategy;
let onboardingManager: OnboardingManager;
let statusBarManager: StatusBarManager;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Activating Mermaid Export Pro extension...');

  try {
    // Initialize services
    ErrorHandler.initialize();
    configManager = new ConfigManager();
    cliStrategy = new CLIExportStrategy();
    onboardingManager = new OnboardingManager(context);
    statusBarManager = new StatusBarManager(context, onboardingManager);

    // Register commands
    registerCommands(context);

    // Register providers
    registerProviders(context);

    // Show onboarding for new users (this will also check CLI availability)
    await onboardingManager.maybeShowWelcome();
    
    // Initialize auto-export if previously enabled
    await initializeAutoExport(context);
    
    // Refresh status bar after onboarding
    await statusBarManager.refresh();

    ErrorHandler.logInfo('Mermaid Export Pro extension activated successfully');
    vscode.window.showInformationMessage('Mermaid Export Pro is ready!');

  } catch (error) {
    await ErrorHandler.handleError(error instanceof Error ? error : new Error('Unknown activation error'), 'Extension Activation');
  }
}

function registerCommands(context: vscode.ExtensionContext): void {
  // Export current file command (with format selection)
  const exportCurrentCommand = vscode.commands.registerCommand(
    'mermaidExportPro.exportCurrent',
    async () => {
      try {
        await runExportCommand(context);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Export failed'), 'Export Current');
      }
    }
  );

  // Export as command (alias for exportCurrent - same functionality)
  const exportAsCommand = vscode.commands.registerCommand(
    'mermaidExportPro.exportAs',
    async () => {
      try {
        await runExportCommand(context);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Export As failed'), 'Export As');
      }
    }
  );

  // Batch export command
  const batchExportCommand = vscode.commands.registerCommand(
    'mermaidExportPro.batchExport',
    async () => {
      try {
        await runBatchExport(context);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Batch export failed'), 'Batch Export');
      }
    }
  );

  // Show output command
  const showOutputCommand = vscode.commands.registerCommand(
    'mermaidExportPro.showOutput',
    () => {
      ErrorHandler.showOutput();
    }
  );

  // Debug export command
  const debugExportCommand = vscode.commands.registerCommand(
    'mermaidExportPro.debugExport',
    async () => {
      try {
        await runDebugExport(context);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Debug export failed'), 'Debug Export');
      }
    }
  );

  // Setup command
  const setupCommand = vscode.commands.registerCommand(
    'mermaidExportPro.runSetup',
    async () => {
      try {
        await onboardingManager.runSetup();
        await statusBarManager.refresh();
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Setup failed'), 'Setup');
      }
    }
  );

  // Toggle auto-export command
  const toggleAutoExportCommand = vscode.commands.registerCommand(
    'mermaidExportPro.toggleAutoExport',
    async () => {
      try {
        await toggleAutoExport(context);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Toggle auto-export failed'), 'Auto Export');
      }
    }
  );

  // Export markdown block command (for CodeLens and Hover)
  const exportMarkdownBlockCommand = vscode.commands.registerCommand(
    'mermaidExportPro.exportMarkdownBlock',
    async (documentUri: vscode.Uri, range: vscode.Range, format: string) => {
      try {
        await exportMarkdownBlock(documentUri, range, format, context);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Markdown block export failed'), 'Markdown Export');
      }
    }
  );

  // Export markdown diagrams command
  const exportMarkdownCommand = vscode.commands.registerCommand(
    'mermaidExportPro.exportMarkdown',
    async () => {
      try {
        // Use the main export command for now - it handles markdown files
        await runExportCommand(context);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Markdown export failed'), 'Markdown Export');
      }
    }
  );

  // Status bar click command
  const statusBarClickCommand = vscode.commands.registerCommand(
    'mermaidExportPro.statusBarClick',
    async () => {
      try {
        await statusBarManager.handleClick();
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Status bar action failed'), 'Status Bar');
      }
    }
  );

  // Register all commands
  context.subscriptions.push(
    exportCurrentCommand,
    exportAsCommand,
    batchExportCommand,
    showOutputCommand,
    debugExportCommand,
    setupCommand,
    toggleAutoExportCommand,
    exportMarkdownBlockCommand,
    exportMarkdownCommand,
    statusBarClickCommand
  );

  // Listen for configuration changes
  const configChangeListener = configManager.onConfigurationChanged(async () => {
    ErrorHandler.logInfo('Configuration changed - reloading settings');
    await statusBarManager.onConfigurationChanged();
  });

  context.subscriptions.push(configChangeListener);
}

function registerProviders(context: vscode.ExtensionContext): void {
  // Register CodeLens provider for markdown files
  const codeLensProvider = new MermaidCodeLensProvider(context);
  const codeLensDisposable = vscode.languages.registerCodeLensProvider(
    { language: 'markdown' },
    codeLensProvider
  );

  // Register Hover provider for markdown files  
  const hoverProvider = new MermaidHoverProvider(context);
  const hoverDisposable = vscode.languages.registerHoverProvider(
    { language: 'markdown' },
    hoverProvider
  );

  context.subscriptions.push(codeLensDisposable, hoverDisposable);
}

/**
 * Export a specific mermaid block from markdown file
 */
async function exportMarkdownBlock(documentUri: vscode.Uri, range: vscode.Range, format: string, context: vscode.ExtensionContext): Promise<void> {
  try {
    const document = await vscode.workspace.openTextDocument(documentUri);
    const blockText = document.getText(range);
    
    // Extract mermaid content from the block
    const lines = blockText.split('\n');
    const mermaidLines = lines.slice(1, -1); // Remove ```mermaid and ```
    const mermaidContent = mermaidLines.join('\n').trim();
    
    if (!mermaidContent) {
      vscode.window.showErrorMessage('No mermaid content found in the selected block');
      return;
    }

    // Get export options
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    const exportOptions = {
      format: format as any,
      theme: config.get('theme') || 'default',
      width: config.get('width') || 800,
      height: config.get('height') || 600,
      backgroundColor: config.get('backgroundColor') || 'white'
    } as any;

    // Get output path
    const fileName = path.basename(document.fileName, path.extname(document.fileName));
    const outputFileName = `${fileName}-diagram.${format}`;
    
    const defaultUri = vscode.Uri.file(path.join(path.dirname(document.fileName), outputFileName));
    const result = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { [`${format.toUpperCase()} files`]: [format] },
      title: `Save ${format.toUpperCase()} file`
    });

    if (!result) {
      return;
    }

    // Select strategy and export
    const cliStrategy = new CLIExportStrategy();
    const webStrategy = new WebExportStrategy(context);

    const strategy = await cliStrategy.isAvailable() ? cliStrategy : webStrategy;
    
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Exporting mermaid block to ${format.toUpperCase()}...`,
      cancellable: false
    }, async () => {
      const buffer = await strategy.export(mermaidContent, exportOptions);
      await vscode.workspace.fs.writeFile(result, buffer);
    });

    vscode.window.showInformationMessage(`Mermaid block exported to ${path.basename(result.fsPath)}`);
    
  } catch (error) {
    vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Old export functions removed - replaced by runExportCommand

export function deactivate() {
  ErrorHandler.dispose();
  disposeAutoExport();
  console.log('Mermaid Export Pro extension deactivated');
}
