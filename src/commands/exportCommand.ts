/**
 * Mermaid Export Pro - Main Export Command
 * 
 * Purpose: Export current mermaid file or active selection to various formats
 * Author: Claude Code Assistant
 * Date: 2025-08-24
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { ErrorHandler } from '../ui/errorHandler';
import { ExportOptions, ExportFormat, MermaidTheme, ExportStrategy } from '../types';

export async function runExportCommand(context: vscode.ExtensionContext): Promise<void> {
  ErrorHandler.logInfo('Starting export command...');

  try {
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

    // Get output path
    const outputPath = await getOutputPath(document, exportOptions.format);
    if (!outputPath) {
      return; // User cancelled
    }

    exportOptions.outputPath = outputPath;

    // Select strategy and export
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Exporting to ${exportOptions.format.toUpperCase()}...`,
      cancellable: false
    }, async (progress) => {
      try {
        progress.report({ message: 'Selecting export strategy...' });
        
        const strategy = await selectBestStrategy(context);
        ErrorHandler.logInfo(`Using strategy: ${strategy.name}`);
        
        progress.report({ message: `Exporting with ${strategy.name}...` });
        
        const buffer = await strategy.export(mermaidContent, exportOptions);
        
        progress.report({ message: 'Saving file...' });
        
        await fs.promises.writeFile(outputPath, buffer);
        
        const stats = await fs.promises.stat(outputPath);
        ErrorHandler.logInfo(`Export completed: ${outputPath} (${stats.size} bytes)`);
        
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
    const mermaidMatch = fullText.match(/```mermaid\n([\s\S]*?)\n```/);
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
    backgroundColor: 'white'
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

  const result = await vscode.window.showSaveDialog({
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