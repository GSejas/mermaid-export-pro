/**
 * Runs the interactive, guided "Batch Export" workflow for Mermaid diagrams.
 *
 * Summary:
 * - Orchestrates a multi-step UI-driven flow to discover Mermaid diagrams in a workspace or folder,
 *   gather user preferences (formats, theme, output location, advanced options), and then execute a
 *   tracked, cancellable batch export operation.
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
 *   create the batch export engine and to access extension state if required.
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
 * Mermaid Export Pro — Batch export command (v2)
 *
 * Interactive, guided batch export workflow:
 *  - Discovers mermaid diagrams in a workspace or folder
 *  - Guides user to select formats, theme, output and advanced options
 *  - Executes a tracked, cancellable batch export and presents results/reports
 *
 * Note: Keep orchestration and UI logic here. Core business logic must remain
 * in services/* and strategies/* modules to preserve testability and reuse.
 *
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  BatchExportConfig,
  DiscoveryOptions,
  ExportBatch,
  BatchResult,
  FileNamingStrategy,
  BatchPhase
} from '../types/batchExport';
import { ExportFormat, MermaidTheme } from '../types';
import { diagramDiscoveryService } from '../services/diagramDiscoveryService';
import { createBatchExportEngine } from '../services/batchExportEngine';
import { progressTrackingService } from '../services/progressTrackingService';
import { errorHandlingService } from '../services/errorHandlingService';
import { ErrorHandler } from '../ui/errorHandler';
import { batchExportStatusBar } from '../ui/batchExportStatusBarManager';

/**
 * User interface options for batch export configuration
 */
interface BatchExportUIOptions {
  /** Source folder selection */
  sourceFolder: {
    label: string;
    description: string;
    path: string;
  };
  /** Format selection */
  formats: {
    label: string;
    description: string;
    formats: ExportFormat[];
    estimatedFiles: number;
  };
  /** Theme and styling */
  theme: {
    label: string;
    value: MermaidTheme;
    backgroundColor?: string;
  };
  /** Output organization */
  output: {
    directory: string;
    namingStrategy: FileNamingStrategy;
    organizeByFormat: boolean;
  };
  /** Advanced options */
  advanced: {
    maxDepth: number;
    overwriteExisting: boolean;
    includePatterns: string[];
    excludePatterns: string[];
  };
}

/**
 * Main entry point for batch export command
 */
export async function runBatchExportV2(
  context: vscode.ExtensionContext, 
  folderUri?: vscode.Uri
): Promise<void> {
  const operationId = `batch-export-${Date.now()}`;
  
  try {
    ErrorHandler.logInfo('=== Mermaid Export Pro v2.0 - Batch Export Started ===');
    
    // Step 1: Get comprehensive export configuration from user
    const config = await getComprehensiveBatchConfig(folderUri);
    if (!config) {
      ErrorHandler.logInfo('Batch export cancelled by user');
      return;
    }
    
    // Step 2: Show operation summary and get final confirmation
    const confirmed = await showOperationSummary(config);
    if (!confirmed) {
      ErrorHandler.logInfo('Batch export cancelled after summary');
      return;
    }
    
    // Step 3: Execute batch export with progress tracking
    await executeBatchExportWithTracking(context, config, operationId);
    
  } catch (error) {
    const batchError = errorHandlingService.handleError(error, {
      operation: 'batch-export',
      phase: 'initialization' as BatchPhase,
      additionalInfo: { operationId }
    });
    
    ErrorHandler.logError(`Batch export failed: ${batchError.message}`);
    
    await vscode.window.showErrorMessage(
      `Batch export failed: ${batchError.message}`,
      'Show Error Report'
    ).then(action => {
      if (action === 'Show Error Report') {
        showErrorReport([batchError]);
      }
    });
  }
}

/**
 * Get comprehensive batch export configuration through guided UI flow
 */
