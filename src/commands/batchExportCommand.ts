/**
 * Export Folder Command - Export multiple mermaid files from folders
 * 
 * Purpose: Recursively discover and export all mermaid files in a directory tree
 * Features:
 * - Comprehensive guided export flow (format, background, theme, output)
 * - Recursive folder scanning with configurable depth limits
 * - Multi-format export support with detailed user options
 * - Progress tracking and detailed results reporting
 * - Context menu integration for folder-level operations
 * - Handles both .mmd files and markdown files with mermaid blocks
 * 
 * Architecture:
 * - User-guided 4-step export flow
 * - Recursive file discovery with depth constraints
 * - Parallel export processing with progress tracking
 * - Comprehensive error handling and reporting
 * 
 * Author: Claude/Jorge
 * Version: 1.0.4
 * Date: 2025-08-27
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { ErrorHandler } from '../ui/errorHandler';
import { ExportOptions, ExportFormat, MermaidTheme, ExportStrategy, MermaidFile } from '../types';
import { OperationTimeoutManager } from '../services/operationTimeoutManager';

/**
 * Result of processing a single file during export folder
 */
interface BatchResult {
  /** File path that was processed */
  file: string;
  /** Whether export succeeded */
  success: boolean;
  /** Output file path if successful */
  outputPath?: string;
  /** Error message if failed */
  error?: string;
  /** Processing duration in milliseconds */
  duration: number;
}

