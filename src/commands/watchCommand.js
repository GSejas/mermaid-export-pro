"use strict";
/**
 * Auto Export Watch Command - Smart auto-export on file save
 *
 * Purpose: Automatically export all mermaid diagrams when files are saved
 * Features:
 * - Watches .mmd, .md, and .markdown files
 * - Exports ALL diagrams in a file (with numbered suffixes for multiple)
 * - Uses smart format preferences (file-specific > most-used > default)
 * - Always uses current theme setting
 * - Configurable output directory
 * - Toggle on/off with workspace persistence
 *
 * Architecture:
 * - Singleton AutoExportWatcher class manages file watching
 * - Integrates with FormatPreferenceManager for smart format selection
 * - Uses best available export strategy (CLI > Web)
 * - Provides subtle progress feedback and success notifications
 *
 * Author: Claude/Jorge
 * Version: 1.0.4
 * Date: 2025-08-27
 */
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
exports.toggleAutoExport = toggleAutoExport;
exports.initializeAutoExport = initializeAutoExport;
exports.isAutoExportEnabled = isAutoExportEnabled;
exports.disposeAutoExport = disposeAutoExport;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const cliExportStrategy_1 = require("../strategies/cliExportStrategy");
const webExportStrategy_1 = require("../strategies/webExportStrategy");
const errorHandler_1 = require("../ui/errorHandler");
const formatPreferenceManager_1 = require("../services/formatPreferenceManager");
/**
 * Auto Export Watcher - Singleton class for managing automatic export on save
 *
 * Responsibilities:
 * - File system watching for mermaid-related file changes
 * - Smart format preference management
 * - Multi-diagram export coordination
 * - Progress and success feedback
 * - Workspace configuration persistence
 */
