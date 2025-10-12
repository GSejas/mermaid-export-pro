"use strict";
/**
 * Runs the interactive, guided "Export Folder" workflow for Mermaid diagrams.
 *
 * Summary:
 * - Orchestrates a multi-step UI-driven flow to discover Mermaid diagrams in a workspace or folder,
 *   gather user preferences (formats, theme, output location, advanced options), and then execute a
 *   tracked, cancellable export folder operation.
 * - Keeps orchestration and UI logic here while delegating core discovery, export engine, progress
 *   tracking and error handling to services and strategies under services/* and strategies/*.
 *
 * Workflow (high level):
 * 1. Prompt the user to select a source folder (or use an invoked folderUri).
 * 2. Perform an initial discovery of files containing Mermaid diagrams using diagramDiscoveryService.
 * 3. Show format selection (with estimates) and allow custom selections.
 * 4. Let the user pick a theme and optional background styling.
 * 5. Configure output directory, naming strategy and organization.
 * 6. Offer advanced options (search depth, overwrite policy).
 * 7. Present a summary and ask for final confirmation.
 * 8. Create an export batch via createBatchExportEngine, estimate duration, and execute it with
 *    progressReporting via progressTrackingService (supports cancellation).
 * 9. Present results (success, partial, or failure) and detailed reports or recovery actions.
 *
 * Behavior details:
 * - Progress and cancellation:
 *   Uses vscode.window.withProgress to show a cancellable progress notification. Cancellation
 *   requests are wired to progressTrackingService to stop the running batch gracefully.
 * - Error handling:
 *   All exceptions are handled through errorHandlingService which normalizes errors into rich
 *   error objects. The UI surfaces friendly messages and offers "Show Error Report" and
 *   "Show Recovery Actions" when available.
 * - Reporting:
 *   On completion (success, partial, or failure) the function displays summary messages and can
 *   open the output folder, show a generated Markdown report of the batch, or display an error
 *   report document.
 *
 * Notes for extension authors:
 * - This function is designed to be registered as a command handler in extension activation,
 *   for example:
 *     context.subscriptions.push(vscode.commands.registerCommand('mermaidExport.batchExport', (uri) => runBatchExport(context, uri)));
 * - Core logic (file discovery, batch creation/execution, progress reporting and error formatting)
 *   is intentionally left to dedicated services to make unit testing and reuse easier.
 *
 * @param context - The vscode.ExtensionContext provided to the extension activation. Used to
 *   create the export folder engine and to access extension state if required.
 * @param folderUri - Optional Uri provided by VS Code when the command is invoked from a file
 *   explorer context; when provided, it is used as the source folder default.
 * @returns A promise that resolves when the workflow completes (user cancelled, succeeded, or failed).
 *
 * @throws {Error} When an unexpected error occurs during initialization or execution. Errors are
 *   funneled through errorHandlingService and surfaced to the user with actionable recovery steps
 *   where available.
 *
 * @remarks
 * - The function exports an alias: exported as runBatchExport (aliased from runBatchExportV2)
 *   so it can be imported and registered by extension activation code.
 * - Keep UI prompts minimal and non-blocking where possible; long-running operations should always
 *   run under the provided progress token so users can cancel.
 *
 * @see diagramDiscoveryService
 * @see createBatchExportEngine
 * @see progressTrackingService
 * @see errorHandlingService
 */
/**
 * src/commands/batchExportCommand.v2.ts
 * Mermaid Export Pro — Folder export command (v2)
 *
 * Interactive, guided export folder workflow:
 *  - Discovers mermaid diagrams in a workspace or folder
 *  - Guides user to select formats, theme, output and advanced options
 *  - Executes a tracked, cancellable export folder and presents results/reports
 *
 * Note: Keep orchestration and UI logic here. Core business logic must remain
 * in services/* and strategies/* modules to preserve testability and reuse.
 *
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
exports.runBatchExportV2 = runBatchExportV2;
exports.runBatchExport = runBatchExportV2;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const diagramDiscoveryService_1 = require("../services/diagramDiscoveryService");
const batchExportEngine_1 = require("../services/batchExportEngine");
const progressTrackingService_1 = require("../services/progressTrackingService");
const errorHandlingService_1 = require("../services/errorHandlingService");
const errorHandler_1 = require("../ui/errorHandler");
const batchExportStatusBarManager_1 = require("../ui/batchExportStatusBarManager");
/**
 * Main entry point for export folder command
 */
