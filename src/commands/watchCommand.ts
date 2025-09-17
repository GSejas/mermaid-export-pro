/**
 * Auto Export Watch Command - Smart auto-export on file save
 * 
 * Purpose: Automatically export all mermaid diagrams when files are saved
 * Features:
 * - Watches .mmd, .md, and .markdown files
 * - Exports ALL diagrams in a file (with numbered suffixes for multiple)
 * - Uses smart format preferences (file-specific > most-used > default)
 * - Always uses current theme setting
 * - Configurable output directory
 * - Toggle on/off with workspace persistence
 * 
 * Architecture:
 * - Singleton AutoExportWatcher class manages file watching
 * - Integrates with FormatPreferenceManager for smart format selection
 * - Uses best available export strategy (CLI > Web)
 * - Provides subtle progress feedback and success notifications
 * 
 * Author: Claude/Jorge
 * Version: 1.0.4
 * Date: 2025-08-27
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { ErrorHandler } from '../ui/errorHandler';
import { ExportOptions, ExportStrategy, ExportFormat, MermaidTheme } from '../types';
import { FormatPreferenceManager } from '../services/formatPreferenceManager';

/**
 * Auto Export Watcher - Singleton class for managing automatic export on save
 * 
 * Responsibilities:
 * - File system watching for mermaid-related file changes
 * - Smart format preference management
 * - Multi-diagram export coordination
 * - Progress and success feedback
 * - Workspace configuration persistence
 */
class AutoExportWatcher {
  private static instance: AutoExportWatcher;
  private fileWatcher: vscode.Disposable | null = null;
  private isEnabled = false;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    // Initialize state based on configuration setting
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    const configEnabled = config.get<boolean>('autoExport', false);
    
    console.log(`[AutoExport] Initializing watcher - Config setting: ${configEnabled}`);
    
    if (configEnabled) {
      // If config says enabled, set up the file watcher
      this.isEnabled = true;
      this.setupFileWatcher();
      console.log(`[AutoExport] Watcher initialized and enabled`);
    } else {
      this.isEnabled = false;
      console.log(`[AutoExport] Watcher initialized but disabled`);
    }
  }

  static getInstance(context: vscode.ExtensionContext): AutoExportWatcher {
    if (!AutoExportWatcher.instance) {
      AutoExportWatcher.instance = new AutoExportWatcher(context);
    }
    return AutoExportWatcher.instance;
  }

  private setupFileWatcher(): void {
    if (this.fileWatcher) {
      return; // Already set up
    }
    
    this.fileWatcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
      await this.handleFileSave(document);
    });
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
      console.log(`[AutoExport] Enable called but already enabled`);
      return;
    }

    try {
      console.log(`[AutoExport] Enabling auto export...`);
      
      // Get configuration
      const config = vscode.workspace.getConfiguration('mermaidExportPro');
      
      // Set up file watcher
      this.setupFileWatcher();

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
      console.log(`[AutoExport] Disable called but already disabled`);
      return;
    }

    try {
      console.log(`[AutoExport] Disabling auto export...`);
      
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

      // Get export options with smart format selection
      const config = vscode.workspace.getConfiguration('mermaidExportPro');
      const formatPreferenceManager = new FormatPreferenceManager(this.context);
      
      // Try to use last format for this file, then most used format, then default
      let format: ExportFormat;
      const fileFormatPreference = await formatPreferenceManager.getFileFormatPreference(document.fileName);
      if (fileFormatPreference) {
        format = fileFormatPreference;
        ErrorHandler.logInfo(`Using last used format for this file: ${format}`);
      } else {
        format = await formatPreferenceManager.getMostUsedFormat();
        ErrorHandler.logInfo(`Using most used format: ${format}`);
      }

      const exportOptions: ExportOptions = {
        format,
        theme: config.get<MermaidTheme>('theme') || 'default', // Always use current theme
        width: config.get<number>('width') || 800,
        height: config.get<number>('height') || 600,
        backgroundColor: config.get<string>('backgroundColor') || 'transparent'
      };

      // Select strategy and export
      const strategy = await this.selectBestStrategy();
      
      // Show brief progress indication
      const exportedPaths: string[] = [];
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        title: `Auto-exporting ${mermaidContent.length} diagram${mermaidContent.length > 1 ? 's' : ''} from ${path.basename(document.fileName)}...`,
        cancellable: false
      }, async () => {
        // Export each diagram with numbered suffix if multiple
        for (let i = 0; i < mermaidContent.length; i++) {
          const content = mermaidContent[i];
          
          // Generate unique output path for each diagram
          const outputDirectory = config.get<string>('outputDirectory') || '';
          const outputPath = await this.generateOutputPath(
            document.fileName, 
            exportOptions.format, 
            outputDirectory,
            mermaidContent.length > 1 ? i + 1 : undefined
          );
          
          const buffer = await strategy.export(content, exportOptions);
          await vscode.workspace.fs.writeFile(vscode.Uri.file(outputPath), buffer);
          exportedPaths.push(outputPath);
        }
      });

      // Show subtle success notification
      const message = mermaidContent.length === 1 
        ? `✅ Exported ${path.basename(exportedPaths[0])}`
        : `✅ Exported ${mermaidContent.length} diagrams`;
      vscode.window.setStatusBarMessage(message, 3000);
      ErrorHandler.logInfo(`Auto-export completed: ${exportedPaths.join(', ')}`);

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

  private async generateOutputPath(inputPath: string, format: ExportFormat, outputDirectory: string, diagramNumber?: number): Promise<string> {
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputFileName = diagramNumber 
      ? `${fileName}-${diagramNumber}.${format}`
      : `${fileName}.${format}`;

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
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    const configEnabled = config.get<boolean>('autoExport', false);
    
    console.log(`[AutoExport] State check - Watcher: ${this.isEnabled}, Config: ${configEnabled}, FileWatcher: ${!!this.fileWatcher}`);
    
    // If states are out of sync, log a warning
    if (this.isEnabled !== configEnabled) {
      console.warn(`[AutoExport] State mismatch! Watcher: ${this.isEnabled}, Config: ${configEnabled}`);
    }
    
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