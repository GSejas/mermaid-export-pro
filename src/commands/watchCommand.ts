/**
 * Mermaid Export Pro - Auto Export Watch Command
 * 
 * Purpose: Toggle auto-export on save functionality
 * Author: Claude Code Assistant
 * Date: 2025-08-24
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { ErrorHandler } from '../ui/errorHandler';
import { ExportOptions, ExportStrategy, ExportFormat, MermaidTheme } from '../types';

class AutoExportWatcher {
  private static instance: AutoExportWatcher;
  private fileWatcher: vscode.Disposable | null = null;
  private isEnabled = false;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  static getInstance(context: vscode.ExtensionContext): AutoExportWatcher {
    if (!AutoExportWatcher.instance) {
      AutoExportWatcher.instance = new AutoExportWatcher(context);
    }
    return AutoExportWatcher.instance;
  }

  async toggle(): Promise<void> {
    if (this.isEnabled) {
      await this.disable();
    } else {
      await this.enable();
    }
  }

  private async enable(): Promise<void> {
    if (this.isEnabled) {
      return;
    }

    try {
      // Get configuration
      const config = vscode.workspace.getConfiguration('mermaidExportPro');
      
      // Set up file watcher
      this.fileWatcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
        await this.handleFileSave(document);
      });

      this.isEnabled = true;
      
      // Update configuration
      await config.update('autoExport', true, vscode.ConfigurationTarget.Workspace);
      
      vscode.window.showInformationMessage(
        'Auto-export enabled! Mermaid files will be exported automatically on save.',
        'Configure Settings'
      ).then(action => {
        if (action === 'Configure Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
        }
      });

      ErrorHandler.logInfo('Auto-export watcher enabled');

    } catch (error) {
      ErrorHandler.logError(`Failed to enable auto-export: ${error}`);
      vscode.window.showErrorMessage(`Failed to enable auto-export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async disable(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
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
      ErrorHandler.logInfo('Auto-export watcher disabled');

    } catch (error) {
      ErrorHandler.logError(`Failed to disable auto-export: ${error}`);
      vscode.window.showErrorMessage(`Failed to disable auto-export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleFileSave(document: vscode.TextDocument): Promise<void> {
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

      ErrorHandler.logInfo(`Auto-export triggered for ${path.basename(document.fileName)}`);

      // Get export options from configuration
      const config = vscode.workspace.getConfiguration('mermaidExportPro');
      const exportOptions: ExportOptions = {
        format: config.get<ExportFormat>('defaultFormat') || 'png',
        theme: config.get<MermaidTheme>('theme') || 'default',
        width: config.get<number>('width') || 800,
        height: config.get<number>('height') || 600,
        backgroundColor: config.get<string>('backgroundColor') || 'transparent'
      };

      // Determine output path
      const outputDirectory = config.get<string>('outputDirectory') || '';
      const outputPath = await this.generateOutputPath(document.fileName, exportOptions.format, outputDirectory);

      exportOptions.outputPath = path.dirname(outputPath);

      // Select strategy and export
      const strategy = await this.selectBestStrategy();
      
      // Show brief progress indication
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        title: `Auto-exporting ${path.basename(document.fileName)}...`,
        cancellable: false
      }, async () => {
        for (const content of mermaidContent) {
          const buffer = await strategy.export(content, exportOptions);
          await vscode.workspace.fs.writeFile(vscode.Uri.file(outputPath), buffer);
        }
      });

      // Show subtle success notification
      vscode.window.setStatusBarMessage(`✅ Exported ${path.basename(outputPath)}`, 3000);
      ErrorHandler.logInfo(`Auto-export completed: ${outputPath}`);

    } catch (error) {
      ErrorHandler.logError(`Auto-export failed: ${error}`);
      vscode.window.showWarningMessage(`Auto-export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractMermaidContent(document: vscode.TextDocument): Promise<string[]> {
    const fileName = document.fileName.toLowerCase();
    const content = document.getText();

    if (fileName.endsWith('.mmd')) {
      // Pure mermaid file
      return [content.trim()];
    }

    // Extract from markdown
    const mermaidBlocks: string[] = [];
    const lines = content.split('\n');
    
    let inMermaidBlock = false;
    let mermaidContent: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '```mermaid') {
        inMermaidBlock = true;
        mermaidContent = [];
      } else if (line === '```' && inMermaidBlock) {
        inMermaidBlock = false;
        const diagramContent = mermaidContent.join('\n').trim();
        if (diagramContent) {
          mermaidBlocks.push(diagramContent);
        }
      } else if (inMermaidBlock) {
        mermaidContent.push(lines[i]);
      }
    }
    
    return mermaidBlocks;
  }

  private async generateOutputPath(inputPath: string, format: ExportFormat, outputDirectory: string): Promise<string> {
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputFileName = `${fileName}.${format}`;

    if (outputDirectory) {
      // Use configured output directory
      if (path.isAbsolute(outputDirectory)) {
        return path.join(outputDirectory, outputFileName);
      } else {
        // Relative to input file directory
        const inputDir = path.dirname(inputPath);
        return path.join(inputDir, outputDirectory, outputFileName);
      }
    } else {
      // Same directory as input file
      const inputDir = path.dirname(inputPath);
      return path.join(inputDir, outputFileName);
    }
  }

  private async selectBestStrategy(): Promise<ExportStrategy> {
    const cliStrategy = new CLIExportStrategy();
    const webStrategy = new WebExportStrategy(this.context);

    if (await cliStrategy.isAvailable()) {
      return cliStrategy;
    }
    
    if (await webStrategy.isAvailable()) {
      return webStrategy;
    }
    
    throw new Error('No export strategy available');
  }

  isAutoExportEnabled(): boolean {
    return this.isEnabled;
  }

  dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }
}

export async function toggleAutoExport(context: vscode.ExtensionContext): Promise<void> {
  const watcher = AutoExportWatcher.getInstance(context);
  await watcher.toggle();
}

export async function initializeAutoExport(context: vscode.ExtensionContext): Promise<void> {
  // Check if auto-export was previously enabled
  const config = vscode.workspace.getConfiguration('mermaidExportPro');
  const isAutoExportEnabled = config.get<boolean>('autoExport', false);
  
  if (isAutoExportEnabled) {
    const watcher = AutoExportWatcher.getInstance(context);
    await watcher.toggle(); // This will enable it
  }
}

export function isAutoExportEnabled(context: vscode.ExtensionContext): boolean {
  const watcher = AutoExportWatcher.getInstance(context);
  return watcher.isAutoExportEnabled();
}

export function disposeAutoExport(): void {
  // Access through getInstance to avoid private property access
  const instance = (AutoExportWatcher as any).instance;
  if (instance) {
    instance.dispose();
  }
}