async function runBatchExportV2(context, folderUri) {
    const operationId = `batch-export-${Date.now()}`;
    try {
        errorHandler_1.ErrorHandler.logInfo('=== Mermaid Export Pro v2.0 - Export Folder Started ===');
        // Step 1: Get comprehensive export configuration from user
        const config = await getComprehensiveBatchConfig(folderUri);
        if (!config) {
            errorHandler_1.ErrorHandler.logInfo('Folder export cancelled by user');
            return;
        }
        // Step 2: Show operation summary and get final confirmation
        const confirmed = await showOperationSummary(config);
        if (!confirmed) {
            errorHandler_1.ErrorHandler.logInfo('Folder export cancelled after summary');
            return;
        }
        // Step 3: Execute export folder with progress tracking
        await executeBatchExportWithTracking(context, config, operationId);
    }
    catch (error) {
        const batchError = errorHandlingService_1.errorHandlingService.handleError(error, {
            operation: 'batch-export',
            phase: 'initialization',
            additionalInfo: { operationId }
        });
        errorHandler_1.ErrorHandler.logError(`Folder export failed: ${batchError.message}`);
        await vscode.window.showErrorMessage(`Folder export failed: ${batchError.message}`, 'Show Error Report').then(action => {
            if (action === 'Show Error Report') {
                showErrorReport([batchError]);
            }
        });
    }
}
/**
 * Get comprehensive export folder configuration through guided UI flow
 */
async function getComprehensiveBatchConfig(folderUri) {
    try {
        // === STEP 1: SOURCE FOLDER SELECTION ===
        const sourceFolder = await selectSourceFolder(folderUri);
        if (!sourceFolder)
            return null;
        // === STEP 2: INITIAL FILE DISCOVERY ===
        const discoveryOptions = createInitialDiscoveryOptions(sourceFolder);
        const discoveredFiles = await diagramDiscoveryService_1.diagramDiscoveryService.discoverFiles(discoveryOptions);
        if (discoveredFiles.length === 0) {
            await vscode.window.showInformationMessage(`No mermaid files found in "${path.basename(sourceFolder)}". Try adjusting the search depth or check file patterns.`, 'Change Search Options');
            return null;
        }
        await vscode.window.showInformationMessage(`🎯 Discovery Complete: Found ${discoveredFiles.length} files with mermaid diagrams`, { modal: false });
        // === STEP 3: FORMAT SELECTION ===
        const formatSelection = await selectExportFormats(discoveredFiles);
        if (!formatSelection)
            return null;
        // === STEP 4: THEME AND STYLING ===
        const themeConfig = await selectThemeAndStyling();
        if (!themeConfig)
            return null;
        // === STEP 5: OUTPUT CONFIGURATION ===
        const outputConfig = await configureOutput(sourceFolder);
        if (!outputConfig)
            return null;
        // === STEP 6: ADVANCED OPTIONS (OPTIONAL) ===
        const advancedConfig = await configureAdvancedOptions(discoveryOptions);
        if (advancedConfig === null)
            return null;
        // === STEP 7: BUILD FINAL CONFIGURATION ===
        const finalConfig = {
            formats: formatSelection.formats,
            theme: themeConfig.value,
            backgroundColor: themeConfig.backgroundColor,
            outputDirectory: outputConfig.directory,
            maxDepth: advancedConfig.maxDepth,
            namingStrategy: outputConfig.namingStrategy,
            organizeByFormat: outputConfig.organizeByFormat,
            overwriteExisting: advancedConfig.overwriteExisting,
            dimensions: {
                width: 1200,
                height: 800
            }
        };
        errorHandler_1.ErrorHandler.logInfo(`Export Folder Command: Final config created with backgroundColor: "${finalConfig.backgroundColor}" and theme: ${finalConfig.theme}`);
        return finalConfig;
    }
    catch (error) {
        const batchError = errorHandlingService_1.errorHandlingService.handleError(error, {
            operation: 'configuration',
            phase: 'planning'
        });
        await vscode.window.showErrorMessage(`Configuration failed: ${batchError.message}`, 'Show Recovery Options').then(action => {
            if (action === 'Show Recovery Options') {
                vscode.window.showInformationMessage(batchError.recoveryActions.join('\n'), { modal: true });
            }
        });
        return null;
    }
}
/**
 * Source folder selection with smart defaults
 */
