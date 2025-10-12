"use strict";
/**
 * Export All Diagrams Command - Export all mermaid diagrams from current file
 *
 * Purpose: Intelligently export all mermaid diagrams found in a single file
 * Features:
 * - Detects multiple diagrams in markdown files
 * - Handles single .mmd files
 * - Provides user choice for export options
 * - Generates numbered output files for multiple diagrams
 * - Integrates with timeout management system
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
exports.runExportAllCommand = runExportAllCommand;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const cliExportStrategy_1 = require("../strategies/cliExportStrategy");
const webExportStrategy_1 = require("../strategies/webExportStrategy");
const errorHandler_1 = require("../ui/errorHandler");
const operationTimeoutManager_1 = require("../services/operationTimeoutManager");
async function runExportAllCommand(context, documentUri) {
    // Check export throttling
    const timeoutManager = operationTimeoutManager_1.OperationTimeoutManager.getInstance();
    if (!timeoutManager.canStartExport()) {
        const remainingMs = timeoutManager.getExportCooldownRemaining();
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        vscode.window.showWarningMessage(`Please wait ${remainingSeconds}s before starting another export to prevent system overload.`);
        return;
    }
    try {
        // If a document URI was provided, open it
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
        const document = activeEditor.document;
        const diagrams = await extractAllMermaidDiagrams(document);
        if (diagrams.length === 0) {
            vscode.window.showErrorMessage('No mermaid diagrams found in the current file.');
            return;
        }
        // If only one diagram, delegate to single export for better UX
        if (diagrams.length === 1) {
            await vscode.commands.executeCommand('mermaidExportPro.exportCurrent');
            return;
        }
        // Multiple diagrams - show options
        const choice = await vscode.window.showQuickPick([
            {
                label: `📊 Export All ${diagrams.length} Diagrams`,
                description: 'Export all diagrams with auto-generated names',
                detail: 'Creates: filename-1.svg, filename-2.svg, etc.'
            },
            {
                label: '🎯 Export Single Diagram',
                description: 'Choose which diagram to export',
                detail: 'Select one diagram from the list'
            },
            {
                label: '⚙️ Custom Export Options',
                description: 'Choose format, theme, and output location',
                detail: 'Configure export settings for all diagrams'
            }
        ], {
            placeHolder: `Found ${diagrams.length} diagrams in ${path.basename(document.fileName)}`,
            ignoreFocusOut: true
        });
        if (!choice)
            return;
        if (choice.label.includes('Export All')) {
            await exportAllDiagrams(document, diagrams, context);
        }
        else if (choice.label.includes('Export Single')) {
            await selectAndExportSingleDiagram(document, diagrams, context);
        }
        else if (choice.label.includes('Custom Export')) {
            await exportAllWithCustomOptions(document, diagrams, context);
        }
    }
    catch (error) {
        errorHandler_1.ErrorHandler.logError(`Export all command failed: ${error}`);
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Extract all mermaid diagrams from document
 */
async function extractAllMermaidDiagrams(document) {
    const fileName = document.fileName.toLowerCase();
    const content = document.getText();
    // If .mmd file, treat entire content as one diagram
    if (fileName.endsWith('.mmd')) {
        const trimmedContent = content.trim();
        if (!trimmedContent)
            return [];
        return [{
                content: trimmedContent,
                startLine: 0,
                endLine: document.lineCount - 1,
                type: 'mmd'
            }];
    }
    // If markdown file, extract all mermaid blocks
    if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
        return extractMermaidFromMarkdown(content);
    }
    return [];
}
/**
 * Extract mermaid diagrams from markdown content
 */