async function getComprehensiveBatchConfig(folderUri?: vscode.Uri): Promise<BatchExportConfig | null> {
  try {
    // === STEP 1: SOURCE FOLDER SELECTION ===
    const sourceFolder = await selectSourceFolder(folderUri);
    if (!sourceFolder) return null;
    
    // === STEP 2: INITIAL FILE DISCOVERY ===
    const discoveryOptions = createInitialDiscoveryOptions(sourceFolder);
    const discoveredFiles = await diagramDiscoveryService.discoverFiles(discoveryOptions);
    
    if (discoveredFiles.length === 0) {
      await vscode.window.showInformationMessage(
        `No mermaid files found in "${path.basename(sourceFolder)}". Try adjusting the search depth or check file patterns.`,
        'Change Search Options'
      );
      return null;
    }
    
    await vscode.window.showInformationMessage(
      `🎯 Discovery Complete: Found ${discoveredFiles.length} files with mermaid diagrams`,
      { modal: false }
    );
    
    // === STEP 3: FORMAT SELECTION ===
    const formatSelection = await selectExportFormats(discoveredFiles);
    if (!formatSelection) return null;
    
    // === STEP 4: THEME AND STYLING ===
    const themeConfig = await selectThemeAndStyling();
    if (!themeConfig) return null;
    
    // === STEP 5: OUTPUT CONFIGURATION ===
    const outputConfig = await configureOutput(sourceFolder);
    if (!outputConfig) return null;
    
    // === STEP 6: ADVANCED OPTIONS (OPTIONAL) ===
    const advancedConfig = await configureAdvancedOptions(discoveryOptions);
    if (advancedConfig === null) return null;
    
    // === STEP 7: BUILD FINAL CONFIGURATION ===
    const finalConfig: BatchExportConfig = {
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
    
    ErrorHandler.logInfo(`Batch Export Command: Final config created with backgroundColor: "${finalConfig.backgroundColor}" and theme: ${finalConfig.theme}`);
    
    return finalConfig;
    
  } catch (error) {
    const batchError = errorHandlingService.handleError(error, {
      operation: 'configuration',
      phase: 'planning' as BatchPhase
    });
    
    await vscode.window.showErrorMessage(
      `Configuration failed: ${batchError.message}`,
      'Show Recovery Options'
    ).then(action => {
      if (action === 'Show Recovery Options') {
        vscode.window.showInformationMessage(
          batchError.recoveryActions.join('\n'),
          { modal: true }
        );
      }
    });
    
    return null;
  }
}

/**
 * Source folder selection with smart defaults
 */
async function selectSourceFolder(folderUri?: vscode.Uri): Promise<string | null> {
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
      placeHolder: 'Select source folder for batch export',
      ignoreFocusOut: true,
      title: '📍 Step 1/6: Source Folder Selection'
    });
    
    if (!useWorkspace) return null;
    
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
function createInitialDiscoveryOptions(rootDirectory: string): DiscoveryOptions {
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
async function selectExportFormats(discoveredFiles: any[]): Promise<{ formats: ExportFormat[]; label: string } | null> {
  const totalDiagrams = discoveredFiles.reduce((sum, file) => sum + file.diagrams.length, 0);
  
  const formatOptions = [
    {
      label: '🚀 All Formats (Recommended)',
      description: 'SVG + PNG + JPG + PDF',
      detail: `${totalDiagrams * 4} total files • Best compatibility`,
      formats: ['svg', 'png', 'jpg', 'pdf'] as ExportFormat[]
    },
    {
      label: '🎯 Vector Only (SVG)',
      description: 'Scalable, crisp, small files',
      detail: `${totalDiagrams} files • Perfect for web and design`,
      formats: ['svg'] as ExportFormat[]
    },
    {
      label: '📱 Raster Only (PNG)',
      description: 'Universal compatibility',
      detail: `${totalDiagrams} files • Great for documents and presentations`,
      formats: ['png'] as ExportFormat[]
    },
    {
      label: '📄 Document Ready (SVG + PDF)',
      description: 'Professional publishing',
      detail: `${totalDiagrams * 2} files • Ideal for reports and documentation`,
      formats: ['svg', 'pdf'] as ExportFormat[]
    },
    {
      label: '🌐 Web Optimized (SVG + WebP)',
      description: 'Modern web formats',
      detail: `${totalDiagrams * 2} files • Best for web applications`,
      formats: ['svg', 'webp'] as ExportFormat[]
    },
    {
      label: '🎨 Custom Selection',
      description: 'Choose specific formats',
      detail: 'Select individual formats',
      formats: [] as ExportFormat[]
    }
  ];
  
  const selection = await vscode.window.showQuickPick(formatOptions, {
    placeHolder: `Choose export formats for ${totalDiagrams} diagrams`,
    ignoreFocusOut: true,
    title: '📊 Step 2/6: Export Format Selection'
  });
  
  if (!selection) return null;
  
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
async function selectCustomFormats(totalDiagrams: number): Promise<{ formats: ExportFormat[]; label: string } | null> {
  const formatDetails = [
    {
      label: '🖼️ SVG',
      description: 'Scalable Vector Graphics',
      detail: 'Infinite zoom • Small files • Web-friendly',
      format: 'svg' as ExportFormat
    },
    {
      label: '📸 PNG',
      description: 'Portable Network Graphics', 
      detail: 'High quality • Transparency • Universal support',
      format: 'png' as ExportFormat
    },
    {
      label: '📷 JPG',
      description: 'Compressed raster format',
      detail: 'Smaller files • Fast loading • Wide compatibility',
      format: 'jpg' as ExportFormat
    },
    {
      label: '📄 PDF',
      description: 'Document format',
      detail: 'Print ready • Professional • Requires CLI',
      format: 'pdf' as ExportFormat
    },
    {
      label: '🌐 WebP',
      description: 'Modern web format',
      detail: 'Excellent compression • Modern browsers',
      format: 'webp' as ExportFormat
    }
  ];
  
  const selectedFormats = await vscode.window.showQuickPick(formatDetails, {
    placeHolder: 'Select one or more export formats',
    canPickMany: true,
    ignoreFocusOut: true,
    title: '🎨 Custom Format Selection'
  });
  
  if (!selectedFormats || selectedFormats.length === 0) return null;
  
  const formats = selectedFormats.map(s => s.format);
  const label = `Custom (${formats.map(f => f.toUpperCase()).join(', ')})`;
  
  return { formats, label };
}

/**
 * Theme and styling configuration
 */
async function selectThemeAndStyling(): Promise<{ value: MermaidTheme; backgroundColor?: string } | null> {
  const themeOptions = [
    {
      label: '🎨 Default Theme',
      description: 'Standard mermaid colors',
      detail: 'Blue/white scheme • Professional • Universal',
      value: 'default' as MermaidTheme
    },
    {
      label: '🌙 Dark Theme',
      description: 'Dark backgrounds, light text',
      detail: 'Modern UI • Easy on eyes • Great for presentations',
      value: 'dark' as MermaidTheme
    },
    {
      label: '🌳 Forest Theme',
      description: 'Nature-inspired green palette',
      detail: 'Green colors • Organic feel • Calming aesthetic',
      value: 'forest' as MermaidTheme
    },
    {
      label: '⚪ Neutral Theme',
      description: 'Minimal grayscale design',
      detail: 'Gray tones • Clean • Professional documents',
      value: 'neutral' as MermaidTheme
    }
  ];
  
  const themeSelection = await vscode.window.showQuickPick(themeOptions, {
    placeHolder: 'Choose visual theme for all diagrams',
    ignoreFocusOut: true,
    title: '🎭 Step 3/6: Theme Selection'
  });
  
  if (!themeSelection) return null;
  
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
  
  if (!backgroundChoice) return null;
  
  let backgroundColor = backgroundChoice.value;
  
  if (backgroundChoice.value === 'custom') {
    const customColor = await vscode.window.showInputBox({
      prompt: 'Enter background color (hex, rgb, or CSS color name)',
      placeHolder: '#ffffff, rgb(255,255,255), lightblue, etc.',
      value: '#ffffff',
      validateInput: (value) => {
        if (!value.trim()) return 'Please enter a color value';
        return undefined; // Accept any string for now
      }
    });
    
    if (!customColor) return null;
    backgroundColor = customColor.trim();
  }
  
  ErrorHandler.logInfo(`Theme Selection: Selected "${themeSelection.value}" theme with backgroundColor: "${backgroundColor}"`);
  
  return {
    value: themeSelection.value,
    backgroundColor: backgroundColor
  };
}

/**
 * Output configuration
 */
async function configureOutput(sourceFolder: string): Promise<{ 
  directory: string; 
  namingStrategy: FileNamingStrategy; 
  organizeByFormat: boolean 
} | null> {
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
  
  if (!outputChoice) return null;
  
  let directory: string;
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
      if (!customDir) return null;
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
      value: 'sequential' as FileNamingStrategy
    },
    {
      label: '📋 Descriptive Naming',
      description: 'file-flowchart.svg, file-sequence.svg',
      detail: 'Include diagram type in name',
      value: 'descriptive' as FileNamingStrategy
    },
    {
      label: '📍 Line-based Naming',
      description: 'file-line-10.svg, file-line-25.svg',
      detail: 'Based on source line numbers',
      value: 'lineNumber' as FileNamingStrategy
    }
  ];
  
  const namingChoice = await vscode.window.showQuickPick(namingOptions, {
    placeHolder: 'Choose file naming strategy',
    ignoreFocusOut: true,
    title: '📝 File Naming Strategy'
  });
  
  if (!namingChoice) return null;
  
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
  
  if (orgChoice === undefined) return null;
  
  return {
    directory,
    namingStrategy: namingChoice.value,
    organizeByFormat: orgChoice.value
  };
}