async function selectSourceFolder(folderUri) {
    if (folderUri) {
        return folderUri.fsPath;
    }
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length === 1) {
        const useWorkspace = await vscode.window.showQuickPick([
            {
                label: '📁 Current Workspace',
                description: workspaceFolders[0].name,
                detail: workspaceFolders[0].uri.fsPath,
                value: 'workspace'
            },
            {
                label: '📂 Browse for Different Folder',
                description: 'Select custom directory',
                detail: 'Choose any folder on your system',
                value: 'browse'
            }
        ], {
            placeHolder: 'Select source folder for export folder',
            ignoreFocusOut: true,
            title: '📍 Step 1/6: Source Folder Selection'
        });
        if (!useWorkspace)
            return null;
        if (useWorkspace.value === 'workspace') {
            return workspaceFolders[0].uri.fsPath;
        }
    }
    // Browse for folder
    const folderSelection = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select folder containing mermaid files',
        openLabel: 'Select Folder'
    });
    return folderSelection?.[0]?.fsPath || null;
}
/**
 * Create initial discovery options with sensible defaults
 */
function createInitialDiscoveryOptions(rootDirectory) {
    return {
        rootDirectory,
        maxDepth: 3,
        includePatterns: ['*.md', '*.mmd', '*.markdown'],
        excludePatterns: ['node_modules/**', '.git/**', '*.min.*', 'package-lock.json'],
        excludeDirectories: ['node_modules', '.git', '.vscode', 'dist', 'build'],
        followSymlinks: false,
        caseSensitive: false
    };
}
/**
 * Format selection with detailed estimates
 */
async function selectExportFormats(discoveredFiles) {
    const totalDiagrams = discoveredFiles.reduce((sum, file) => sum + file.diagrams.length, 0);
    const formatOptions = [
        {
            label: '🚀 All Formats (Recommended)',
            description: 'SVG + PNG + JPG + PDF',
            detail: `${totalDiagrams * 4} total files • Best compatibility`,
            formats: ['svg', 'png', 'jpg', 'pdf']
        },
        {
            label: '🎯 Vector Only (SVG)',
            description: 'Scalable, crisp, small files',
            detail: `${totalDiagrams} files • Perfect for web and design`,
            formats: ['svg']
        },
        {
            label: '📱 Raster Only (PNG)',
            description: 'Universal compatibility',
            detail: `${totalDiagrams} files • Great for documents and presentations`,
            formats: ['png']
        },
        {
            label: '📄 Document Ready (SVG + PDF)',
            description: 'Professional publishing',
            detail: `${totalDiagrams * 2} files • Ideal for reports and documentation`,
            formats: ['svg', 'pdf']
        },
        {
            label: '🌐 Web Optimized (SVG + WebP)',
            description: 'Modern web formats',
            detail: `${totalDiagrams * 2} files • Best for web applications`,
            formats: ['svg', 'webp']
        },
        {
            label: '🎨 Custom Selection',
            description: 'Choose specific formats',
            detail: 'Select individual formats',
            formats: []
        }
    ];
    const selection = await vscode.window.showQuickPick(formatOptions, {
        placeHolder: `Choose export formats for ${totalDiagrams} diagrams`,
        ignoreFocusOut: true,
        title: '📊 Step 2/6: Export Format Selection'
    });
    if (!selection)
        return null;
    if (selection.formats.length === 0) {
        // Custom selection
        return await selectCustomFormats(totalDiagrams);
    }
    return {
        formats: selection.formats,
        label: selection.label
    };
}
/**
 * Custom format selection
 */