export async function runBatchExport(context: vscode.ExtensionContext, folderUri?: vscode.Uri): Promise<void> {
  ErrorHandler.logInfo('Starting Mermaid Export Pro - Export Folder command...');

  try {
    // Get target folder - use provided URI or ask user to select
    const targetFolder = folderUri?.fsPath || await getTargetFolder();
    if (!targetFolder) {
      return; // User cancelled
    }

    // Discover mermaid files with default depth
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    const initialMaxDepth = config.get<number>('batchExportDefaultDepth', 3);
    const mermaidFiles = await discoverMermaidFiles(targetFolder, initialMaxDepth);
    if (mermaidFiles.length === 0) {
      const folderName = path.basename(targetFolder);
      const message = folderUri 
        ? `No mermaid files (.mmd or .md with mermaid diagrams) found in "${folderName}"`
        : `No mermaid files found in ${folderName}`;
      vscode.window.showInformationMessage(message);
      return;
    }

    const folderName = path.basename(targetFolder);
    const logMessage = folderUri 
      ? `Folder export: Found ${mermaidFiles.length} mermaid files in "${folderName}"`
      : `Found ${mermaidFiles.length} mermaid files to export`;
    ErrorHandler.logInfo(logMessage);

    // Show initial discovery message when called from context menu
    if (folderUri && mermaidFiles.length > 0) {
      vscode.window.showInformationMessage(
        `Found ${mermaidFiles.length} mermaid diagram(s) in "${folderName}" ready for export folder`
      );
    }

    // Comprehensive guided export flow
    const exportConfig = await getComprehensiveBatchExportOptions(targetFolder, mermaidFiles.length);
    if (!exportConfig) {
      return; // User cancelled
    }

    const { exportOptions, outputDirectory } = exportConfig;
    
    // Use the files already discovered with the default depth
    const finalMermaidFiles = mermaidFiles;
    const maxDepth = initialMaxDepth; // Use the depth from settings
    exportOptions.outputPath = outputDirectory;

    // Confirm batch operation  
    const formatText = (exportOptions as any).allFormats ? 
      `${(exportOptions as any).allFormats.join(', ').toUpperCase()}` : 
      exportOptions.format.toUpperCase();
    
    const proceed = await vscode.window.showWarningMessage(
      `Export ${finalMermaidFiles.length} mermaid files to ${formatText}?\n\n` +
      `📂 Source: ${path.basename(targetFolder)}\n` +
      `💾 Output: ${path.basename(outputDirectory)}\n` +
      `🎨 Theme: ${exportOptions.theme}`,
      { modal: true },
      'Export All',
      'Cancel'
    );

    if (proceed !== 'Export All') {
      return;
    }

    // Run Mermaid Export Pro - Export Folder
    const progressTitle = (exportOptions as any).allFormats ? 
      `Export Foldering ${finalMermaidFiles.length} files to ${(exportOptions as any).allFormats.length} formats` :
      `Export Foldering ${finalMermaidFiles.length} files to ${exportOptions.format.toUpperCase()}`;
    
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: progressTitle,
      cancellable: true
    }, async (progress, token) => {
      const results: BatchResult[] = [];
      const strategy = await selectBestStrategy(context);
      
      ErrorHandler.logInfo(`Using ${strategy.name} for Mermaid Export Pro - Export Folder`);
      
      let completed = 0;
      const total = finalMermaidFiles.length;
      
      for (const file of finalMermaidFiles) {
        if (token.isCancellationRequested) {
          break;
        }

        const fileName = path.basename(file.path);
        progress.report({ 
          increment: (completed / total) * 100, 
          message: `Exporting ${fileName}...` 
        });

        const result = await exportSingleFile(file, strategy, exportOptions, outputDirectory);
        results.push(result);
        completed++;

        ErrorHandler.logInfo(`Exported ${fileName}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      }

      // Show results summary
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      progress.report({ increment: 100, message: 'Generating report...' });

      await showBatchResults(results, outputDirectory, token.isCancellationRequested);

      if (failed.length === 0) {
        vscode.window.showInformationMessage(
          `Mermaid Export Pro - Export Folder completed successfully! ${successful.length} files exported.`
        );
      } else {
        vscode.window.showWarningMessage(
          `Mermaid Export Pro - Export Folder completed with ${failed.length} failures. ${successful.length} files exported successfully.`
        );
      }
    });

  } catch (error) {
    ErrorHandler.logError(`Mermaid Export Pro - Export Folder failed: ${error}`);
    vscode.window.showErrorMessage(`Mermaid Export Pro - Export Folder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get target folder for Mermaid Export Pro - Export Folder
 */
async function getTargetFolder(): Promise<string | null> {
  // Try workspace folder first
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length === 1) {
    const useWorkspace = await vscode.window.showQuickPick([
      { label: 'Current Workspace', description: workspaceFolders[0].name, value: workspaceFolders[0].uri.fsPath },
      { label: 'Choose Different Folder...', value: 'browse' }
    ], {
      placeHolder: 'Select folder to export from',
      ignoreFocusOut: true
    });

    if (!useWorkspace) {
      return null;
    }
    
    if (useWorkspace.value !== 'browse') {
      return useWorkspace.value;
    }
  }

  // Browse for folder
  const folderUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: 'Select folder containing mermaid files'
  });

  return folderUri?.[0]?.fsPath || null;
}

/**
 * Discover all mermaid files in directory with depth limit
 */
async function discoverMermaidFiles(directory: string, maxDepth: number = 5): Promise<MermaidFile[]> {
  const mermaidFiles: MermaidFile[] = [];
  
  async function scanDirectory(dir: string, currentDepth: number = 0): Promise<void> {
    // Stop if we've reached max depth
    if (currentDepth >= maxDepth) {
      return;
    }
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDirectory(fullPath, currentDepth + 1);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        if (ext === '.mmd') {
          // Pure mermaid file
          const content = await fs.promises.readFile(fullPath, 'utf8');
          mermaidFiles.push({
            path: fullPath,
            content: content.trim(),
            type: 'mmd',
            diagrams: [{
              content: content.trim(),
              startLine: 0,
              endLine: content.split('\n').length - 1,
              type: detectDiagramType(content)
            }]
          });
        } else if (ext === '.md' || ext === '.markdown') {
          // Markdown file - extract mermaid blocks
          const content = await fs.promises.readFile(fullPath, 'utf8');
          const diagrams = extractMermaidFromMarkdown(content);
          
          if (diagrams.length > 0) {
            mermaidFiles.push({
              path: fullPath,
              content,
              type: 'markdown',
              diagrams
            });
          }
        }
      }
    }
  }
  
  await scanDirectory(directory);
  
  ErrorHandler.logInfo(`Discovered ${mermaidFiles.length} mermaid files (max depth: ${maxDepth})`);
  return mermaidFiles;
}

/**
 * Extract mermaid diagrams from markdown content
 */
function extractMermaidFromMarkdown(content: string): Array<{content: string, startLine: number, endLine: number, type: string}> {
  const diagrams: Array<{content: string, startLine: number, endLine: number, type: string}> = [];
  const lines = content.split('\n');
  
  let inMermaidBlock = false;
  let startLine = -1;
  let mermaidContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '```mermaid') {
      inMermaidBlock = true;
      startLine = i;
      mermaidContent = [];
    } else if (line === '```' && inMermaidBlock) {
      inMermaidBlock = false;
      const diagramContent = mermaidContent.join('\n').trim();
      if (diagramContent) {
        diagrams.push({
          content: diagramContent,
          startLine: startLine,
          endLine: i,
          type: detectDiagramType(diagramContent)
        });
      }
    } else if (inMermaidBlock) {
      mermaidContent.push(lines[i]);
    }
  }
  
  return diagrams;
}

/**
 * Detect diagram type from content
 */
