/**
 * Mermaid Export Pro - Quick Export Command
 * 
 * Purpose: Zero-dialog instant export of all diagrams with default settings
 * Features:
 * - No user dialogs - instant export
 * - Uses default format from config
 * - Auto-generates filenames
 * - Exports ALL diagrams in file by default
 * - Falls back to single diagram if only one exists
 * 
 * Author: Claude/Jorge
 * Version: 1.0.9
 * Date: 2025-10-14
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { ErrorHandler } from '../ui/errorHandler';
import { ExportOptions, ExportFormat, MermaidTheme, ExportStrategy } from '../types';
import { AutoNaming } from '../utils/autoNaming';
import { OperationTimeoutManager } from '../services/operationTimeoutManager';
import { ConfigManager } from '../services/configManager';
import { extractAllMermaidDiagrams } from './exportAllCommand';
import { TelemetryService } from '../services/telemetryService';

interface DiagramInfo {
  content: string;
  startLine: number;
  endLine: number;
  type: 'mmd' | 'markdown';
}

interface ExportResult {
  success: boolean;
  exported: number;
  failed: number;
  outputs: string[];
  errors: string[];
}

/**
 * Quick Export - Zero dialogs, instant export with defaults
 * Exports ALL diagrams in the file by default
 */
export async function runQuickExportCommand(
  context: vscode.ExtensionContext,
  documentUri?: vscode.Uri,
  telemetryService?: TelemetryService
): Promise<void> {
  ErrorHandler.logInfo('Starting Quick Export (zero dialogs, all diagrams)...');

  // Track start time for telemetry
  const startTime = Date.now();

  // Check export throttling
  const timeoutManager = OperationTimeoutManager.getInstance();
  if (!timeoutManager.canStartExport()) {
    const remainingMs = timeoutManager.getExportCooldownRemaining();
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    vscode.window.showWarningMessage(
      `Please wait ${remainingSeconds}s before starting another export to prevent system overload.`
    );
    return;
  }

  try {
    // Open document if URI provided
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
    
    // Extract all diagrams from the file
    const diagrams = await extractAllMermaidDiagrams(document);
    
    if (diagrams.length === 0) {
      vscode.window.showErrorMessage('No mermaid diagrams found in the current file.');
      return;
    }

    // Get default export options from config (no user interaction)
    const config = new ConfigManager();
    const format = config.getDefaultFormat();
    const theme = config.getTheme();
    const width = config.getDefaultWidth();
    const height = config.getDefaultHeight();
    const backgroundColor = config.getBackgroundColor();

    const exportOptions: ExportOptions = {
      format,
      theme,
      width,
      height,
      backgroundColor
    };

    ErrorHandler.logInfo(`Quick Export: Found ${diagrams.length} diagram(s), format: ${format}, theme: ${theme}`);

    // Export all diagrams
    await exportAllDiagramsQuick(document, diagrams, exportOptions, context, startTime, telemetryService);

  } catch (error) {
    ErrorHandler.logError(`Quick Export failed: ${error}`);
    await ErrorHandler.handleError(
      error instanceof Error ? error : new Error('Quick Export failed'),
      'Quick Export'
    );
  }
}

/**
 * Export all diagrams with zero user interaction
 */