async function selectCustomFormats(totalDiagrams) {
    const formatDetails = [
        {
            label: '🖼️ SVG',
            description: 'Scalable Vector Graphics',
            detail: 'Infinite zoom • Small files • Web-friendly',
            format: 'svg'
        },
        {
            label: '📸 PNG',
            description: 'Portable Network Graphics',
            detail: 'High quality • Transparency • Universal support',
            format: 'png'
        },
        {
            label: '📷 JPG',
            description: 'Compressed raster format',
            detail: 'Smaller files • Fast loading • Wide compatibility',
            format: 'jpg'
        },
        {
            label: '📄 PDF',
            description: 'Document format',
            detail: 'Print ready • Professional • Requires CLI',
            format: 'pdf'
        },
        {
            label: '🌐 WebP',
            description: 'Modern web format',
            detail: 'Excellent compression • Modern browsers',
            format: 'webp'
        }
    ];
    const selectedFormats = await vscode.window.showQuickPick(formatDetails, {
        placeHolder: 'Select one or more export formats',
        canPickMany: true,
        ignoreFocusOut: true,
        title: '🎨 Custom Format Selection'
    });
    if (!selectedFormats || selectedFormats.length === 0)
        return null;
    const formats = selectedFormats.map(s => s.format);
    const label = `Custom (${formats.map(f => f.toUpperCase()).join(', ')})`;
    return { formats, label };
}
/**
 * Theme and styling configuration
 */
async function selectThemeAndStyling() {
    const themeOptions = [
        {
            label: '🎨 Default Theme',
            description: 'Standard mermaid colors',
            detail: 'Blue/white scheme • Professional • Universal',
            value: 'default'
        },
        {
            label: '🌙 Dark Theme',
            description: 'Dark backgrounds, light text',
            detail: 'Modern UI • Easy on eyes • Great for presentations',
            value: 'dark'
        },
        {
            label: '🌳 Forest Theme',
            description: 'Nature-inspired green palette',
            detail: 'Green colors • Organic feel • Calming aesthetic',
            value: 'forest'
        },
        {
            label: '⚪ Neutral Theme',
            description: 'Minimal grayscale design',
            detail: 'Gray tones • Clean • Professional documents',
            value: 'neutral'
        }
    ];
    const themeSelection = await vscode.window.showQuickPick(themeOptions, {
        placeHolder: 'Choose visual theme for all diagrams',
        ignoreFocusOut: true,
        title: '🎭 Step 3/6: Theme Selection'
    });
    if (!themeSelection)
        return null;
    // Optional: Custom background color
    const backgroundChoice = await vscode.window.showQuickPick([
        {
            label: '✨ Transparent Background',
            description: 'No background (recommended)',
            value: 'transparent'
        },
        {
            label: '⚪ White Background',
            description: 'Solid white background',
            value: 'white'
        },
        {
            label: '⚫ Black Background',
            description: 'Solid black background',
            value: 'black'
        },
        {
            label: '🎨 Custom Color',
            description: 'Choose custom background',
            value: 'custom'
        }
    ], {
        placeHolder: 'Choose background style',
        ignoreFocusOut: true,
        title: '🖌️ Background Style'
    });
    if (!backgroundChoice)
        return null;
    let backgroundColor = backgroundChoice.value;
    if (backgroundChoice.value === 'custom') {
        const customColor = await vscode.window.showInputBox({
            prompt: 'Enter background color (hex, rgb, or CSS color name)',
            placeHolder: '#ffffff, rgb(255,255,255), lightblue, etc.',
            value: '#ffffff',
            validateInput: (value) => {
                if (!value.trim())
                    return 'Please enter a color value';
                return undefined; // Accept any string for now
            }
        });
        if (!customColor)
            return null;
        backgroundColor = customColor.trim();
    }
    errorHandler_1.ErrorHandler.logInfo(`Theme Selection: Selected "${themeSelection.value}" theme with backgroundColor: "${backgroundColor}"`);
    return {
        value: themeSelection.value,
        backgroundColor: backgroundColor
    };
}
/**
 * Output configuration
 */