function extractMermaidFromMarkdown(content) {
    const diagrams = [];
    const lines = content.split('\n');
    let inMermaidBlock = false;
    let startLine = -1;
    let mermaidContent = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '```mermaid') {
            inMermaidBlock = true;
            startLine = i;
            mermaidContent = [];
        }
        else if (line === '```' && inMermaidBlock) {
            inMermaidBlock = false;
            if (mermaidContent.length > 0) {
                diagrams.push({
                    content: mermaidContent.join('\n').trim(),
                    startLine: startLine + 1, // Skip the ```mermaid line
                    endLine: i - 1, // Skip the ``` line
                    type: 'markdown'
                });
            }
        }
        else if (inMermaidBlock) {
            mermaidContent.push(lines[i]); // Keep original indentation
        }
    }
    return diagrams;
}
/**
 * Export all diagrams with default settings
 */
async function exportAllDiagrams(document, diagrams, context) {
    // Get default export options
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    const format = config.get('defaultFormat', 'png');
    const theme = config.get('theme', 'default');
    const exportOptions = {
        format,
        theme,
        width: config.get('width', 1200),
        height: config.get('height', 800),
        backgroundColor: config.get('backgroundColor', 'transparent')
    };
    await exportMultipleDiagrams(document, diagrams, exportOptions, context);
}
/**
 * Export all diagrams with custom options
 */
async function exportAllWithCustomOptions(document, diagrams, context) {
    // Get custom export options
    const exportOptions = await getCustomExportOptions();
    if (!exportOptions)
        return;
    await exportMultipleDiagrams(document, diagrams, exportOptions, context);
}
/**
 * Select and export a single diagram
 */
async function selectAndExportSingleDiagram(document, diagrams, context) {
    const diagramChoices = diagrams.map((diagram, index) => {
        const preview = diagram.content.substring(0, 50).replace(/\n/g, ' ');
        const lineInfo = diagram.type === 'mmd' ? 'Full file' : `Lines ${diagram.startLine + 1}-${diagram.endLine + 1}`;
        return {
            label: `📊 Diagram ${index + 1}`,
            description: preview + (diagram.content.length > 50 ? '...' : ''),
            detail: lineInfo,
            diagram: diagram,
            index: index
        };
    });
    const selected = await vscode.window.showQuickPick(diagramChoices, {
        placeHolder: 'Select diagram to export',
        ignoreFocusOut: true
    });
    if (!selected)
        return;
    // Create a selection for the chosen diagram and use standard export
    const range = new vscode.Range(selected.diagram.startLine, 0, selected.diagram.endLine, 0);
    const editor = vscode.window.activeTextEditor;
    editor.selection = new vscode.Selection(range.start, range.end);
    // Use existing export command
    await vscode.commands.executeCommand('mermaidExportPro.exportCurrent');
}
/**
 * Export multiple diagrams with progress tracking
 */
