"use strict";
/**
 * Mermaid Export Pro - Main Export Command
 *
 * Purpose: Export current mermaid file or active selection to various formats
 * Author: Claude/Jorge
 * Date: 2025-08-24
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
exports.runExportCommand = runExportCommand;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const cliExportStrategy_1 = require("../strategies/cliExportStrategy");
const webExportStrategy_1 = require("../strategies/webExportStrategy");
const errorHandler_1 = require("../ui/errorHandler");
const autoNaming_1 = require("../utils/autoNaming");
const formatPreferenceManager_1 = require("../services/formatPreferenceManager");
const operationTimeoutManager_1 = require("../services/operationTimeoutManager");
const dialogService_1 = require("../services/dialogService");
async function runExportCommand(context, preferAuto = false, documentUri, testOutputPath // NEW: For testing - bypasses dialog
) {
    console.log('[DEBUG exportCommand] Starting export command...');
    console.log('[DEBUG exportCommand] preferAuto:', preferAuto);
    console.log('[DEBUG exportCommand] testOutputPath:', testOutputPath);
    errorHandler_1.ErrorHandler.logInfo('Starting export command...');
    // Check export throttling
    const timeoutManager = operationTimeoutManager_1.OperationTimeoutManager.getInstance();
    if (!timeoutManager.canStartExport()) {
        const remainingMs = timeoutManager.getExportCooldownRemaining();
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        vscode.window.showWarningMessage(`Please wait ${remainingSeconds}s before starting another export to prevent system overload.`);
        return;
    }
    try {
        // If a document URI was provided (e.g., from Explorer context), open it so there's an active editor
        if (documentUri) {
            const doc = await vscode.workspace.openTextDocument(documentUri);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
        // Get active document
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active document found. Please open a mermaid or markdown file.');
            return;
        }
        // Extract mermaid content
        const document = activeEditor.document;
        const mermaidContent = await extractMermaidContent(document, activeEditor.selection);
        if (!mermaidContent) {
            vscode.window.showErrorMessage('No mermaid diagram found. Ensure you have a ```mermaid code block or .mmd file open.');
            return;
        }
        errorHandler_1.ErrorHandler.logInfo(`Found mermaid content: ${mermaidContent.length} characters`);
        // Get export options from user (or derive from testOutputPath for testing)
        let exportOptions;
        if (testOutputPath) {
            // TEST MODE: Derive format from output path extension
            const ext = path.extname(testOutputPath).toLowerCase().slice(1);
            // Validate format
            const validFormats = ['svg', 'png', 'jpg', 'jpeg', 'pdf'];
            if (!validFormats.includes(ext)) {
                throw new Error(`Invalid test output format: ${ext}. Must be one of: ${validFormats.join(', ')}`);
            }
            // Normalize jpeg to jpg
            const normalizedFormat = (ext === 'jpeg' ? 'jpg' : ext);
            console.log('[DEBUG exportCommand] Test mode - derived format:', normalizedFormat);
            exportOptions = {
                format: normalizedFormat,
                theme: 'default',
                width: 1200,
                height: 800,
                backgroundColor: 'transparent'
            };
        }
        else {
            // Normal mode: Ask user for format/theme
            exportOptions = await getExportOptions();
            if (!exportOptions) {
                return; // User cancelled
            }
        }
        // Determine output path. Persist per-file format choice and optionally auto-save.
        const formatPrefManager = new formatPreferenceManager_1.FormatPreferenceManager(context);
        // Persist the user's chosen format for this file
        await formatPrefManager.setFileFormatPreference(document.fileName, exportOptions.format);
        let outputPath = null;
        console.log('[DEBUG exportCommand] Checking preferAuto flag:', preferAuto);
        // TEST MODE: If testOutputPath is provided, use it directly
        if (testOutputPath) {
            console.log('[DEBUG exportCommand] Using testOutputPath:', testOutputPath);
            outputPath = testOutputPath;
        }
        else if (preferAuto) {
            // Auto-generate smart name next to file (skip save dialog)
            console.log('[DEBUG exportCommand] preferAuto=true, generating smart name...');
            const outputDir = path.dirname(document.fileName);
            outputPath = await autoNaming_1.AutoNaming.generateSmartName({ baseName: path.basename(document.fileName, path.extname(document.fileName)), format: exportOptions.format, content: mermaidContent, outputDirectory: outputDir });
            console.log('[DEBUG exportCommand] Generated outputPath:', outputPath);
        }
        else {
            // Fall back to save dialog
            console.log('[DEBUG exportCommand] preferAuto=false, showing save dialog...');
            outputPath = await getOutputPath(document, exportOptions.format);
        }
        if (!outputPath) {
            return; // User cancelled
        }
        exportOptions.outputPath = outputPath;
        // Select strategy and export with timeout monitoring
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Exporting to ${exportOptions.format.toUpperCase()}...`,
            cancellable: false
        }, async (progress) => {
            const timeoutManager = operationTimeoutManager_1.OperationTimeoutManager.getInstance();
            const operationId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // Start timeout monitoring
            timeoutManager.startOperation(operationId, `Export to ${exportOptions.format.toUpperCase()}`, 'export', progress, {
                onSoftTimeout: () => {
                    errorHandler_1.ErrorHandler.logInfo(`Soft timeout warning for export operation`);
                },
                onMediumTimeout: async () => {
                    const choice = await vscode.window.showWarningMessage(`Export is taking longer than expected (${exportOptions.format.toUpperCase()}). This might indicate:
• Large/complex diagram
• System resource constraints
• CLI tool issues`, { modal: false }, 'Keep Waiting (30s more)', 'Cancel Export', 'Switch to Web Export');
                    if (choice === 'Keep Waiting (30s more)') {
                        timeoutManager.updateProgress(operationId, 'Continuing export - please wait...');
                        return true;
                    }
                    else if (choice === 'Switch to Web Export') {
                        // Try web strategy as fallback
                        timeoutManager.updateProgress(operationId, 'Switching to web export strategy...');
                        return true;
                    }
                    return false; // Cancel
                },
                onHardTimeout: async () => {
                    errorHandler_1.ErrorHandler.logError(`Hard timeout: Export operation exceeded maximum time limit`);
                    // Force cleanup of any hanging processes
                    try {
                        // Kill any hanging CLI processes
                        if (process.platform === 'win32') {
                            require('child_process').exec('taskkill /f /im mmdc.exe /t', () => { });
                        }
                        else {
                            require('child_process').exec('pkill -f mmdc', () => { });
                        }
                    }
                    catch (e) {
                        // Ignore cleanup errors
                    }
                },
                onCleanup: async () => {
                    errorHandler_1.ErrorHandler.logInfo(`Cleaning up export operation ${operationId}`);
                }
            });
            try {
                timeoutManager.updateProgress(operationId, 'Selecting export strategy...');
                const strategy = await selectBestStrategy(context);
                errorHandler_1.ErrorHandler.logInfo(`Using strategy: ${strategy.name}`);
                timeoutManager.updateProgress(operationId, `Exporting with ${strategy.name}...`);
                const buffer = await strategy.export(mermaidContent, exportOptions);
                timeoutManager.updateProgress(operationId, 'Saving file...');
                await fs.promises.writeFile(outputPath, buffer);
                const stats = await fs.promises.stat(outputPath);
                errorHandler_1.ErrorHandler.logInfo(`Export completed: ${outputPath} (${stats.size} bytes)`);
                // Mark operation as completed
                timeoutManager.completeOperation(operationId);
                // Show success message with actions
                const action = await vscode.window.showInformationMessage(`Mermaid diagram exported successfully to ${path.basename(outputPath)} (${formatBytes(stats.size)})`, 'Open File', 'Show in Explorer', 'Copy Path');
                if (action === 'Open File') {
                    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(outputPath));
                }
                else if (action === 'Show in Explorer') {
                    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                }
                else if (action === 'Copy Path') {
                    await vscode.env.clipboard.writeText(outputPath);
                    vscode.window.showInformationMessage('File path copied to clipboard');
                }
            }
            catch (error) {
                // Cancel timeout monitoring on error
                timeoutManager.cancelOperation(operationId, 'timeout');
                const errorMsg = error instanceof Error ? error.message : 'Unknown export error';
                errorHandler_1.ErrorHandler.logError(`Export failed: ${errorMsg}`);
                vscode.window.showErrorMessage(`Export failed: ${errorMsg}`);
            }
        });
    }
    catch (error) {
        errorHandler_1.ErrorHandler.logError(`Export command failed: ${error}`);
        vscode.window.showErrorMessage(`Export command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Extract mermaid content from document
 */