async function configureOutput(sourceFolder) {
    // Output directory selection
    const outputOptions = [
        {
            label: '📁 Create "exported-diagrams" folder',
            description: 'In the source directory',
            detail: `${path.join(sourceFolder, 'exported-diagrams')}`,
            value: 'default'
        },
        {
            label: '📂 Same folder as source files',
            description: 'Export alongside original files',
            detail: 'Files will be mixed with sources',
            value: 'source'
        },
        {
            label: '🎯 Choose custom location',
            description: 'Browse for different folder',
            detail: 'Full control over output location',
            value: 'custom'
        }
    ];
    const outputChoice = await vscode.window.showQuickPick(outputOptions, {
        placeHolder: 'Where should exported files be saved?',
        ignoreFocusOut: true,
        title: '💾 Step 4/6: Output Location'
    });
    if (!outputChoice)
        return null;
    let directory;
    switch (outputChoice.value) {
        case 'default':
            directory = path.join(sourceFolder, 'exported-diagrams');
            break;
        case 'source':
            directory = sourceFolder;
            break;
        case 'custom':
            const customDir = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: 'Select output directory',
                openLabel: 'Select Directory'
            });
            if (!customDir)
                return null;
            directory = customDir[0].fsPath;
            break;
        default:
            return null;
    }
    // Naming strategy
    const namingOptions = [
        {
            label: '🔢 Sequential Naming',
            description: 'file-1.svg, file-2.svg',
            detail: 'Simple numeric sequence',
            value: 'sequential'
        },
        {
            label: '📋 Descriptive Naming',
            description: 'file-flowchart.svg, file-sequence.svg',
            detail: 'Include diagram type in name',
            value: 'descriptive'
        },
        {
            label: '📍 Line-based Naming',
            description: 'file-line-10.svg, file-line-25.svg',
            detail: 'Based on source line numbers',
            value: 'lineNumber'
        }
    ];
    const namingChoice = await vscode.window.showQuickPick(namingOptions, {
        placeHolder: 'Choose file naming strategy',
        ignoreFocusOut: true,
        title: '📝 File Naming Strategy'
    });
    if (!namingChoice)
        return null;
    // Organization preference
    const orgChoice = await vscode.window.showQuickPick([
        {
            label: '📁 Organize by Format',
            description: 'Create subfolders for each format',
            detail: 'svg/, png/, pdf/ subfolders',
            value: true
        },
        {
            label: '📄 Flat Organization',
            description: 'All files in one folder',
            detail: 'All formats mixed together',
            value: false
        }
    ], {
        placeHolder: 'Choose file organization method',
        ignoreFocusOut: true
    });
    if (orgChoice === undefined)
        return null;
    return {
        directory,
        namingStrategy: namingChoice.value,
        organizeByFormat: orgChoice.value
    };
}
/**
 * Advanced options configuration
 */