/**
 * Advanced options configuration
 */
async function configureAdvancedOptions(currentOptions: DiscoveryOptions): Promise<{
  maxDepth: number;
  overwriteExisting: boolean;
} | null> {
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
  
  if (!showAdvanced) return null;
  
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
  
  if (!depthChoice) return null;
  
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
  
  if (overwriteChoice === undefined) return null;
  
  return {
    maxDepth: depthChoice.value,
    overwriteExisting: overwriteChoice.value
  };
}

/**
 * Show comprehensive operation summary
 */
async function showOperationSummary(config: BatchExportConfig): Promise<boolean> {
  // Quick discovery to get file counts
  const discoveryOptions = createInitialDiscoveryOptions(path.dirname(config.outputDirectory));
  discoveryOptions.maxDepth = config.maxDepth;
  
  const files = await diagramDiscoveryService.discoverFiles(discoveryOptions);
  const totalDiagrams = files.reduce((sum, file) => sum + file.diagrams.length, 0);
  const totalOutputs = totalDiagrams * config.formats.length;
  
  const summary = [
    '# Batch Export Summary',
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
    '**Ready to start batch export?**'
  ].join('\n');
  
  const proceed = await vscode.window.showInformationMessage(
    `🚀 Batch Export Ready\n\n${files.length} files • ${totalDiagrams} diagrams • ${totalOutputs} outputs\n\nProceed with export?`,
    { modal: true },
    'Start Export',
    'Show Details',
    'Cancel'
  );
  
  if (proceed === 'Show Details') {
    // Show detailed summary in new document
    const doc = await vscode.workspace.openTextDocument({
      content: summary,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
    
    return await vscode.window.showInformationMessage(
      'Review the details and confirm to proceed',
      { modal: true },
      'Start Export',
      'Cancel'
    ) === 'Start Export';
  }
  
  return proceed === 'Start Export';
}

/**
 * Execute batch export with comprehensive progress tracking
 */
async function executeBatchExportWithTracking(
  context: vscode.ExtensionContext,
  config: BatchExportConfig,
  operationId: string
): Promise<void> {
  const engine = createBatchExportEngine(context);
  const reporter = progressTrackingService.createReporter(operationId);
  
  // Start the batch export with animated status bar
  let isCancelled = false;
  
  batchExportStatusBar.startBatchExport(() => {
    isCancelled = true;
    progressTrackingService.cancel(operationId);
  });
  
  try {
    // Phase 1: File Discovery
    batchExportStatusBar.updateProgress({
      phase: 'discovery',
      message: 'Discovering mermaid files...'
    });
      
    const discoveryOptions = createInitialDiscoveryOptions(path.dirname(config.outputDirectory));
    discoveryOptions.maxDepth = config.maxDepth;
      
      const files = await diagramDiscoveryService.discoverFiles(discoveryOptions);
      
      if (files.length === 0) {
        throw new Error('No mermaid files found with current configuration');
      }
      
    batchExportStatusBar.updateProgress({
      phase: 'discovery',
      message: 'Found mermaid files',
      filesCompleted: files.length,
      totalFiles: files.length
    });
      
      // Phase 2: Create Export Batch
      batchExportStatusBar.updateProgress({
        phase: 'planning',
        message: 'Planning export operations...'
      });
      
      const batch = await engine.createBatch(files, config);
      const estimatedDuration = await engine.estimateDuration(batch);
      
      // Initialize the progress reporter with total job count
      reporter.initializeBatch(batch.jobs.length);
      
      batchExportStatusBar.updateProgress({
        phase: 'planning', 
        message: `Planned ${batch.jobs.length} jobs (est. ${Math.round(estimatedDuration / 1000)}s)`,
        totalJobs: batch.jobs.length
      });
      
      // Phase 3: Execute Batch
      batchExportStatusBar.updateProgress({
        phase: 'exporting',
        message: 'Exporting diagrams...',
        jobsCompleted: 0,
        totalJobs: batch.jobs.length
      });
      
      // Set up progress reporting for batch execution
      progressTrackingService.onProgress(operationId, (batchProgress) => {
        if (isCancelled) return;
        
        // Update based on the progress information we receive
        batchExportStatusBar.updateProgress({
          phase: 'exporting',
          message: batchProgress.currentOperation.message,
          jobsCompleted: Math.round(batchProgress.overallProgress * batch.jobs.length),
          totalJobs: batch.jobs.length
        });
      });
      
      // Execute the batch
      const result = await engine.executeBatch(batch, reporter);
      
      if (isCancelled || reporter.isCancelled()) {
        batchExportStatusBar.cancelBatchExport();
        return;
      }
      
      batchExportStatusBar.updateProgress({
        phase: 'completing',
        message: 'Finalizing export results...'
      });
      
      // Show completion status
      const success = result.summary.failedJobs === 0;
      const completionMessage = success 
        ? `${result.summary.successfulJobs} diagrams exported successfully`
        : `${result.summary.successfulJobs} successful, ${result.summary.failedJobs} failed`;
      
      batchExportStatusBar.completeBatchExport(success, completionMessage, result.summary.totalDuration);
      
      // Show detailed results after status bar animation
      setTimeout(() => {
        showBatchResults(result);
      }, 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (isCancelled || reporter.isCancelled()) {
        batchExportStatusBar.cancelBatchExport();
      } else {
        batchExportStatusBar.completeBatchExport(false, `Export failed: ${errorMessage}`);
        
        // Show error dialog after a brief delay
        setTimeout(() => {
          const batchError = errorHandlingService.handleError(error, {
            operation: 'batch-export-execution',
            phase: 'exporting' as BatchPhase,
            context: { configOutputDir: config.outputDirectory, operationId }
          });

          vscode.window.showErrorMessage(
            batchError.message || 'Batch export failed',
            'Show Error Report'
          ).then(action => {
            if (action === 'Show Error Report') {
              showErrorReport([batchError]);
            }
          });
        }, 500);
      }
      throw error;
  } finally {
    // Cleanup progress tracking
    setTimeout(() => progressTrackingService.cleanup(operationId), 5000);
  }
}

/**
 * Show comprehensive batch results
 */
async function showBatchResults(result: BatchResult): Promise<void> {
  const { successfulJobs, failedJobs, totalJobs } = result.summary;
  const duration = Math.round(result.summary.totalDuration / 1000);
  
  if (successfulJobs === totalJobs) {
    // Complete success - non-blocking notification
    vscode.window.showInformationMessage(
      `🎉 Batch Export Complete! ✅ ${successfulJobs} diagrams exported in ${duration}s`,
      'Open Output Folder',
      'Show Report'
    ).then(action => {
      if (action === 'Open Output Folder') {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(result.batch.config.outputDirectory));
      } else if (action === 'Show Report') {
        showBatchReport(result);
      }
    });
    
  } else if (successfulJobs > 0) {
    // Partial success - non-blocking notification
    vscode.window.showWarningMessage(
      `⚠️ Batch Export: ${successfulJobs} successful, ${failedJobs} failed (${duration}s)`,
      'Open Output Folder',
      'Show Error Report',
      'Show Full Report'
    ).then(action => {
      if (action === 'Open Output Folder') {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(result.batch.config.outputDirectory));
      } else if (action === 'Show Error Report') {
        showErrorReport(result.errors);
      } else if (action === 'Show Full Report') {
        showBatchReport(result);
      }
    });
    
  } else {
    // Complete failure - non-blocking notification
    vscode.window.showErrorMessage(
      `❌ Batch Export Failed - No files exported (${duration}s)`,
      'Show Error Report'
    ).then(action => {
      if (action === 'Show Error Report') {
        showErrorReport(result.errors);
      }
    });
  }
}

/**
 * Show detailed batch report
 */
async function showBatchReport(result: BatchResult): Promise<void> {
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
function generateBatchReport(result: BatchResult): string {
  const lines = [];
  
  lines.push('# Mermaid Export Pro v2.0 - Batch Export Report');
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
async function showErrorReport(errors: any[]): Promise<void> {
  const report = errorHandlingService.generateErrorReport(errors);
  
  const doc = await vscode.workspace.openTextDocument({
    content: report,
    language: 'markdown'
  });
  
  await vscode.window.showTextDocument(doc);
}

/**
 * Utility function to format file sizes
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Export the main function for use in extension.ts
 */
export { runBatchExportV2 as runBatchExport };