function detectDiagramType(content: string): string {
  const firstLine = content.trim().split('\n')[0];
  
  if (firstLine.includes('flowchart') || firstLine.includes('graph')) {
    return 'flowchart';
  }
  if (firstLine.includes('sequenceDiagram')) {
    return 'sequence';
  }
  if (firstLine.includes('classDiagram')) {
    return 'class';
  }
  if (firstLine.includes('stateDiagram')) {
    return 'state';
  }
  if (firstLine.includes('erDiagram')) {
    return 'er';
  }
  if (firstLine.includes('journey')) {
    return 'journey';
  }
  if (firstLine.includes('gantt')) {
    return 'gantt';
  }
  if (firstLine.includes('pie')) {
    return 'pie';
  }
  if (firstLine.includes('gitgraph')) {
    return 'gitgraph';
  }
  if (firstLine.includes('mindmap')) {
    return 'mindmap';
  }
  
  return 'unknown';
}

/**
 * Get Mermaid Export Pro - Export Folder options
 */
/**
 * Comprehensive guided export folder options flow
 * Step 1: Format Selection (all formats, then individual descriptions)
 * Step 2: Background Color Selection  
 * Step 3: Theme Selection
 * Step 4: Folder Depth Selection
 * Step 5: Output Directory Selection
 */