async function configureAdvancedOptions(currentOptions) {
    const showAdvanced = await vscode.window.showQuickPick([
        {
            label: '✅ Use Default Settings',
            description: 'Recommended for most users',
            detail: `Depth: ${currentOptions.maxDepth}, Overwrite: No`,
            value: 'default'
        },
        {
            label: '⚙️ Customize Advanced Options',
            description: 'Fine-tune export behavior',
            detail: 'Configure depth, patterns, overwrite policy',
            value: 'advanced'
        }
    ], {
        placeHolder: 'Advanced configuration',
        ignoreFocusOut: true,
        title: '⚙️ Step 5/6: Advanced Options'
    });
    if (!showAdvanced)
        return null;
    if (showAdvanced.value === 'default') {
        return {
            maxDepth: currentOptions.maxDepth,
            overwriteExisting: false
        };
    }
    // Custom advanced options
    const depthChoice = await vscode.window.showQuickPick([
        { label: '1 level', description: 'Current folder only', value: 1 },
        { label: '3 levels', description: 'Recommended depth', value: 3 },
        { label: '5 levels', description: 'Deep search', value: 5 },
        { label: '10 levels', description: 'Very deep search (may be slow)', value: 10 }
    ], {
        placeHolder: 'Maximum folder depth to search',
        ignoreFocusOut: true
    });
    if (!depthChoice)
        return null;
    const overwriteChoice = await vscode.window.showQuickPick([
        {
            label: '🛡️ Skip Existing Files',
            description: 'Do not overwrite existing exports',
            value: false
        },
        {
            label: '🔄 Overwrite Existing Files',
            description: 'Replace existing exports',
            value: true
        }
    ], {
        placeHolder: 'How to handle existing export files',
        ignoreFocusOut: true
    });
    if (overwriteChoice === undefined)
        return null;
    return {
        maxDepth: depthChoice.value,
        overwriteExisting: overwriteChoice.value
    };
}
/**
 * Show comprehensive operation summary
 */