async function exportAllDiagramsQuick(
  document: vscode.TextDocument,
  diagrams: DiagramInfo[],
  exportOptions: ExportOptions,
  context: vscode.ExtensionContext,
  startTime: number,
  telemetryService?: TelemetryService
): Promise<void> {
  const baseName = path.basename(document.fileName, path.extname(document.fileName));
  const outputDir = path.dirname(document.fileName);
  const config = new ConfigManager();
  const namingMode = config.getAutoNamingMode();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Quick Export: ${diagrams.length} diagram(s) to ${exportOptions.format.toUpperCase()}...`,
      cancellable: false
    },
    async (progress) => {
      const timeoutManager = OperationTimeoutManager.getInstance();
      const operationId = `quick-export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Start timeout monitoring
      timeoutManager.startOperation(
        operationId,
        `Quick Export (${diagrams.length} diagrams)`,
        diagrams.length > 1 ? 'batchExport' : 'export',
        progress,
        {
          onSoftTimeout: () => {
            ErrorHandler.logInfo(`Soft timeout warning for Quick Export`);
          },
          onCleanup: async () => {
            ErrorHandler.logInfo(`Cleaning up Quick Export operation ${operationId}`);
          }
        }
      );

      try {
        const strategy = await selectBestStrategy(context);
        const results: ExportResult = {
          success: true,
          exported: 0,
          failed: 0,
          outputs: [],
          errors: []
        };

        // Export each diagram
        for (let i = 0; i < diagrams.length; i++) {
          const diagram = diagrams[i];
          const increment = ((i + 1) / diagrams.length) * 100;

          timeoutManager.updateProgress(
            operationId,
            `Exporting diagram ${i + 1}/${diagrams.length}...`,
            increment
          );

          try {
            // Generate output filename
            let outputName: string;
            if (diagrams.length === 1) {
              // Single diagram - use simple name
              outputName = await AutoNaming.generateFileName({
                baseName,
                format: exportOptions.format,
                content: diagram.content,
                outputDirectory: outputDir,
                mode: namingMode
              });
            } else {
              // Multiple diagrams - add number suffix
              outputName = await AutoNaming.generateFileName({
                baseName: `${baseName}-${i + 1}`,
                format: exportOptions.format,
                content: diagram.content,
                outputDirectory: outputDir,
                mode: namingMode
              });
            }

            // Check if we should skip export (content-aware check)
            const shouldSkip = await AutoNaming.shouldSkipExport(outputName, diagram.content);
            
            if (shouldSkip) {
              // File with same content already exists - skip export
              results.exported++;
              results.outputs.push(outputName);
              ErrorHandler.logInfo(`Quick Export: Reusing existing diagram ${i + 1} → ${path.basename(outputName)} (same content)`);
            } else {
              // Export new or updated diagram
              const buffer = await strategy.export(diagram.content, exportOptions);
              await fs.promises.writeFile(outputName, buffer);

              results.exported++;
              results.outputs.push(outputName);

              // Track successful export in telemetry
              if (telemetryService) {
                const stats = await fs.promises.stat(outputName);
                telemetryService.trackExport(
                  exportOptions.format,
                  strategy.name.toLowerCase().includes('cli') ? 'cli' : 'web',
                  Date.now() - startTime,
                  stats.size,
                  undefined,
                  true
                );
              }

              ErrorHandler.logInfo(`Quick Export: Exported diagram ${i + 1} → ${path.basename(outputName)}`);
            }
          } catch (error) {
            results.failed++;
            const errorMsg = `Diagram ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            results.errors.push(errorMsg);
            ErrorHandler.logError(`Quick Export failed for diagram ${i + 1}: ${error}`);
          }
        }

        // Complete operation
        timeoutManager.completeOperation(operationId);

        // Show results
        await showQuickExportResults(results, diagrams.length);
      } catch (error) {
        timeoutManager.cancelOperation(operationId, 'timeout');
        throw error;
      }
    }
  );
}

/**
 * Show Quick Export results to user
 */
async function showQuickExportResults(results: ExportResult, totalDiagrams: number): Promise<void> {
  if (results.exported === totalDiagrams && results.failed === 0) {
    // All successful
    const message =
      totalDiagrams === 1
        ? `✓ Quick Export successful: ${path.basename(results.outputs[0])}`
        : `✓ Quick Export successful: ${results.exported} diagrams exported`;

    vscode.window.showInformationMessage(message, 'Show Files', 'Copy Paths').then((choice) => {
      if (choice === 'Show Files') {
        // Open first file location
        if (results.outputs.length > 0) {
          vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(results.outputs[0]));
        }
      } else if (choice === 'Copy Paths') {
        const pathsList = results.outputs.join('\n');
        vscode.env.clipboard.writeText(pathsList);
        vscode.window.showInformationMessage('File paths copied to clipboard');
      }
    });
  } else if (results.exported > 0 && results.failed > 0) {
    // Partial success
    vscode.window.showWarningMessage(
      `Quick Export partially successful: ${results.exported} succeeded, ${results.failed} failed`,
      'Show Errors',
      'Show Files'
    ).then((choice) => {
      if (choice === 'Show Errors') {
        const channel = vscode.window.createOutputChannel('Mermaid Export Pro - Quick Export Errors');
        channel.clear();
        channel.appendLine('=== QUICK EXPORT ERRORS ===');
        results.errors.forEach((error) => channel.appendLine(error));
        channel.show();
      } else if (choice === 'Show Files' && results.outputs.length > 0) {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(results.outputs[0]));
      }
    });
  } else {
    // All failed
    vscode.window.showErrorMessage(
      `Quick Export failed: All ${results.failed} diagram(s) failed to export`,
      'Show Errors'
    ).then((choice) => {
      if (choice === 'Show Errors') {
        const channel = vscode.window.createOutputChannel('Mermaid Export Pro - Quick Export Errors');
        channel.clear();
        channel.appendLine('=== QUICK EXPORT ERRORS ===');
        results.errors.forEach((error) => channel.appendLine(error));
        channel.show();
      }
    });
  }
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
