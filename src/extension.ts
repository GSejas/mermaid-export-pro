import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigManager } from './services/configManager';
import { ErrorHandler } from './ui/errorHandler';
import { CLIExportStrategy } from './strategies/cliExportStrategy';
import { WebExportStrategy } from './strategies/webExportStrategy';
import { PathUtils } from './utils/pathUtils';
import { AutoNaming } from './utils/autoNaming';
import { ExportFormat, MermaidTheme, ExportOptions } from './types';
import { runDebugExport } from './commands/debugCommand';
import { runExportCommand } from './commands/exportCommand';
import { runQuickExportCommand } from './commands/quickExportCommand';
import { runExportAllCommand } from './commands/exportAllCommand';
import { runBatchExport } from './commands/batchExportCommand.v2';
import { toggleAutoExport, initializeAutoExport, disposeAutoExport } from './commands/watchCommand';
import { runDiagnosticsCommand, runQuickHealthCheck } from './commands/diagnosticsCommand';
import { OnboardingManager } from './services/onboardingManager';
import { StatusBarManager } from './ui/statusBarManager';
import { ThemeStatusBarManager } from './ui/themeStatusBarManager';
import { batchExportStatusBar } from './ui/batchExportStatusBarManager';
import { MermaidCodeLensProvider } from './providers/mermaidCodeLensProvider';
import { MermaidHoverProvider } from './providers/mermaidHoverProvider';
import { FormatPreferenceManager } from './services/formatPreferenceManager';
import { BackgroundHealthMonitor } from './services/backgroundHealthMonitor';
import { TelemetryService } from './services/telemetryService';

// Extension state
let configManager: ConfigManager;
let cliStrategy: CLIExportStrategy;
let onboardingManager: OnboardingManager;
let statusBarManager: StatusBarManager;
let themeStatusBarManager: ThemeStatusBarManager;
let formatPreferenceManager: FormatPreferenceManager;
let backgroundHealthMonitor: BackgroundHealthMonitor;
let telemetryService: TelemetryService;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[mermaidExportPro] Activating extension...');

  try {
    // Initialize services
    ErrorHandler.initialize();
    configManager = new ConfigManager();
    cliStrategy = new CLIExportStrategy();
    onboardingManager = new OnboardingManager(context);
    statusBarManager = new StatusBarManager(context, onboardingManager);
    themeStatusBarManager = new ThemeStatusBarManager(context);
    formatPreferenceManager = new FormatPreferenceManager(context);
    backgroundHealthMonitor = BackgroundHealthMonitor.getInstance(context);
    telemetryService = TelemetryService.getInstance(context);

  // Register commands
  console.log('[mermaidExportPro] registering commands');
  registerCommands(context);
  console.log('[mermaidExportPro] commands registered');

  // Register providers
  console.log('[mermaidExportPro] registering providers');
  registerProviders(context);
  console.log('[mermaidExportPro] providers registered');

    // Show onboarding for new users (this will also check CLI availability)
    await onboardingManager.maybeShowWelcome();
    
    // Initialize auto-export if previously enabled
    await initializeAutoExport(context);
    
    // Refresh status bar after onboarding
    await statusBarManager.refresh();

    // Start background health monitoring
    backgroundHealthMonitor.start();

    ErrorHandler.logInfo('Mermaid Export Pro extension activated successfully');

  } catch (error) {
    await ErrorHandler.handleError(error instanceof Error ? error : new Error('Unknown activation error'), 'Extension Activation');
  }
}

