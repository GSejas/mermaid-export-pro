"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const configManager_1 = require("./services/configManager");
const errorHandler_1 = require("./ui/errorHandler");
const cliExportStrategy_1 = require("./strategies/cliExportStrategy");
const webExportStrategy_1 = require("./strategies/webExportStrategy");
const autoNaming_1 = require("./utils/autoNaming");
const debugCommand_1 = require("./commands/debugCommand");
const exportCommand_1 = require("./commands/exportCommand");
const exportAllCommand_1 = require("./commands/exportAllCommand");
const batchExportCommand_v2_1 = require("./commands/batchExportCommand.v2");
const watchCommand_1 = require("./commands/watchCommand");
const diagnosticsCommand_1 = require("./commands/diagnosticsCommand");
const onboardingManager_1 = require("./services/onboardingManager");
const statusBarManager_1 = require("./ui/statusBarManager");
const themeStatusBarManager_1 = require("./ui/themeStatusBarManager");
const batchExportStatusBarManager_1 = require("./ui/batchExportStatusBarManager");
const mermaidCodeLensProvider_1 = require("./providers/mermaidCodeLensProvider");
const mermaidHoverProvider_1 = require("./providers/mermaidHoverProvider");
const formatPreferenceManager_1 = require("./services/formatPreferenceManager");
const backgroundHealthMonitor_1 = require("./services/backgroundHealthMonitor");
// Extension state
let configManager;
let cliStrategy;
let onboardingManager;
let statusBarManager;
let themeStatusBarManager;
let formatPreferenceManager;
let backgroundHealthMonitor;
async function activate(context) {
    console.log('[mermaidExportPro] Activating extension...');
    try {
        // Initialize services
        errorHandler_1.ErrorHandler.initialize();
        configManager = new configManager_1.ConfigManager();
        cliStrategy = new cliExportStrategy_1.CLIExportStrategy();
        onboardingManager = new onboardingManager_1.OnboardingManager(context);
        statusBarManager = new statusBarManager_1.StatusBarManager(context, onboardingManager);
        themeStatusBarManager = new themeStatusBarManager_1.ThemeStatusBarManager(context);
        formatPreferenceManager = new formatPreferenceManager_1.FormatPreferenceManager(context);
        backgroundHealthMonitor = backgroundHealthMonitor_1.BackgroundHealthMonitor.getInstance(context);
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
        await (0, watchCommand_1.initializeAutoExport)(context);
        // Refresh status bar after onboarding
        await statusBarManager.refresh();
        // Start background health monitoring
        backgroundHealthMonitor.start();
        errorHandler_1.ErrorHandler.logInfo('Mermaid Export Pro extension activated successfully');
    }
    catch (error) {
        await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Unknown activation error'), 'Extension Activation');
    }
}
function registerCommands(context) {
    // Export current file command (with format selection)
    const exportCurrentCommand = vscode.commands.registerCommand('mermaidExportPro.exportCurrent', async (resource) => {
        try {
            await (0, exportCommand_1.runExportCommand)(context, false, resource);
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Export failed'), 'Export Current');
        }
    });
    // Export as command (alias for exportCurrent - same functionality)
    const exportAsCommand = vscode.commands.registerCommand('mermaidExportPro.exportAs', async (resource) => {
        try {
            await (0, exportCommand_1.runExportCommand)(context, true, resource);
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Export As failed'), 'Export As');
        }
    });
    // Export All Diagrams command
    const exportAllCommand = vscode.commands.registerCommand('mermaidExportPro.exportAll', async (documentUri) => {
        try {
            await (0, exportAllCommand_1.runExportAllCommand)(context, documentUri);
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Export all diagrams failed'), 'Export All');
        }
    });
    // Mermaid Export Pro - Export Folder command
    const batchExportCommand = vscode.commands.registerCommand('mermaidExportPro.batchExport', async (folderUri) => {
        try {
            await (0, batchExportCommand_v2_1.runBatchExport)(context, folderUri);
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Mermaid Export Pro - Export Folder failed'), 'Mermaid Export Pro - Export Folder');
        }
    });
    // Show output command
    const showOutputCommand = vscode.commands.registerCommand('mermaidExportPro.showOutput', () => {
        errorHandler_1.ErrorHandler.showOutput();
    });
    // Debug export command
    const debugExportCommand = vscode.commands.registerCommand('mermaidExportPro.debugExport', async () => {
        try {
            await (0, debugCommand_1.runDebugExport)(context);
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Debug export failed'), 'Debug Export');
        }
    });
    // Setup command
    const setupCommand = vscode.commands.registerCommand('mermaidExportPro.runSetup', async () => {
        try {
            await onboardingManager.runSetup();
            await statusBarManager.refresh();
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Setup failed'), 'Setup');
        }
    });
    // Cancel export folder command (called from status bar)
    const cancelBatchExportCommand = vscode.commands.registerCommand('mermaidExportPro.cancelBatchExport', () => {
        batchExportStatusBarManager_1.batchExportStatusBar.cancelBatchExport();
    });
    // Toggle auto-export command
    const toggleAutoExportCommand = vscode.commands.registerCommand('mermaidExportPro.toggleAutoExport', async () => {
        try {
            await (0, watchCommand_1.toggleAutoExport)(context);
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Toggle auto-export failed'), 'Auto Export');
        }
    });
    // Export markdown block command (for CodeLens and Hover)
    const exportMarkdownBlockCommand = vscode.commands.registerCommand('mermaidExportPro.exportMarkdownBlock', async (documentUri, range, format) => {
        try {
            await exportMarkdownBlock(documentUri, range, format, context);
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Markdown block export failed'), 'Markdown Export');
        }
    });
    // Status bar click command
    const statusBarClickCommand = vscode.commands.registerCommand('mermaidExportPro.statusBarClick', async () => {
        try {
            await statusBarManager.handleClick();
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Status bar action failed'), 'Status Bar');
        }
    });
    // Theme cycling command
    const cycleThemeCommand = vscode.commands.registerCommand('mermaidExportPro.cycleTheme', async () => {
        try {
            await themeStatusBarManager.cycleTheme();
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Theme cycle failed'), 'Theme Cycling');
        }
    });
    // Show export options command (for "More Options" CodeLens)
    const showExportOptionsCommand = vscode.commands.registerCommand('mermaidExportPro.showExportOptions', async (documentUri, range) => {
        try {
            await showExportOptionsModal(documentUri, range, context);
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Export options failed'), 'Export Options');
        }
    });
    // Export file from explorer/tab context
    const exportFileCommand = vscode.commands.registerCommand('mermaidExportPro.exportFile', async (resource) => {
        try {
            await exportFileUri(resource, context);
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Export file failed'), 'Export File');
        }
    });
    // Diagnostics command
    const diagnosticsCommand = vscode.commands.registerCommand('mermaidExportPro.diagnostics', async () => {
        try {
            await (0, diagnosticsCommand_1.runDiagnosticsCommand)();
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Diagnostics failed'), 'Diagnostics');
        }
    });
    // Quick health check command
    const healthCheckCommand = vscode.commands.registerCommand('mermaidExportPro.healthCheck', async () => {
        try {
            await (0, diagnosticsCommand_1.runQuickHealthCheck)();
        }
        catch (error) {
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Health check failed'), 'Health Check');
        }
    });
    // TEST-ONLY command: Export with explicit output path (bypasses all dialogs)
    // This command is ONLY for integration testing - not exposed in package.json
    // Usage: vscode.commands.executeCommand('mermaidExportPro._testExport', undefined, '/path/to/output.svg')
    const testExportCommand = vscode.commands.registerCommand('mermaidExportPro._testExport', async (resource, outputPath) => {
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
            await (0, exportCommand_1.runExportCommand)(context, false, resource, outputPath);
            console.log('[TEST COMMAND] runExportCommand completed');
        }
        catch (error) {
            console.log('[TEST COMMAND] Error:', error);
            await errorHandler_1.ErrorHandler.handleError(error instanceof Error ? error : new Error('Test export failed'), 'Test Export');
        }
    });
    // Register all commands
    context.subscriptions.push(exportCurrentCommand, exportAsCommand, exportAllCommand, batchExportCommand, showOutputCommand, debugExportCommand, setupCommand, cancelBatchExportCommand, toggleAutoExportCommand, exportMarkdownBlockCommand, statusBarClickCommand, cycleThemeCommand, showExportOptionsCommand, exportFileCommand, testExportCommand, // Add test command to subscriptions
    diagnosticsCommand, healthCheckCommand);
    // Listen for configuration changes
    const configChangeListener = configManager.onConfigurationChanged(async () => {
        errorHandler_1.ErrorHandler.logInfo('Configuration changed - reloading settings');
        await statusBarManager.onConfigurationChanged();
        themeStatusBarManager.onConfigurationChanged();
    });
    context.subscriptions.push(configChangeListener);
    // Register status bar managers for proper cleanup
    context.subscriptions.push(batchExportStatusBarManager_1.batchExportStatusBar);
}
function registerProviders(context) {
    // Register CodeLens and Hover providers for markdown and mermaid files
    const codeLensProvider = new mermaidCodeLensProvider_1.MermaidCodeLensProvider(context);
    const codeLensDisposable = vscode.languages.registerCodeLensProvider([{ language: 'markdown' }, { language: 'mermaid' }], codeLensProvider);
    // Register Hover provider for markdown and mermaid files
    const hoverProvider = new mermaidHoverProvider_1.MermaidHoverProvider(context);
    const hoverDisposable = vscode.languages.registerHoverProvider([{ language: 'markdown' }, { language: 'mermaid' }], hoverProvider);
    context.subscriptions.push(codeLensDisposable, hoverDisposable);
}
/**
 * Export a specific mermaid block from markdown file
 */