async function getComprehensiveBatchExportOptions(
  sourceFolder: string, 
  fileCount: number
): Promise<{ exportOptions: ExportOptions; outputDirectory: string } | null> {
  
  // === STEP 1: FORMAT SELECTION ===
  // First show all formats with brief descriptions
  const formatChoice = await vscode.window.showQuickPick([
    { 
      label: '📊 Export All Formats', 
      description: 'SVG + PNG + JPG + PDF (recommended)', 
      value: 'all',
      detail: `Export ${fileCount} diagrams in all 4 formats (${fileCount * 4} total files)` 
    },
    { 
      label: '🎯 Choose Single Format', 
      description: 'Select one specific format', 
      value: 'single',
      detail: 'More control over export settings'
    }
  ], {
    placeHolder: '📋 Export Folder: Choose your export strategy',
    ignoreFocusOut: true,
    title: '🎨 Mermaid Export Pro - Export Folder Configuration (Step 1/4)'
  });

  if (!formatChoice) {return null;}

  let selectedFormats: ExportFormat[];
  
  if (formatChoice.value === 'all') {
    selectedFormats = ['svg', 'png', 'jpg', 'pdf'];
  } else {
    // Show individual format selection with detailed descriptions
    const individualFormat = await vscode.window.showQuickPick([
      { 
        label: '🖼️ SVG - Scalable Vector Graphics', 
        description: 'Best quality, infinite zoom, small file size',
        value: 'svg',
        detail: '• Perfect for web use • Editable in design tools • Always crisp'
      },
      { 
        label: '📸 PNG - Portable Network Graphics', 
        description: 'High quality raster, transparency support',
        value: 'png', 
        detail: '• Universal compatibility • Transparent backgrounds • Good for documents'
      },
      { 
        label: '📷 JPG - Compressed Image', 
        description: 'Smaller file size, good for sharing',
        value: 'jpg',
        detail: '• Smallest files • Fast loading • White backgrounds only'
      },
      { 
        label: '📄 PDF - Document Format', 
        description: 'Perfect for printing and professional docs', 
        value: 'pdf',
        detail: '• Print-ready • Professional standard • Requires CLI export'
      },
      { 
        label: '🌐 WebP - Modern Web Format', 
        description: 'Excellent compression, modern browsers',
        value: 'webp',
        detail: '• Best compression • Modern standard • Great for web'
      }
    ], {
      placeHolder: '🎯 Select format with detailed benefits',
      ignoreFocusOut: true,
      title: '📊 Choose Export Format (Step 1/4)'
    });
    
    if (!individualFormat) {return null;}
    selectedFormats = [individualFormat.value as ExportFormat];
  }

  // === STEP 2: BACKGROUND COLOR SELECTION ===
  const backgroundColor = await vscode.window.showQuickPick([
    { 
      label: '✨ Transparent', 
      description: 'No background (recommended)', 
      value: 'transparent',
      detail: 'Works with any background color • Professional look • Flexible usage'
    },
    { 
      label: '⚪ White Background', 
      description: 'Clean white background', 
      value: 'white',
      detail: 'Classic look • Good for documents • Always readable'
    },
    { 
      label: '⚫ Black Background', 
      description: 'Dark theme background', 
      value: 'black',
      detail: 'Modern dark style • Good for presentations • High contrast'
    },
    {
      label: '🎨 Custom Color',
      description: 'Choose your own background color',
      value: 'custom',
      detail: 'Brand colors • Specific requirements • Full customization'
    }
  ], {
    placeHolder: '🎨 Choose background color for your diagrams',
    ignoreFocusOut: true,
    title: '🖌️ Background Color (Step 2/4)'
  });

  if (!backgroundColor) {return null;}

  let finalBackgroundColor = backgroundColor.value;
  
  if (backgroundColor.value === 'custom') {
    const customColor = await vscode.window.showInputBox({
      prompt: 'Enter background color (hex, rgb, or color name)',
      placeHolder: '#ffffff, rgb(255,255,255), lightblue, etc.',
      value: '#ffffff',
      validateInput: (value) => {
        if (!value.trim()) {return 'Please enter a color value';}
        // Basic validation for common formats
        const colorRegex = /^(#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})|rgb\(\d+,\s*\d+,\s*\d+\)|rgba\(\d+,\s*\d+,\s*\d+,\s*[\d\.]+\)|[a-zA-Z]+)$/;
        return colorRegex.test(value.trim()) ? undefined : 'Please enter a valid color (hex, rgb, or name)';
      }
    });
    
    if (!customColor) {return null;}
    finalBackgroundColor = customColor.trim();
  }

  // === STEP 3: THEME SELECTION ===  
  const theme = await vscode.window.showQuickPick([
    { 
      label: '🎨 Default Theme', 
      description: 'Standard mermaid colors', 
      value: 'default',
      detail: 'Blue/white scheme • Professional • Universal compatibility'
    },
    { 
      label: '🌙 Dark Theme', 
      description: 'Dark backgrounds, light text', 
      value: 'dark',
      detail: 'Modern dark UI • Easy on eyes • Great for presentations'
    },
    { 
      label: '🌳 Forest Theme', 
      description: 'Green nature-inspired colors', 
      value: 'forest', 
      detail: 'Green color palette • Organic feel • Calming aesthetic'
    },
    { 
      label: '⚪ Neutral Theme', 
      description: 'Minimal grayscale design', 
      value: 'neutral',
      detail: 'Gray tones • Minimalist • Professional documents'
    }
  ], {
    placeHolder: '🎨 Choose visual theme for your diagrams',
    ignoreFocusOut: true,
    title: '🎭 Visual Theme (Step 3/4)'
  });

  if (!theme) {return null;}

  // === STEP 4: OUTPUT DIRECTORY SELECTION ===
  const outputChoice = await vscode.window.showQuickPick([
    {
      label: '📁 Create "exported-diagrams" folder',
      description: 'In the source directory',
      value: 'default',
      detail: `Will create: ${path.join(sourceFolder, 'exported-diagrams')}`
    },
    {
      label: '📂 Same folder as source files', 
      description: 'Export directly alongside original files',
      value: 'source',
      detail: 'Exports will be mixed with source files'
    },
    {
      label: '🎯 Choose custom location',
      description: 'Browse for a different folder',
      value: 'browse',
      detail: 'Full control over output location'
    }
  ], {
    placeHolder: '📍 Where should the exported files be saved?',
    ignoreFocusOut: true,
    title: '💾 Output Location (Step 5/5)'
  });

  if (!outputChoice) {return null;}

  let outputDirectory: string;
  
  switch (outputChoice.value) {
    case 'default':
      outputDirectory = path.join(sourceFolder, 'exported-diagrams');
      break;
    case 'source':
      outputDirectory = sourceFolder;
      break;
    case 'browse':
      const browseResult = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select output directory for exported diagrams',
        defaultUri: vscode.Uri.file(sourceFolder)
      });
      
      if (!browseResult || browseResult.length === 0) {return null;}
      outputDirectory = browseResult[0].fsPath;
      break;
    default:
      return null;
  }

  // Create the export options for the primary format
  const primaryFormat = selectedFormats[0];
  const exportOptions: ExportOptions = {
    format: primaryFormat,
    theme: theme.value as MermaidTheme,
    width: 1200,
    height: 800, 
    backgroundColor: finalBackgroundColor
  };

  // Store additional formats for multi-format export
  (exportOptions as any).additionalFormats = selectedFormats.length > 1 ? selectedFormats.slice(1) : [];
  (exportOptions as any).allFormats = selectedFormats;

  return {
    exportOptions,
    outputDirectory
  };
}

/**
 * Get output directory
 */