function registerCommands(context: vscode.ExtensionContext): void {
  // Export current file command (with format selection)
  const exportCurrentCommand = vscode.commands.registerCommand(
    'mermaidExportPro.exportCurrent',
    async (resource?: vscode.Uri) => {
      try {
        await runExportCommand(context, false, resource, undefined, telemetryService);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Export failed'), 'Export Current');
      }
    }
  );

  // Export as command (alias for exportCurrent - same functionality)
  // Export As command - Shows format picker + save dialog
  const exportAsCommand = vscode.commands.registerCommand(
    'mermaidExportPro.exportAs',
    async (resource?: vscode.Uri) => {
      try {
        await runExportCommand(context, false, resource, undefined, telemetryService); // preferAuto=false → shows dialogs
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Export As failed'), 'Export As');
      }
    }
  );

  // Export All Diagrams command
  const exportAllCommand = vscode.commands.registerCommand(
    'mermaidExportPro.exportAll',
    async (documentUri?: vscode.Uri) => {
      try {
        await runExportAllCommand(context, documentUri);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Export all diagrams failed'), 'Export All');
      }
    }
  );

  // Mermaid Export Pro - Export Folder command
  const batchExportCommand = vscode.commands.registerCommand(
    'mermaidExportPro.batchExport',
    async (folderUri?: vscode.Uri) => {
      try {
        await runBatchExport(context, folderUri);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Mermaid Export Pro - Export Folder failed'), 'Mermaid Export Pro - Export Folder');
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

  // Cancel export folder command (called from status bar)
  const cancelBatchExportCommand = vscode.commands.registerCommand(
    'mermaidExportPro.cancelBatchExport',
    () => {
      batchExportStatusBar.cancelBatchExport();
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

  // Theme cycling command
  const cycleThemeCommand = vscode.commands.registerCommand(
    'mermaidExportPro.cycleTheme',
    async () => {
      try {
        await themeStatusBarManager.cycleTheme();
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Theme cycle failed'), 'Theme Cycling');
      }
    }
  );

  // Show export options command (for "More Options" CodeLens)
  const showExportOptionsCommand = vscode.commands.registerCommand(
    'mermaidExportPro.showExportOptions',
    async (documentUri: vscode.Uri, range: vscode.Range) => {
      try {
        await showExportOptionsModal(documentUri, range, context);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Export options failed'), 'Export Options');
      }
    }
  );

  // Quick Export (formerly Export file) - Zero dialogs, exports all diagrams with defaults
  const exportFileCommand = vscode.commands.registerCommand(
    'mermaidExportPro.exportFile',
    async (resource: vscode.Uri) => {
      try {
        await runQuickExportCommand(context, resource, telemetryService);
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Quick Export failed'), 'Quick Export');
      }
    }
  );

  // Diagnostics command
  const diagnosticsCommand = vscode.commands.registerCommand(
    'mermaidExportPro.diagnostics',
    async () => {
      try {
        await runDiagnosticsCommand();
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Diagnostics failed'), 'Diagnostics');
      }
    }
  );

  // Quick health check command
  const healthCheckCommand = vscode.commands.registerCommand(
    'mermaidExportPro.healthCheck',
    async () => {
      try {
        await runQuickHealthCheck();
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Health check failed'), 'Health Check');
      }
    }
  );

  // TEST-ONLY command: Export with explicit output path (bypasses all dialogs)
  // This command is ONLY for integration testing - not exposed in package.json
  // Usage: vscode.commands.executeCommand('mermaidExportPro._testExport', undefined, '/path/to/output.svg')
  const testExportCommand = vscode.commands.registerCommand(
    'mermaidExportPro._testExport',
    async (resource: vscode.Uri | undefined, outputPath: string) => {
      try {
        console.log('[TEST COMMAND] _testExport called');
        console.log('[TEST COMMAND] resource:', resource);
        console.log('[TEST COMMAND] outputPath:', outputPath);
        console.log('[TEST COMMAND] outputPath type:', typeof outputPath);
        console.log('[TEST COMMAND] outputPath is truthy:', !!outputPath);
        
        if (!outputPath || typeof outputPath !== 'string') {
          throw new Error('_testExport requires explicit outputPath parameter');
        }
        
        console.log('[TEST COMMAND] Calling runExportCommand with testOutputPath:', outputPath);
        await runExportCommand(context, false, resource, outputPath, telemetryService);
        console.log('[TEST COMMAND] runExportCommand completed');
      } catch (error) {
        console.log('[TEST COMMAND] Error:', error);
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Test export failed'), 'Test Export');
      }
    }
  );

  // Show telemetry summary command
  const showTelemetryCommand = vscode.commands.registerCommand(
    'mermaidExportPro.showTelemetry',
    async () => {
      try {
        await telemetryService.showSummary();
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Show telemetry failed'), 'Telemetry');
      }
    }
  );

  // Export telemetry data command
  const exportTelemetryCommand = vscode.commands.registerCommand(
    'mermaidExportPro.exportTelemetry',
    async () => {
      try {
        const exportPath = await telemetryService.exportData();
        const choice = await vscode.window.showInformationMessage(
          `Usage data exported to: ${exportPath}`,
          'Open File',
          'Open Folder',
          'Copy Path'
        );
        
        if (choice === 'Open File') {
          const doc = await vscode.workspace.openTextDocument(exportPath);
          await vscode.window.showTextDocument(doc);
        } else if (choice === 'Open Folder') {
          await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(exportPath));
        } else if (choice === 'Copy Path') {
          await vscode.env.clipboard.writeText(exportPath);
          vscode.window.showInformationMessage('Path copied to clipboard!');
        }
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Export telemetry failed'), 'Telemetry');
      }
    }
  );

  // Clear telemetry data command
  const clearTelemetryCommand = vscode.commands.registerCommand(
    'mermaidExportPro.clearTelemetry',
    async () => {
      try {
        const choice = await vscode.window.showWarningMessage(
          'Are you sure you want to clear all usage data?',
          { modal: true },
          'Clear Data'
        );
        
        if (choice === 'Clear Data') {
          await telemetryService.clearData();
        }
      } catch (error) {
        await ErrorHandler.handleError(error instanceof Error ? error : new Error('Clear telemetry failed'), 'Telemetry');
      }
    }
  );

  // Register all commands
  context.subscriptions.push(
    exportCurrentCommand,
    exportAsCommand,
    exportAllCommand,
    batchExportCommand,
    showOutputCommand,
    debugExportCommand,
    setupCommand,
    cancelBatchExportCommand,
    toggleAutoExportCommand,
    exportMarkdownBlockCommand,
    statusBarClickCommand,
    cycleThemeCommand,
    showExportOptionsCommand,
    exportFileCommand,
    testExportCommand, // Add test command to subscriptions
    diagnosticsCommand,
    healthCheckCommand,
    showTelemetryCommand,
    exportTelemetryCommand,
    clearTelemetryCommand
  );

  // Listen for configuration changes
  const configChangeListener = configManager.onConfigurationChanged(async () => {
    ErrorHandler.logInfo('Configuration changed - reloading settings');
    await statusBarManager.onConfigurationChanged();
    themeStatusBarManager.onConfigurationChanged();
  });

  context.subscriptions.push(configChangeListener);
  
  // Register status bar managers for proper cleanup
  context.subscriptions.push(batchExportStatusBar);
}

function registerProviders(context: vscode.ExtensionContext): void {
  // Register CodeLens and Hover providers for markdown and mermaid files
  const codeLensProvider = new MermaidCodeLensProvider(context);
  const codeLensDisposable = vscode.languages.registerCodeLensProvider(
    [{ language: 'markdown' }, { language: 'mermaid' }],
    codeLensProvider
  );

  // Register Hover provider for markdown and mermaid files
  const hoverProvider = new MermaidHoverProvider(context);
  const hoverDisposable = vscode.languages.registerHoverProvider(
    [{ language: 'markdown' }, { language: 'mermaid' }],
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

    // Record format usage for adaptive learning
    await formatPreferenceManager.recordUsage(format as ExportFormat, 'codelens');

    // Get export options
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    const exportOptions: ExportOptions = {
      format: format as ExportFormat,
      theme: (config.get('theme') as MermaidTheme) || 'default',
      width: (config.get('width') as number) || 800,
      height: (config.get('height') as number) || 600,
      backgroundColor: (config.get('backgroundColor') as string) || 'transparent'
    };

  // CodeLens export: ALWAYS auto-name files, never show dialogs (forceAuto=true)
  const outputPath = await getSmartOutputPath(document, mermaidContent, format as ExportFormat, context, true, true);
    
    if (!outputPath) {
      return; // User cancelled
    }

    // Check if we should skip export (content-aware check)
    const shouldSkip = await AutoNaming.shouldSkipExport(outputPath, mermaidContent);

    // Select strategy and export
    const cliStrategy = new CLIExportStrategy();
    const webStrategy = new WebExportStrategy(context);

    const strategy = await cliStrategy.isAvailable() ? cliStrategy : webStrategy;
    
    if (shouldSkip) {
      // File with same content already exists - skip export, show message
      const fileName = path.basename(outputPath);
      vscode.window.showInformationMessage(`✓ Using existing export: ${fileName} (same content)`);
    } else {
      // Export new or updated diagram
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Exporting mermaid block to ${format.toUpperCase()}...`,
        cancellable: false
      }, async () => {
        const buffer = await strategy.export(mermaidContent, exportOptions);
        
        // Ensure directory exists for auto-save modes
        const outputDir = path.dirname(outputPath);
        await AutoNaming.ensureDirectory(outputDir);
        
        // Write file
        await fs.promises.writeFile(outputPath, buffer);
      });

      const fileName = path.basename(outputPath);
      vscode.window.showInformationMessage(`Mermaid diagram exported to ${fileName}`);
    }
    
  } catch (error) {
    vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Old export functions removed - replaced by runExportCommand

/**
 * Show extended export options modal (triggered by "More Options" CodeLens)
 */
async function showExportOptionsModal(documentUri: vscode.Uri, range: vscode.Range, context: vscode.ExtensionContext): Promise<void> {
  const onboardingKey = 'mermaidExportPro.firstMermaidFileOnboarding';
  const hasSeenOnboarding = context.globalState.get(onboardingKey, false);

  if (!hasSeenOnboarding) {
    // First-time user - show onboarding workflow
    await showFirstTimeExportOnboarding(documentUri, range, context);
  } else {
    // Experienced user - show format selection + settings
    await showAdvancedExportOptions(documentUri, range, context);
  }
}

/**
 * First-time export onboarding workflow
 */
async function showFirstTimeExportOnboarding(documentUri: vscode.Uri, range: vscode.Range, context: vscode.ExtensionContext): Promise<void> {
  const selection = await vscode.window.showQuickPick([
    {
      label: '💾 Choose Save Location',
      description: 'Open save dialog for each export',
      detail: 'Full control over where files are saved'
    },
    {
      label: '⚡ Auto-save Next to File', 
      description: 'Smart naming with sequence and hash',
      detail: 'Saves automatically: diagram-01-a4b2c8ef.svg'
    },
    {
      label: '📁 Auto-save to Specific Folder',
      description: 'Set once, use forever',
      detail: 'Configure a dedicated export folder'
    }
  ], {
    placeHolder: '🌊 Welcome to Mermaid Export Pro! How would you like to save exports?',
    ignoreFocusOut: true
  });

  if (!selection) {
    return;
  }

  // Mark onboarding as completed
  await context.globalState.update('mermaidExportPro.firstMermaidFileOnboarding', true);

  let savePreference: string;
  
  if (selection.label.includes('Choose Save Location')) {
    savePreference = 'dialog';
  } else if (selection.label.includes('Auto-save Next to File')) {
    savePreference = 'auto';
  } else {
    savePreference = 'folder';
    // Show folder selection
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      title: 'Select Export Folder'
    });
    
    if (folderUri && folderUri[0]) {
      await context.workspaceState.update('mermaidExportPro.autoExportFolder', folderUri[0].fsPath);
    } else {
      // Fallback to auto if user cancels folder selection
      savePreference = 'auto';
    }
  }

  await context.workspaceState.update('mermaidExportPro.exportSavePreference', savePreference);

  // Show success message and proceed with export
  vscode.window.showInformationMessage('🎉 Setup complete! Your export preferences have been saved.');
  
  // Trigger format selection for immediate export
  await showFormatSelectionAndExport(documentUri, range, context);
}

/**
 * Advanced export options for experienced users
 */
async function showAdvancedExportOptions(documentUri: vscode.Uri, range: vscode.Range, context: vscode.ExtensionContext): Promise<void> {
  const selection = await vscode.window.showQuickPick([
    {
      label: '🎨 All Export Formats',
      description: 'Choose from SVG, PNG, JPG, PDF, WebP',
      detail: 'Export this diagram in any format'
    },
    {
      label: '📁 Change Export Folder',
      description: 'Update auto-save folder location', 
      detail: 'Configure where auto-exports are saved'
    },
    {
      label: '💾 Switch to Save Dialog',
      description: 'Choose location for each export',
      detail: 'Change from auto-save to manual selection'
    },
    {
      label: '⚙️ Extension Settings',
      description: 'Open full settings panel',
      detail: 'Configure themes, sizes, and advanced options'
    }
  ], {
    placeHolder: 'Export Options',
    ignoreFocusOut: true
  });

  if (!selection) {
    return;
  }

  if (selection.label.includes('All Export Formats')) {
    await showFormatSelectionAndExport(documentUri, range, context);
  } else if (selection.label.includes('Change Export Folder')) {
    await changeExportFolder(context);
  } else if (selection.label.includes('Switch to Save Dialog')) {
    await context.workspaceState.update('mermaidExportPro.exportSavePreference', 'dialog');
    vscode.window.showInformationMessage('Export preference updated to save dialog');
  } else if (selection.label.includes('Extension Settings')) {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
  }
}

/**
 * Show format selection and export
 */
async function showFormatSelectionAndExport(documentUri: vscode.Uri, range: vscode.Range, context: vscode.ExtensionContext): Promise<void> {
  const formats = await formatPreferenceManager.getPreferredFormats();
  
  const formatOptions = formats.map(format => ({
    label: format.toUpperCase(),
    description: getFormatDescription(format),
    value: format
  }));

  const selectedFormat = await vscode.window.showQuickPick(formatOptions, {
    placeHolder: 'Select export format',
    ignoreFocusOut: true
  });

  if (selectedFormat) {
    // Record usage for learning
    await formatPreferenceManager.recordUsage(selectedFormat.value as ExportFormat, 'codelens');
    
    // Export with selected format
    await exportMarkdownBlock(documentUri, range, selectedFormat.value, context);
  }
}

/**
 * Change export folder setting
 */
async function changeExportFolder(context: vscode.ExtensionContext): Promise<void> {
  const folderUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: 'Select New Export Folder'
  });
  
  if (folderUri && folderUri[0]) {
    await context.workspaceState.update('mermaidExportPro.autoExportFolder', folderUri[0].fsPath);
    await context.workspaceState.update('mermaidExportPro.exportSavePreference', 'folder');
    vscode.window.showInformationMessage(`Export folder updated: ${folderUri[0].fsPath}`);
  }
}

/**
 * Get user-friendly format descriptions
 */
function getFormatDescription(format: ExportFormat): string {
  const descriptions: Record<ExportFormat, string> = {
    svg: 'Vector graphics - best quality, scalable',
    png: 'Raster image - universal compatibility',
    jpg: 'Compressed image - smaller file size',
    jpeg: 'Compressed image - smaller file size',
    pdf: 'Document format - perfect for printing',
    webp: 'Modern web format - excellent compression'
  };
  return descriptions[format] || 'Image format';
}

/**
 * Get smart output path based on user preferences
 */
async function getSmartOutputPath(document: vscode.TextDocument, mermaidContent: string, format: ExportFormat, context: vscode.ExtensionContext, preferAuto = false, forceAuto = false): Promise<string | null> {
  // If forceAuto is true (e.g., from CodeLens), always auto-name regardless of user preferences
  if (forceAuto) {
    const baseName = AutoNaming.getBaseName(document.fileName);
    const configManager = new ConfigManager();
    const namingMode = configManager.getAutoNamingMode();
    const fileDirectory = path.dirname(document.fileName);
    
    return await AutoNaming.generateFileName({
      baseName,
      format,
      content: mermaidContent,
      outputDirectory: fileDirectory,
      mode: namingMode
    });
  }
  
  // If caller prefers auto (e.g., CodeLens), use auto as default when the user hasn't configured a preference
  const defaultPref: 'dialog' | 'auto' | 'folder' = preferAuto ? 'auto' : 'dialog';
  const savePreference = context.workspaceState.get<'dialog' | 'auto' | 'folder'>('mermaidExportPro.exportSavePreference', defaultPref);
  const baseName = AutoNaming.getBaseName(document.fileName);
  const configManager = new ConfigManager();
  const namingMode = configManager.getAutoNamingMode();

  switch (savePreference) {
    case 'auto':
      // Auto-save next to file with configured naming mode
      const fileDirectory = path.dirname(document.fileName);
      return await AutoNaming.generateFileName({
        baseName,
        format,
        content: mermaidContent,
        outputDirectory: fileDirectory,
        mode: namingMode
      });

    case 'folder':
      // Auto-save to specific folder
      const customFolder = context.workspaceState.get('mermaidExportPro.autoExportFolder');
      if (customFolder && typeof customFolder === 'string') {
        // Validate folder still exists
        const validation = await AutoNaming.validateDirectory(customFolder);
        if (!validation.valid) {
          vscode.window.showWarningMessage(`Export folder invalid: ${validation.error}. Please reconfigure.`);
          // Fall back to dialog
          return await showSaveDialog(document, format);
        }

        return await AutoNaming.generateFileName({
          baseName,
          format,
          content: mermaidContent,
          outputDirectory: customFolder,
          mode: namingMode
        });
      } else {
        // No folder configured, show dialog
        return await showSaveDialog(document, format);
      }

    case 'dialog':
    default:
      // Traditional save dialog
      return await showSaveDialog(document, format);
  }
}

/**
 * Show traditional save dialog
 */
async function showSaveDialog(document: vscode.TextDocument, format: ExportFormat): Promise<string | null> {
  const baseName = AutoNaming.getBaseName(document.fileName);
  const fileName = AutoNaming.generateDialogName(baseName, format);
  
  const defaultUri = vscode.Uri.file(path.join(path.dirname(document.fileName), fileName));
  const result = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { [`${format.toUpperCase()} files`]: [format] },
    title: `Save ${format.toUpperCase()} file`
  });

  return result?.fsPath || null;
}

export function deactivate() {
  console.log('[mermaidExportPro] Deactivating extension...');
  
  ErrorHandler.dispose();
  disposeAutoExport();
  
  // Save telemetry data before shutdown
  if (telemetryService) {
    telemetryService.dispose();
  }
  
  console.log('[mermaidExportPro] Extension deactivated');
}

/**
 * Export a file resource (from explorer or tab context). Prefers auto-save next to the file.
 */
async function exportFileUri(resource: vscode.Uri | undefined, context: vscode.ExtensionContext): Promise<void> {
  if (!resource) {
    vscode.window.showErrorMessage('No file selected for export');
    return;
  }

  // Use auto-save export command (preferAuto = true) to avoid save dialog
  await runExportCommand(context, true, resource);
}