async function exportMultipleDiagrams(document, diagrams, exportOptions, context) {
    const baseName = path.basename(document.fileName, path.extname(document.fileName));
    const outputDir = path.dirname(document.fileName);
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Exporting ${diagrams.length} diagrams...`,
        cancellable: false
    }, async (progress) => {
        const timeoutManager = operationTimeoutManager_1.OperationTimeoutManager.getInstance();
        const operationId = `export-all-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Start timeout monitoring
        timeoutManager.startOperation(operationId, `Export All Diagrams (${diagrams.length})`, 'batchExport', // Use batch timeouts since this is multiple exports
        progress, {
            onSoftTimeout: () => {
                errorHandler_1.ErrorHandler.logInfo(`Soft timeout warning for multi-diagram export`);
            },
            onCleanup: async () => {
                errorHandler_1.ErrorHandler.logInfo(`Cleaning up multi-diagram export operation ${operationId}`);
            }
        });
        try {
            const strategy = await selectBestStrategy(context);
            const results = { success: true, exported: 0, failed: 0, outputs: [], errors: [] };
            for (let i = 0; i < diagrams.length; i++) {
                const diagram = diagrams[i];
                const increment = ((i + 1) / diagrams.length) * 100;
                timeoutManager.updateProgress(operationId, `Exporting diagram ${i + 1}/${diagrams.length}...`, increment);
                try {
                    // Generate output path
                    const outputName = diagrams.length > 1
                        ? `${baseName}-${i + 1}.${exportOptions.format}`
                        : `${baseName}.${exportOptions.format}`;
                    const outputPath = path.join(outputDir, outputName);
                    // Export diagram
                    const buffer = await strategy.export(diagram.content, exportOptions);
                    await fs.promises.writeFile(outputPath, buffer);
                    results.exported++;
                    results.outputs.push(outputPath);
                }
                catch (error) {
                    results.failed++;
                    results.errors.push(`Diagram ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    errorHandler_1.ErrorHandler.logError(`Failed to export diagram ${i + 1}: ${error}`);
                }
            }
            // Complete operation
            timeoutManager.completeOperation(operationId);
            // Show results
            await showExportResults(results);
        }
        catch (error) {
            timeoutManager.cancelOperation(operationId, 'timeout');
            throw error;
        }
    });
}
/**
 * Get custom export options from user
 */
async function getCustomExportOptions() {
    // Format selection
    const format = await vscode.window.showQuickPick([
        { label: 'SVG', description: 'Scalable Vector Graphics (best quality)', value: 'svg' },
        { label: 'PNG', description: 'Portable Network Graphics (raster)', value: 'png' },
        { label: 'JPG', description: 'JPEG image (compressed)', value: 'jpg' },
        { label: 'PDF', description: 'Portable Document Format', value: 'pdf' }
    ], {
        placeHolder: 'Select export format for all diagrams',
        ignoreFocusOut: true
    });
    if (!format)
        return null;
    // Theme selection
    const theme = await vscode.window.showQuickPick([
        { label: 'Default', description: 'Default mermaid theme', value: 'default' },
        { label: 'Dark', description: 'Dark theme for dark backgrounds', value: 'dark' },
        { label: 'Forest', description: 'Green forest theme', value: 'forest' },
        { label: 'Neutral', description: 'Neutral gray theme', value: 'neutral' }
    ], {
        placeHolder: 'Select theme for all diagrams',
        ignoreFocusOut: true
    });
    if (!theme)
        return null;
    return {
        format: format.value,
        theme: theme.value,
        width: 1200,
        height: 800,
        backgroundColor: 'transparent'
    };
}
/**
 * Select best available export strategy
 */
async function selectBestStrategy(context) {
    const cliStrategy = new cliExportStrategy_1.CLIExportStrategy();
    const webStrategy = new webExportStrategy_1.WebExportStrategy(context);
    if (await cliStrategy.isAvailable()) {
        return cliStrategy;
    }
    if (await webStrategy.isAvailable()) {
        return webStrategy;
    }
    throw new Error('No export strategy available. Install mermaid-cli or ensure webview support.');
}
/**
 * Show export results to user
 */
async function showExportResults(results) {
    if (results.exported === 0) {
        vscode.window.showErrorMessage(`Export failed: No diagrams were exported successfully.`);
        return;
    }
    const message = results.failed > 0
        ? `Exported ${results.exported} diagrams successfully, ${results.failed} failed.`
        : `Successfully exported all ${results.exported} diagrams!`;
    const action = await vscode.window.showInformationMessage(message, results.outputs.length === 1 ? 'Open File' : 'Show in Explorer', 'Copy Paths');
    if (action === 'Open File' && results.outputs.length === 1) {
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(results.outputs[0]));
    }
    else if (action === 'Show in Explorer') {
        // Open the directory containing the exports
        const firstOutput = results.outputs[0];
        if (firstOutput) {
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(firstOutput));
        }
    }
    else if (action === 'Copy Paths') {
        const pathsList = results.outputs.join('\n');
        await vscode.env.clipboard.writeText(pathsList);
        vscode.window.showInformationMessage('File paths copied to clipboard');
    }
    // Show errors if any
    if (results.errors.length > 0) {
        const channel = vscode.window.createOutputChannel('Mermaid Export Pro - Export Errors');
        channel.clear();
        channel.appendLine('=== EXPORT ERRORS ===');
        results.errors.forEach(error => channel.appendLine(error));
        channel.show();
    }
}
//# sourceMappingURL=exportAllCommand.js.map