async function exportMarkdownBlock(documentUri, range, format, context) {
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
        await formatPreferenceManager.recordUsage(format, 'codelens');
        // Get export options
        const config = vscode.workspace.getConfiguration('mermaidExportPro');
        const exportOptions = {
            format: format,
            theme: config.get('theme') || 'default',
            width: config.get('width') || 800,
            height: config.get('height') || 600,
            backgroundColor: config.get('backgroundColor') || 'transparent'
        };
        // Get output path based on user preference
        // CodeLens-initiated export prefers auto-save next to the markdown file
        const outputPath = await getSmartOutputPath(document, mermaidContent, format, context, true);
        if (!outputPath) {
            return; // User cancelled
        }
        // Select strategy and export
        const cliStrategy = new cliExportStrategy_1.CLIExportStrategy();
        const webStrategy = new webExportStrategy_1.WebExportStrategy(context);
        const strategy = await cliStrategy.isAvailable() ? cliStrategy : webStrategy;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Exporting mermaid block to ${format.toUpperCase()}...`,
            cancellable: false
        }, async () => {
            const buffer = await strategy.export(mermaidContent, exportOptions);
            // Ensure directory exists for auto-save modes
            const outputDir = path.dirname(outputPath);
            await autoNaming_1.AutoNaming.ensureDirectory(outputDir);
            // Write file
            await fs.promises.writeFile(outputPath, buffer);
        });
        const fileName = path.basename(outputPath);
        vscode.window.showInformationMessage(`Mermaid diagram exported to ${fileName}`);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
// Old export functions removed - replaced by runExportCommand
/**
 * Show extended export options modal (triggered by "More Options" CodeLens)
 */
async function showExportOptionsModal(documentUri, range, context) {
    const onboardingKey = 'mermaidExportPro.firstMermaidFileOnboarding';
    const hasSeenOnboarding = context.globalState.get(onboardingKey, false);
    if (!hasSeenOnboarding) {
        // First-time user - show onboarding workflow
        await showFirstTimeExportOnboarding(documentUri, range, context);
    }
    else {
        // Experienced user - show format selection + settings
        await showAdvancedExportOptions(documentUri, range, context);
    }
}
/**
 * First-time export onboarding workflow
 */
async function showFirstTimeExportOnboarding(documentUri, range, context) {
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
    let savePreference;
    if (selection.label.includes('Choose Save Location')) {
        savePreference = 'dialog';
    }
    else if (selection.label.includes('Auto-save Next to File')) {
        savePreference = 'auto';
    }
    else {
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
        }
        else {
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
async function showAdvancedExportOptions(documentUri, range, context) {
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
    }
    else if (selection.label.includes('Change Export Folder')) {
        await changeExportFolder(context);
    }
    else if (selection.label.includes('Switch to Save Dialog')) {
        await context.workspaceState.update('mermaidExportPro.exportSavePreference', 'dialog');
        vscode.window.showInformationMessage('Export preference updated to save dialog');
    }
    else if (selection.label.includes('Extension Settings')) {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
    }
}
/**
 * Show format selection and export
 */
async function showFormatSelectionAndExport(documentUri, range, context) {
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
        await formatPreferenceManager.recordUsage(selectedFormat.value, 'codelens');
        // Export with selected format
        await exportMarkdownBlock(documentUri, range, selectedFormat.value, context);
    }
}
/**
 * Change export folder setting
 */
async function changeExportFolder(context) {
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
function getFormatDescription(format) {
    const descriptions = {
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
async function getSmartOutputPath(document, mermaidContent, format, context, preferAuto = false) {
    // If caller prefers auto (e.g., CodeLens), use auto as default when the user hasn't configured a preference
    const defaultPref = preferAuto ? 'auto' : 'dialog';
    const savePreference = context.workspaceState.get('mermaidExportPro.exportSavePreference', defaultPref);
    const baseName = autoNaming_1.AutoNaming.getBaseName(document.fileName);
    switch (savePreference) {
        case 'auto':
            // Auto-save next to file with smart naming
            const fileDirectory = path.dirname(document.fileName);
            return await autoNaming_1.AutoNaming.generateSmartName({
                baseName,
                format,
                content: mermaidContent,
                outputDirectory: fileDirectory
            });
        case 'folder':
            // Auto-save to specific folder
            const customFolder = context.workspaceState.get('mermaidExportPro.autoExportFolder');
            if (customFolder && typeof customFolder === 'string') {
                // Validate folder still exists
                const validation = await autoNaming_1.AutoNaming.validateDirectory(customFolder);
                if (!validation.valid) {
                    vscode.window.showWarningMessage(`Export folder invalid: ${validation.error}. Please reconfigure.`);
                    // Fall back to dialog
                    return await showSaveDialog(document, format);
                }
                return await autoNaming_1.AutoNaming.generateSmartName({
                    baseName,
                    format,
                    content: mermaidContent,
                    outputDirectory: customFolder
                });
            }
            else {
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
async function showSaveDialog(document, format) {
    const baseName = autoNaming_1.AutoNaming.getBaseName(document.fileName);
    const fileName = autoNaming_1.AutoNaming.generateDialogName(baseName, format);
    const defaultUri = vscode.Uri.file(path.join(path.dirname(document.fileName), fileName));
    const result = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { [`${format.toUpperCase()} files`]: [format] },
        title: `Save ${format.toUpperCase()} file`
    });
    return result?.fsPath || null;
}
function deactivate() {
    errorHandler_1.ErrorHandler.dispose();
    (0, watchCommand_1.disposeAutoExport)();
    console.log('Mermaid Export Pro extension deactivated');
}
/**
 * Export a file resource (from explorer or tab context). Prefers auto-save next to the file.
 */
async function exportFileUri(resource, context) {
    if (!resource) {
        vscode.window.showErrorMessage('No file selected for export');
        return;
    }
    // Use auto-save export command (preferAuto = true) to avoid save dialog
    await (0, exportCommand_1.runExportCommand)(context, true, resource);
}
//# sourceMappingURL=extension.js.map