async function extractMermaidContent(document, selection) {
    const fileName = document.fileName.toLowerCase();
    // If .mmd file, use entire content
    if (fileName.endsWith('.mmd')) {
        return document.getText().trim();
    }
    // If markdown file, look for mermaid blocks
    if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
        // If text is selected, try to use selection first
        if (!selection.isEmpty) {
            const selectedText = document.getText(selection).trim();
            if (selectedText.includes('mermaid') || isMermaidSyntax(selectedText)) {
                return cleanMermaidContent(selectedText);
            }
        }
        // Extract from entire document
        const fullText = document.getText();
        // More flexible regex to handle various spacing and newline combinations
        const mermaidMatch = fullText.match(/```mermaid\s*([\s\S]*?)\s*```/);
        if (mermaidMatch) {
            return mermaidMatch[1].trim();
        }
    }
    // Try current selection or line
    if (!selection.isEmpty) {
        const selectedText = document.getText(selection).trim();
        if (isMermaidSyntax(selectedText)) {
            return selectedText;
        }
    }
    return null;
}
/**
 * Check if text looks like mermaid syntax
 */
function isMermaidSyntax(text) {
    const mermaidKeywords = [
        'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
        'journey', 'gantt', 'pie', 'gitgraph', 'erDiagram', 'mindmap'
    ];
    return mermaidKeywords.some(keyword => text.includes(keyword));
}
/**
 * Clean mermaid content by removing markdown code block markers
 */