async function showOperationSummary(config) {
    // Quick discovery to get file counts
    const discoveryOptions = createInitialDiscoveryOptions(path.dirname(config.outputDirectory));
    discoveryOptions.maxDepth = config.maxDepth;
    const files = await diagramDiscoveryService_1.diagramDiscoveryService.discoverFiles(discoveryOptions);
    const totalDiagrams = files.reduce((sum, file) => sum + file.diagrams.length, 0);
    const totalOutputs = totalDiagrams * config.formats.length;
    const summary = [
        '# Export Folder Summary',
        '',
        `**Files Found**: ${files.length} files`,
        `**Diagrams Found**: ${totalDiagrams} diagrams`,
        `**Export Formats**: ${config.formats.map(f => f.toUpperCase()).join(', ')}`,
        `**Total Outputs**: ${totalOutputs} files`,
        `**Theme**: ${config.theme}`,
        `**Output Directory**: ${config.outputDirectory}`,
        `**Organization**: ${config.organizeByFormat ? 'By format' : 'Flat'}`,
        `**Naming**: ${config.namingStrategy}`,
        '',
        '**Ready to start export folder?**'
    ].join('\n');
    const proceed = await vscode.window.showInformationMessage(`🚀 Export Folder Ready\n\n${files.length} files • ${totalDiagrams} diagrams • ${totalOutputs} outputs\n\nProceed with export?`, { modal: true }, 'Start Export', 'Show Details', 'Cancel');
    if (proceed === 'Show Details') {
        // Show detailed summary in new document
        const doc = await vscode.workspace.openTextDocument({
            content: summary,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
        return await vscode.window.showInformationMessage('Review the details and confirm to proceed', { modal: true }, 'Start Export', 'Cancel') === 'Start Export';
    }
    return proceed === 'Start Export';
}
/**
 * Execute export folder with comprehensive progress tracking
 */
async function executeBatchExportWithTracking(context, config, operationId) {
    const engine = (0, batchExportEngine_1.createBatchExportEngine)(context);
    const reporter = progressTrackingService_1.progressTrackingService.createReporter(operationId);
    // Start the export folder with animated status bar
    let isCancelled = false;
    batchExportStatusBarManager_1.batchExportStatusBar.startBatchExport(() => {
        isCancelled = true;
        progressTrackingService_1.progressTrackingService.cancel(operationId);
    });
    try {
        // Phase 1: File Discovery
        batchExportStatusBarManager_1.batchExportStatusBar.updateProgress({
            phase: 'discovery',
            message: 'Discovering mermaid files...'
        });
        const discoveryOptions = createInitialDiscoveryOptions(path.dirname(config.outputDirectory));
        discoveryOptions.maxDepth = config.maxDepth;
        const files = await diagramDiscoveryService_1.diagramDiscoveryService.discoverFiles(discoveryOptions);
        if (files.length === 0) {
            throw new Error('No mermaid files found with current configuration');
        }
        batchExportStatusBarManager_1.batchExportStatusBar.updateProgress({
            phase: 'discovery',
            message: 'Found mermaid files',
            filesCompleted: files.length,
            totalFiles: files.length
        });
        // Phase 2: Create Export Batch
        batchExportStatusBarManager_1.batchExportStatusBar.updateProgress({
            phase: 'planning',
            message: 'Planning export operations...'
        });
        const batch = await engine.createBatch(files, config);
        const estimatedDuration = await engine.estimateDuration(batch);
        // Initialize the progress reporter with total job count
        reporter.initializeBatch(batch.jobs.length);
        batchExportStatusBarManager_1.batchExportStatusBar.updateProgress({
            phase: 'planning',
            message: `Planned ${batch.jobs.length} jobs (est. ${Math.round(estimatedDuration / 1000)}s)`,
            totalJobs: batch.jobs.length
        });
        // Phase 3: Execute Batch
        batchExportStatusBarManager_1.batchExportStatusBar.updateProgress({
            phase: 'exporting',
            message: 'Exporting diagrams...',
            jobsCompleted: 0,
            totalJobs: batch.jobs.length
        });
        // Set up progress reporting for batch execution
        progressTrackingService_1.progressTrackingService.onProgress(operationId, (batchProgress) => {
            if (isCancelled)
                return;
            // Update based on the progress information we receive
            batchExportStatusBarManager_1.batchExportStatusBar.updateProgress({
                phase: 'exporting',
                message: batchProgress.currentOperation.message,
                jobsCompleted: Math.round(batchProgress.overallProgress * batch.jobs.length),
                totalJobs: batch.jobs.length
            });
        });
        // Execute the batch
        const result = await engine.executeBatch(batch, reporter);
        if (isCancelled || reporter.isCancelled()) {
            batchExportStatusBarManager_1.batchExportStatusBar.cancelBatchExport();
            return;
        }
        batchExportStatusBarManager_1.batchExportStatusBar.updateProgress({
            phase: 'completing',
            message: 'Finalizing export results...'
        });
        // Show completion status
        const success = result.summary.failedJobs === 0;
        const completionMessage = success
            ? `${result.summary.successfulJobs} diagrams exported successfully`
            : `${result.summary.successfulJobs} successful, ${result.summary.failedJobs} failed`;
        batchExportStatusBarManager_1.batchExportStatusBar.completeBatchExport(success, completionMessage, result.summary.totalDuration);
        // Show detailed results after status bar animation
        setTimeout(() => {
            showBatchResults(result);
        }, 1000);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (isCancelled || reporter.isCancelled()) {
            batchExportStatusBarManager_1.batchExportStatusBar.cancelBatchExport();
        }
        else {
            batchExportStatusBarManager_1.batchExportStatusBar.completeBatchExport(false, `Export failed: ${errorMessage}`);
            // Show error dialog after a brief delay
            setTimeout(() => {
                const batchError = errorHandlingService_1.errorHandlingService.handleError(error, {
                    operation: 'batch-export-execution',
                    phase: 'exporting',
                    context: { configOutputDir: config.outputDirectory, operationId }
                });
                vscode.window.showErrorMessage(batchError.message || 'Folder export failed', 'Show Error Report').then(action => {
                    if (action === 'Show Error Report') {
                        showErrorReport([batchError]);
                    }
                });
            }, 500);
        }
        throw error;
    }
    finally {
        // Cleanup progress tracking
        setTimeout(() => progressTrackingService_1.progressTrackingService.cleanup(operationId), 5000);
    }
}
/**
 * Show comprehensive batch results
 */
async function showBatchResults(result) {
    const { successfulJobs, failedJobs, totalJobs } = result.summary;
    const duration = Math.round(result.summary.totalDuration / 1000);
    if (successfulJobs === totalJobs) {
        // Complete success - non-blocking notification
        vscode.window.showInformationMessage(`🎉 Export Folder Complete! ✅ ${successfulJobs} diagrams exported in ${duration}s`, 'Open Output Folder', 'Show Report').then(action => {
            if (action === 'Open Output Folder') {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(result.batch.config.outputDirectory));
            }
            else if (action === 'Show Report') {
                showBatchReport(result);
            }
        });
    }
    else if (successfulJobs > 0) {
        // Partial success - non-blocking notification
        vscode.window.showWarningMessage(`⚠️ Export Folder: ${successfulJobs} successful, ${failedJobs} failed (${duration}s)`, 'Open Output Folder', 'Show Error Report', 'Show Full Report').then(action => {
            if (action === 'Open Output Folder') {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(result.batch.config.outputDirectory));
            }
            else if (action === 'Show Error Report') {
                showErrorReport(result.errors);
            }
            else if (action === 'Show Full Report') {
                showBatchReport(result);
            }
        });
    }
    else {
        // Complete failure - non-blocking notification
        vscode.window.showErrorMessage(`❌ Export Folder Failed - No files exported (${duration}s)`, 'Show Error Report').then(action => {
            if (action === 'Show Error Report') {
                showErrorReport(result.errors);
            }
        });
    }
}
/**
 * Show detailed batch report
 */
