/**
 * Mermaid Export Pro - Batch Export Command
 * 
 * Purpose: Export multiple mermaid files from folders/workspaces
 * Author: Claude Code Assistant
 * Date: 2025-08-24
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { ErrorHandler } from '../ui/errorHandler';
import { ExportOptions, ExportFormat, MermaidTheme, ExportStrategy, MermaidFile } from '../types';

interface BatchResult {
  file: string;
  success: boolean;
  outputPath?: string;
  error?: string;
  duration: number;
}

export async function runBatchExport(context: vscode.ExtensionContext): Promise<void> {
  ErrorHandler.logInfo('Starting batch export command...');

  try {
    // Get target folder
    const targetFolder = await getTargetFolder();
    if (!targetFolder) {
      return; // User cancelled
    }

    // Discover mermaid files
    const mermaidFiles = await discoverMermaidFiles(targetFolder);
    if (mermaidFiles.length === 0) {
      vscode.window.showInformationMessage(`No mermaid files found in ${path.basename(targetFolder)}`);
      return;
    }

    ErrorHandler.logInfo(`Found ${mermaidFiles.length} mermaid files to export`);

    // Get export options
    const exportOptions = await getBatchExportOptions();
    if (!exportOptions) {
      return; // User cancelled
    }

    // Get output directory
    const outputDirectory = await getOutputDirectory(targetFolder);
    if (!outputDirectory) {
      return; // User cancelled
    }

    exportOptions.outputPath = outputDirectory;

    // Confirm batch operation
    const proceed = await vscode.window.showWarningMessage(
      `Export ${mermaidFiles.length} files to ${exportOptions.format.toUpperCase()} in ${path.basename(outputDirectory)}?`,
      { modal: true },
      'Export All',
      'Cancel'
    );

    if (proceed !== 'Export All') {
      return;
    }

    // Run batch export
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Batch exporting ${mermaidFiles.length} files...`,
      cancellable: true
    }, async (progress, token) => {
      const results: BatchResult[] = [];
      const strategy = await selectBestStrategy(context);
      
      ErrorHandler.logInfo(`Using ${strategy.name} for batch export`);
      
      let completed = 0;
      const total = mermaidFiles.length;
      
      for (const file of mermaidFiles) {
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
          `Batch export completed successfully! ${successful.length} files exported.`
        );
      } else {
        vscode.window.showWarningMessage(
          `Batch export completed with ${failed.length} failures. ${successful.length} files exported successfully.`
        );
      }
    });

  } catch (error) {
    ErrorHandler.logError(`Batch export failed: ${error}`);
    vscode.window.showErrorMessage(`Batch export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get target folder for batch export
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
 * Discover all mermaid files in directory
 */
async function discoverMermaidFiles(directory: string): Promise<MermaidFile[]> {
  const mermaidFiles: MermaidFile[] = [];
  
  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDirectory(fullPath);
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
 * Get batch export options
 */
async function getBatchExportOptions(): Promise<ExportOptions | null> {
  // Get format
  const format = await vscode.window.showQuickPick([
    { label: 'SVG', description: 'Scalable Vector Graphics (best quality)', value: 'svg' },
    { label: 'PNG', description: 'Portable Network Graphics (raster)', value: 'png' },
    { label: 'JPG', description: 'JPEG image (compressed)', value: 'jpg' },
    { label: 'PDF', description: 'Portable Document Format', value: 'pdf' }
  ], {
    placeHolder: 'Select export format for all files',
    ignoreFocusOut: true
  });

  if (!format) {
    return null;
  }

  // Get theme
  const theme = await vscode.window.showQuickPick([
    { label: 'Default', description: 'Default mermaid theme', value: 'default' },
    { label: 'Dark', description: 'Dark theme', value: 'dark' },
    { label: 'Forest', description: 'Green forest theme', value: 'forest' },
    { label: 'Neutral', description: 'Neutral gray theme', value: 'neutral' }
  ], {
    placeHolder: 'Select theme for all exports',
    ignoreFocusOut: true
  });

  if (!theme) {
    return null;
  }

  return {
    format: format.value as ExportFormat,
    theme: theme.value as MermaidTheme,
    width: 1200,
    height: 800,
    backgroundColor: 'white'
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
 * Show batch export results
 */
async function showBatchResults(results: BatchResult[], outputDirectory: string, cancelled: boolean): Promise<void> {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  // Generate report
  let report = `# Batch Export Report\n\n`;
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
    `Batch export ${cancelled ? 'cancelled' : 'completed'}. Report saved to ${path.basename(reportPath)}`,
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