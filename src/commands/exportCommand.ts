/**
 * Mermaid Export Pro - Main Export Command
 * 
 * Purpose: Export current mermaid file or active selection to various formats
 * Author: Claude/Jorge
 * Date: 2025-08-24
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { ErrorHandler } from '../ui/errorHandler';
import { ExportOptions, ExportFormat, MermaidTheme, ExportStrategy } from '../types';
import { AutoNaming } from '../utils/autoNaming';
import { FormatPreferenceManager } from '../services/formatPreferenceManager';
import { OperationTimeoutManager } from '../services/operationTimeoutManager';
import { getDialogService } from '../services/dialogService';

export async function runExportCommand(context: vscode.ExtensionContext, preferAuto = false, documentUri?: vscode.Uri): Promise<void> {
  console.log('[DEBUG exportCommand] Starting export command...');
  console.log('[DEBUG exportCommand] preferAuto:', preferAuto);
  ErrorHandler.logInfo('Starting export command...');

  // Check export throttling
  const timeoutManager = OperationTimeoutManager.getInstance();
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

    ErrorHandler.logInfo(`Found mermaid content: ${mermaidContent.length} characters`);

    // Get export options from user
    const exportOptions = await getExportOptions();
    if (!exportOptions) {
      return; // User cancelled
    }

    // Determine output path. Persist per-file format choice and optionally auto-save.
    const formatPrefManager = new FormatPreferenceManager(context);

    // Persist the user's chosen format for this file
    await formatPrefManager.setFileFormatPreference(document.fileName, exportOptions.format);

    let outputPath: string | null = null;

    console.log('[DEBUG exportCommand] Checking preferAuto flag:', preferAuto);
    if (preferAuto) {
      // Auto-generate smart name next to file (skip save dialog)
      console.log('[DEBUG exportCommand] preferAuto=true, generating smart name...');
      const outputDir = path.dirname(document.fileName);
      outputPath = await AutoNaming.generateSmartName({ baseName: path.basename(document.fileName, path.extname(document.fileName)), format: exportOptions.format, content: mermaidContent, outputDirectory: outputDir });
      console.log('[DEBUG exportCommand] Generated outputPath:', outputPath);
    } else {
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
      const timeoutManager = OperationTimeoutManager.getInstance();
      const operationId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Start timeout monitoring
      timeoutManager.startOperation(
        operationId,
        `Export to ${exportOptions.format.toUpperCase()}`,
        'export',
        progress,
        {
          onSoftTimeout: () => {
            ErrorHandler.logInfo(`Soft timeout warning for export operation`);
          },
          onMediumTimeout: async () => {
            const choice = await vscode.window.showWarningMessage(
              `Export is taking longer than expected (${exportOptions.format.toUpperCase()}). This might indicate:
• Large/complex diagram
• System resource constraints
• CLI tool issues`,
              { modal: false },
              'Keep Waiting (30s more)',
              'Cancel Export',
              'Switch to Web Export'
            );
            
            if (choice === 'Keep Waiting (30s more)') {
              timeoutManager.updateProgress(operationId, 'Continuing export - please wait...');
              return true;
            } else if (choice === 'Switch to Web Export') {
              // Try web strategy as fallback
              timeoutManager.updateProgress(operationId, 'Switching to web export strategy...');
              return true;
            }
            
            return false; // Cancel
          },
          onHardTimeout: async () => {
            ErrorHandler.logError(`Hard timeout: Export operation exceeded maximum time limit`);
            // Force cleanup of any hanging processes
            try {
              // Kill any hanging CLI processes
              if (process.platform === 'win32') {
                require('child_process').exec('taskkill /f /im mmdc.exe /t', () => {});
              } else {
                require('child_process').exec('pkill -f mmdc', () => {});
              }
            } catch (e) {
              // Ignore cleanup errors
            }
          },
          onCleanup: async () => {
            ErrorHandler.logInfo(`Cleaning up export operation ${operationId}`);
          }
        }
      );
      try {
        timeoutManager.updateProgress(operationId, 'Selecting export strategy...');
        
        const strategy = await selectBestStrategy(context);
        ErrorHandler.logInfo(`Using strategy: ${strategy.name}`);
        
        timeoutManager.updateProgress(operationId, `Exporting with ${strategy.name}...`);
        
        const buffer = await strategy.export(mermaidContent, exportOptions);
        
        timeoutManager.updateProgress(operationId, 'Saving file...');
        
        await fs.promises.writeFile(outputPath, buffer);
        
        const stats = await fs.promises.stat(outputPath);
        ErrorHandler.logInfo(`Export completed: ${outputPath} (${stats.size} bytes)`);
        
        // Mark operation as completed
        timeoutManager.completeOperation(operationId);
        
        // Show success message with actions
        const action = await vscode.window.showInformationMessage(
          `Mermaid diagram exported successfully to ${path.basename(outputPath)} (${formatBytes(stats.size)})`,
          'Open File',
          'Show in Explorer',
          'Copy Path'
        );

        if (action === 'Open File') {
          await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(outputPath));
        } else if (action === 'Show in Explorer') {
          await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
        } else if (action === 'Copy Path') {
          await vscode.env.clipboard.writeText(outputPath);
          vscode.window.showInformationMessage('File path copied to clipboard');
        }

      } catch (error) {
        // Cancel timeout monitoring on error
        timeoutManager.cancelOperation(operationId, 'timeout');
        
        const errorMsg = error instanceof Error ? error.message : 'Unknown export error';
        ErrorHandler.logError(`Export failed: ${errorMsg}`);
        vscode.window.showErrorMessage(`Export failed: ${errorMsg}`);
      }
    });

  } catch (error) {
    ErrorHandler.logError(`Export command failed: ${error}`);
    vscode.window.showErrorMessage(`Export command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract mermaid content from document
 */
async function extractMermaidContent(document: vscode.TextDocument, selection: vscode.Selection): Promise<string | null> {
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
function isMermaidSyntax(text: string): boolean {
  const mermaidKeywords = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
    'journey', 'gantt', 'pie', 'gitgraph', 'erDiagram', 'mindmap'
  ];
  
  return mermaidKeywords.some(keyword => text.includes(keyword));
}

/**
 * Clean mermaid content by removing markdown code block markers
 */
function cleanMermaidContent(content: string): string {
  return content
    .replace(/^```mermaid\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
}

/**
 * Get export options from user
 */
async function getExportOptions(): Promise<ExportOptions | null> {
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
    format: format.value as ExportFormat,
    theme: theme.value as MermaidTheme,
    width: 1200,
    height: 800,
    backgroundColor: 'transparent'
  };
}

/**
 * Get output path from user
 */
async function getOutputPath(document: vscode.TextDocument, format: ExportFormat): Promise<string | null> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const defaultName = path.basename(document.fileName, path.extname(document.fileName)) + `.${format}`;
  
  const defaultUri = workspaceFolder 
    ? vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, defaultName))
    : vscode.Uri.file(path.join(path.dirname(document.fileName), defaultName));

  const dialogService = getDialogService();
  const result = await dialogService.showSaveDialog({
    defaultUri,
    filters: {
      [`${format.toUpperCase()} files`]: [format]
    },
    title: `Save ${format.toUpperCase()} file`
  });

  return result?.fsPath || null;
}

/**
 * Select best available export strategy
 */
async function selectBestStrategy(context: vscode.ExtensionContext): Promise<ExportStrategy> {
  const cliStrategy = new CLIExportStrategy();
  const webStrategy = new WebExportStrategy(context);

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
function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}