function cleanMermaidContent(content) {
    return content
        .replace(/^```mermaid\s*\n?/, '')
        .replace(/\n?```\s*$/, '')
        .trim();
}
/**
 * Get export options from user
 */
async function getExportOptions() {
    // Get format
    const format = await vscode.window.showQuickPick([
        { label: 'SVG', description: 'Scalable Vector Graphics (best quality)', value: 'svg' },
        { label: 'PNG', description: 'Portable Network Graphics (raster)', value: 'png' },
        { label: 'JPG', description: 'JPEG image (compressed)', value: 'jpg' },
        { label: 'PDF', description: 'Portable Document Format', value: 'pdf' }
    ], {
        placeHolder: 'Select export format',
        ignoreFocusOut: true
    });
    if (!format) {
        return null;
    }
    // Get theme
    const theme = await vscode.window.showQuickPick([
        { label: 'Default', description: 'Default mermaid theme', value: 'default' },
        { label: 'Dark', description: 'Dark theme for dark backgrounds', value: 'dark' },
        { label: 'Forest', description: 'Green forest theme', value: 'forest' },
        { label: 'Neutral', description: 'Neutral gray theme', value: 'neutral' }
    ], {
        placeHolder: 'Select theme',
        ignoreFocusOut: true
    });
    if (!theme) {
        return null;
    }
    return {
        format: format.value,
        theme: theme.value,
        width: 1200,
        height: 800,
        backgroundColor: 'transparent'
    };
}
/**
 * Get output path from user
 */
async function getOutputPath(document, format) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const defaultName = path.basename(document.fileName, path.extname(document.fileName)) + `.${format}`;
    const defaultUri = workspaceFolder
        ? vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, defaultName))
        : vscode.Uri.file(path.join(path.dirname(document.fileName), defaultName));
    const dialogService = (0, dialogService_1.getDialogService)();
    console.log('[DEBUG getOutputPath] dialogService:', dialogService.constructor.name);
    console.log('[DEBUG getOutputPath] Calling showSaveDialog with defaultUri:', defaultUri.fsPath);
    const result = await dialogService.showSaveDialog({
        defaultUri,
        filters: {
            [`${format.toUpperCase()} files`]: [format]
        },
        title: `Save ${format.toUpperCase()} file`
    });
    console.log('[DEBUG getOutputPath] showSaveDialog result:', result?.fsPath);
    return result?.fsPath || null;
}
/**
 * Select best available export strategy
 */
async function selectBestStrategy(context) {
    const cliStrategy = new cliExportStrategy_1.CLIExportStrategy();
    const webStrategy = new webExportStrategy_1.WebExportStrategy(context);
    // Try CLI first (better quality), fallback to web
    if (await cliStrategy.isAvailable()) {
        return cliStrategy;
    }
    if (await webStrategy.isAvailable()) {
        return webStrategy;
    }
    throw new Error('No export strategy available. Install mermaid-cli or ensure webview support.');
}
/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
//# sourceMappingURL=exportCommand.js.map