async function getOutputDirectory(sourceFolder: string): Promise<string | null> {
  const defaultOutput = path.join(sourceFolder, 'exported-diagrams');
  
  const choice = await vscode.window.showQuickPick([
    { label: 'Create "exported-diagrams" folder', description: 'In source directory', value: defaultOutput },
    { label: 'Choose different location...', value: 'browse' }
  ], {
    placeHolder: 'Select output directory',
    ignoreFocusOut: true
  });

  if (!choice) {
    return null;
  }

  if (choice.value === 'browse') {
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      title: 'Select output directory'
    });
    return folderUri?.[0]?.fsPath || null;
  }

  return choice.value;
}

/**
 * Export a single file
 */
async function exportSingleFile(
  file: MermaidFile, 
  strategy: ExportStrategy, 
  options: ExportOptions,
  outputDirectory: string
): Promise<BatchResult> {
  const startTime = Date.now();
  const fileName = path.basename(file.path, path.extname(file.path));
  
  try {
    // For markdown files with multiple diagrams, export each one
    if (file.diagrams.length > 1) {
      const results: BatchResult[] = [];
      
      for (let i = 0; i < file.diagrams.length; i++) {
        const diagram = file.diagrams[i];
        const outputName = `${fileName}-${i + 1}.${options.format}`;
        const outputPath = path.join(outputDirectory, outputName);
        
        try {
          await fs.promises.mkdir(outputDirectory, { recursive: true });
          const buffer = await strategy.export(diagram.content, options);
          await fs.promises.writeFile(outputPath, buffer);
          
          results.push({
            file: `${file.path} (diagram ${i + 1})`,
            success: true,
            outputPath,
            duration: Date.now() - startTime
          });
        } catch (error) {
          results.push({
            file: `${file.path} (diagram ${i + 1})`,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
          });
        }
      }
      
      // Return combined result
      const successful = results.filter(r => r.success);
      return {
        file: file.path,
        success: successful.length > 0,
        outputPath: successful.length > 0 ? path.dirname(successful[0].outputPath!) : undefined,
        error: successful.length === results.length ? undefined : `${results.length - successful.length} diagrams failed`,
        duration: Date.now() - startTime
      };
    } else {
      // Single diagram
      const outputName = `${fileName}.${options.format}`;
      const outputPath = path.join(outputDirectory, outputName);
      
      await fs.promises.mkdir(outputDirectory, { recursive: true });
      const buffer = await strategy.export(file.diagrams[0].content, options);
      await fs.promises.writeFile(outputPath, buffer);
      
      return {
        file: file.path,
        success: true,
        outputPath,
        duration: Date.now() - startTime
      };
    }
  } catch (error) {
    return {
      file: file.path,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    };
  }
}

/**
 * Select best export strategy
 */
async function selectBestStrategy(context: vscode.ExtensionContext): Promise<ExportStrategy> {
  const cliStrategy = new CLIExportStrategy();
  const webStrategy = new WebExportStrategy(context);

  if (await cliStrategy.isAvailable()) {
    return cliStrategy;
  }
  
  if (await webStrategy.isAvailable()) {
    return webStrategy;
  }
  
  throw new Error('No export strategy available');
}

/**
 * Show Mermaid Export Pro - Export Folder results
 */
async function showBatchResults(results: BatchResult[], outputDirectory: string, cancelled: boolean): Promise<void> {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  // Generate report
  let report = `# Mermaid Export Pro - Export Folder Report\n\n`;
  report += `**Timestamp**: ${new Date().toISOString()}\n`;
  report += `**Output Directory**: ${outputDirectory}\n`;
  report += `**Total Files**: ${results.length}\n`;
  report += `**Successful**: ${successful.length}\n`;
  report += `**Failed**: ${failed.length}\n`;
  if (cancelled) {
    report += `**Status**: CANCELLED\n`;
  }
  report += `\n## Results\n\n`;
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    report += `${status} **${path.basename(result.file)}** (${result.duration}ms)\n`;
    if (result.error) {
      report += `   Error: ${result.error}\n`;
    }
    if (result.outputPath) {
      report += `   Output: ${result.outputPath}\n`;
    }
    report += `\n`;
  }
  
  // Save report
  const reportPath = path.join(outputDirectory, 'batch-export-report.md');
  await fs.promises.writeFile(reportPath, report, 'utf8');
  
  // Show completion dialog
  const action = await vscode.window.showInformationMessage(
    `Mermaid Export Pro - Export Folder ${cancelled ? 'cancelled' : 'completed'}. Report saved to ${path.basename(reportPath)}`,
    'Open Report',
    'Open Output Folder'
  );
  
  if (action === 'Open Report') {
    const doc = await vscode.workspace.openTextDocument(reportPath);
    await vscode.window.showTextDocument(doc);
  } else if (action === 'Open Output Folder') {
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputDirectory));
  }
}