class AutoExportWatcher {
    static instance;
    fileWatcher = null;
    isEnabled = false;
    context;
    constructor(context) {
        this.context = context;
        // Initialize state based on configuration setting
        const config = vscode.workspace.getConfiguration('mermaidExportPro');
        const configEnabled = config.get('autoExport', false);
        console.log(`[AutoExport] Initializing watcher - Config setting: ${configEnabled}`);
        if (configEnabled) {
            // If config says enabled, set up the file watcher
            this.isEnabled = true;
            this.setupFileWatcher();
            console.log(`[AutoExport] Watcher initialized and enabled`);
        }
        else {
            this.isEnabled = false;
            console.log(`[AutoExport] Watcher initialized but disabled`);
        }
    }
    static getInstance(context) {
        if (!AutoExportWatcher.instance) {
            AutoExportWatcher.instance = new AutoExportWatcher(context);
        }
        return AutoExportWatcher.instance;
    }
    setupFileWatcher() {
        if (this.fileWatcher) {
            return; // Already set up
        }
        this.fileWatcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
            await this.handleFileSave(document);
        });
    }
    async toggle() {
        if (this.isEnabled) {
            await this.disable();
        }
        else {
            await this.enable();
        }
    }
    async enable() {
        if (this.isEnabled) {
            console.log(`[AutoExport] Enable called but already enabled`);
            return;
        }
        try {
            console.log(`[AutoExport] Enabling auto export...`);
            // Get configuration
            const config = vscode.workspace.getConfiguration('mermaidExportPro');
            // Set up file watcher
            this.setupFileWatcher();
            this.isEnabled = true;
            // Update configuration
            await config.update('autoExport', true, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage('Auto-export enabled! Mermaid files will be exported automatically on save.', 'Configure Settings').then(action => {
                if (action === 'Configure Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
                }
            });
            errorHandler_1.ErrorHandler.logInfo('Auto-export watcher enabled');
        }
        catch (error) {
            errorHandler_1.ErrorHandler.logError(`Failed to enable auto-export: ${error}`);
            vscode.window.showErrorMessage(`Failed to enable auto-export: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async disable() {
        if (!this.isEnabled) {
            console.log(`[AutoExport] Disable called but already disabled`);
            return;
        }
        try {
            console.log(`[AutoExport] Disabling auto export...`);
            // Clean up file watcher
            if (this.fileWatcher) {
                this.fileWatcher.dispose();
                this.fileWatcher = null;
            }
            this.isEnabled = false;
            // Update configuration
            const config = vscode.workspace.getConfiguration('mermaidExportPro');
            await config.update('autoExport', false, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage('Auto-export disabled');
            errorHandler_1.ErrorHandler.logInfo('Auto-export watcher disabled');
        }
        catch (error) {
            errorHandler_1.ErrorHandler.logError(`Failed to disable auto-export: ${error}`);
            vscode.window.showErrorMessage(`Failed to disable auto-export: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async handleFileSave(document) {
        try {
            const fileName = document.fileName.toLowerCase();
            // Only process mermaid and markdown files
            if (!fileName.endsWith('.mmd') && !fileName.endsWith('.md') && !fileName.endsWith('.markdown')) {
                return;
            }
            // Extract mermaid content
            const content = document.getText();
            const mermaidContent = await this.extractMermaidContent(document);
            if (!mermaidContent || mermaidContent.length === 0) {
                return;
            }
            errorHandler_1.ErrorHandler.logInfo(`Auto-export triggered for ${path.basename(document.fileName)}`);
            // Get export options with smart format selection
            const config = vscode.workspace.getConfiguration('mermaidExportPro');
            const formatPreferenceManager = new formatPreferenceManager_1.FormatPreferenceManager(this.context);
            // Try to use last format for this file, then most used format, then default
            let format;
            const fileFormatPreference = await formatPreferenceManager.getFileFormatPreference(document.fileName);
            if (fileFormatPreference) {
                format = fileFormatPreference;
                errorHandler_1.ErrorHandler.logInfo(`Using last used format for this file: ${format}`);
            }
            else {
                format = await formatPreferenceManager.getMostUsedFormat();
                errorHandler_1.ErrorHandler.logInfo(`Using most used format: ${format}`);
            }
            const exportOptions = {
                format,
                theme: config.get('theme') || 'default', // Always use current theme
                width: config.get('width') || 800,
                height: config.get('height') || 600,
                backgroundColor: config.get('backgroundColor') || 'transparent'
            };
            // Select strategy and export
            const strategy = await this.selectBestStrategy();
            // Show brief progress indication
            const exportedPaths = [];
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                title: `Auto-exporting ${mermaidContent.length} diagram${mermaidContent.length > 1 ? 's' : ''} from ${path.basename(document.fileName)}...`,
                cancellable: false
            }, async () => {
                // Export each diagram with numbered suffix if multiple
                for (let i = 0; i < mermaidContent.length; i++) {
                    const content = mermaidContent[i];
                    // Generate unique output path for each diagram
                    const outputDirectory = config.get('outputDirectory') || '';
                    const outputPath = await this.generateOutputPath(document.fileName, exportOptions.format, outputDirectory, mermaidContent.length > 1 ? i + 1 : undefined);
                    const buffer = await strategy.export(content, exportOptions);
                    await vscode.workspace.fs.writeFile(vscode.Uri.file(outputPath), buffer);
                    exportedPaths.push(outputPath);
                }
            });
            // Show subtle success notification
            const message = mermaidContent.length === 1
                ? `✅ Exported ${path.basename(exportedPaths[0])}`
                : `✅ Exported ${mermaidContent.length} diagrams`;
            vscode.window.setStatusBarMessage(message, 3000);
            errorHandler_1.ErrorHandler.logInfo(`Auto-export completed: ${exportedPaths.join(', ')}`);
        }
        catch (error) {
            errorHandler_1.ErrorHandler.logError(`Auto-export failed: ${error}`);
            vscode.window.showWarningMessage(`Auto-export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async extractMermaidContent(document) {
        const fileName = document.fileName.toLowerCase();
        const content = document.getText();
        if (fileName.endsWith('.mmd')) {
            // Pure mermaid file
            return [content.trim()];
        }
        // Extract from markdown
        const mermaidBlocks = [];
        const lines = content.split('\n');
        let inMermaidBlock = false;
        let mermaidContent = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '```mermaid') {
                inMermaidBlock = true;
                mermaidContent = [];
            }
            else if (line === '```' && inMermaidBlock) {
                inMermaidBlock = false;
                const diagramContent = mermaidContent.join('\n').trim();
                if (diagramContent) {
                    mermaidBlocks.push(diagramContent);
                }
            }
            else if (inMermaidBlock) {
                mermaidContent.push(lines[i]);
            }
        }
        return mermaidBlocks;
    }
    async generateOutputPath(inputPath, format, outputDirectory, diagramNumber) {
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const outputFileName = diagramNumber
            ? `${fileName}-${diagramNumber}.${format}`
            : `${fileName}.${format}`;
        if (outputDirectory) {
            // Use configured output directory
            if (path.isAbsolute(outputDirectory)) {
                return path.join(outputDirectory, outputFileName);
            }
            else {
                // Relative to input file directory
                const inputDir = path.dirname(inputPath);
                return path.join(inputDir, outputDirectory, outputFileName);
            }
        }
        else {
            // Same directory as input file
            const inputDir = path.dirname(inputPath);
            return path.join(inputDir, outputFileName);
        }
    }
    async selectBestStrategy() {
        const cliStrategy = new cliExportStrategy_1.CLIExportStrategy();
        const webStrategy = new webExportStrategy_1.WebExportStrategy(this.context);
        if (await cliStrategy.isAvailable()) {
            return cliStrategy;
        }
        if (await webStrategy.isAvailable()) {
            return webStrategy;
        }
        throw new Error('No export strategy available');
    }
    isAutoExportEnabled() {
        const config = vscode.workspace.getConfiguration('mermaidExportPro');
        const configEnabled = config.get('autoExport', false);
        console.log(`[AutoExport] State check - Watcher: ${this.isEnabled}, Config: ${configEnabled}, FileWatcher: ${!!this.fileWatcher}`);
        // If states are out of sync, log a warning
        if (this.isEnabled !== configEnabled) {
            console.warn(`[AutoExport] State mismatch! Watcher: ${this.isEnabled}, Config: ${configEnabled}`);
        }
        return this.isEnabled;
    }
    dispose() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
    }
}
async function toggleAutoExport(context) {
    const watcher = AutoExportWatcher.getInstance(context);
    await watcher.toggle();
}
async function initializeAutoExport(context) {
    // Check if auto-export was previously enabled
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    const isAutoExportEnabled = config.get('autoExport', false);
    if (isAutoExportEnabled) {
        const watcher = AutoExportWatcher.getInstance(context);
        await watcher.toggle(); // This will enable it
    }
}
function isAutoExportEnabled(context) {
    const watcher = AutoExportWatcher.getInstance(context);
    return watcher.isAutoExportEnabled();
}
function disposeAutoExport() {
    // Access through getInstance to avoid private property access
    const instance = AutoExportWatcher.instance;
    if (instance) {
        instance.dispose();
    }
}
//# sourceMappingURL=watchCommand.js.map