async function showBatchReport(result) {
    const report = generateBatchReport(result);
    const doc = await vscode.workspace.openTextDocument({
        content: report,
        language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
}
/**
 * Generate comprehensive batch report
 */
function generateBatchReport(result) {
    const lines = [];
    lines.push('# Mermaid Export Pro v2.0 - Export Folder Report');
    lines.push(`Generated: ${result.timeline.completedAt.toISOString()}`);
    lines.push('');
    // Summary
    lines.push('## Summary');
    lines.push(`- **Total Jobs**: ${result.summary.totalJobs}`);
    lines.push(`- **Successful**: ${result.summary.successfulJobs} ✅`);
    lines.push(`- **Failed**: ${result.summary.failedJobs} ❌`);
    lines.push(`- **Duration**: ${Math.round(result.summary.totalDuration / 1000)} seconds`);
    lines.push(`- **Output Size**: ${formatFileSize(result.summary.totalOutputSize)}`);
    lines.push(`- **Throughput**: ${result.performance.throughput.toFixed(2)} jobs/second`);
    lines.push('');
    // Configuration
    lines.push('## Configuration');
    lines.push(`- **Formats**: ${result.batch.config.formats.join(', ')}`);
    lines.push(`- **Theme**: ${result.batch.config.theme}`);
    lines.push(`- **Output**: ${path.basename(result.batch.config.outputDirectory)}`);
    lines.push(`- **Organization**: ${result.batch.config.organizeByFormat ? 'By format' : 'Flat'}`);
    lines.push(`- **Naming**: ${result.batch.config.namingStrategy}`);
    lines.push('');
    // Outputs by format
    lines.push('## Outputs by Format');
    for (const [format, paths] of result.outputs.byFormat) {
        lines.push(`### ${format.toUpperCase()} (${paths.length} files)`);
        paths.slice(0, 10).forEach(p => lines.push(`- ${path.basename(p)}`));
        if (paths.length > 10) {
            lines.push(`- ... and ${paths.length - 10} more files`);
        }
        lines.push('');
    }
    // Errors (if any)
    if (result.errors.length > 0) {
        lines.push('## Errors');
        result.errors.forEach((error, index) => {
            lines.push(`### Error ${index + 1}: ${error.code}`);
            lines.push(`- **Message**: ${error.message}`);
            lines.push(`- **Severity**: ${error.severity}`);
            lines.push(`- **Retryable**: ${error.retryable ? 'Yes' : 'No'}`);
            if (error.recoveryActions.length > 0) {
                lines.push('- **Recovery Actions**:');
                error.recoveryActions.forEach(action => lines.push(`  - ${action}`));
            }
            lines.push('');
        });
    }
    return lines.join('\n');
}
/**
 * Show error report
 */
async function showErrorReport(errors) {
    const report = errorHandlingService_1.errorHandlingService.generateErrorReport(errors);
    const doc = await vscode.workspace.openTextDocument({
        content: report,
        language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
}
/**
 * Utility function to format file sizes
 */
function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}
//# sourceMappingURL=batchExportCommand.v2.js.map