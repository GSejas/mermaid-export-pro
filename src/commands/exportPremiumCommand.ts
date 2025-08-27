/**
 * Premium Export Command - Enhanced visual exports with professional styling
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { VisualEnhancementManager, VisualEnhancementOptions } from '../services/visualEnhancementManager';
import { ErrorHandler } from '../ui/errorHandler';
import { ExportOptions } from '../types';

export async function runPremiumExport(context: vscode.ExtensionContext): Promise<void> {
  const enhancementManager = new VisualEnhancementManager(context);
  const webExportStrategy = new WebExportStrategy(context);
  
  try {
    // Get active text editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      await vscode.window.showErrorMessage('No active editor found. Please open a Mermaid file.');
      return;
    }

    const document = editor.document;
    const content = document.getText();

    // Validate mermaid content
    if (!content.trim()) {
      await vscode.window.showErrorMessage('Current file is empty.');
      return;
    }

    // Show premium styling options
    const selectedStyle = await showPremiumStylePicker(enhancementManager);
    if (!selectedStyle) {
      return; // User cancelled
    }

    // Get enhancement options
    const enhancementOptions: VisualEnhancementOptions = {
      enabled: true,
      style: selectedStyle as any,
      animations: false, // For static exports
      customPalette: true,
      typography: 'premium',
      effects: 'subtle',
      iconSet: 'feather'
    };

    // Show export options
    const exportOptions = await showPremiumExportOptions(document.fileName);
    if (!exportOptions) {
      return; // User cancelled
    }

    // Apply visual enhancements to export options
    const enhancedExportOptions = enhancementManager.enhanceExportOptions({
      ...exportOptions,
      mermaidConfig: {}
    });

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Premium Export (${selectedStyle} style)`,
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Preparing premium export...' });

      try {
        // Export with enhanced options
        progress.report({ increment: 30, message: 'Rendering diagram...' });
        const buffer = await webExportStrategy.export(content, enhancedExportOptions);

        // For SVG exports, apply post-processing enhancements
        if (enhancedExportOptions.format === 'svg') {
          progress.report({ increment: 60, message: 'Applying visual enhancements...' });
          const svgContent = buffer.toString('utf-8');
          const enhancedSvg = await enhancementManager.postProcessSvg(svgContent, enhancementOptions);
          const finalBuffer = Buffer.from(enhancedSvg, 'utf-8');
          
          progress.report({ increment: 90, message: 'Saving enhanced export...' });
          await fs.promises.writeFile(enhancedExportOptions.outputPath!, finalBuffer);
        } else {
          progress.report({ increment: 90, message: 'Saving export...' });
          await fs.promises.writeFile(enhancedExportOptions.outputPath!, buffer);
        }

        progress.report({ increment: 100, message: 'Premium export completed!' });

        // Show completion message with options
        const result = await vscode.window.showInformationMessage(
          `✨ Premium export completed! Style: ${selectedStyle}`,
          'Open File',
          'Show in Explorer',
          'Export Another Style'
        );

        if (result === 'Open File') {
          const doc = await vscode.workspace.openTextDocument(enhancedExportOptions.outputPath!);
          await vscode.window.showTextDocument(doc);
        } else if (result === 'Show in Explorer') {
          await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(enhancedExportOptions.outputPath!));
        } else if (result === 'Export Another Style') {
          // Re-run the command
          await runPremiumExport(context);
        }

      } catch (error) {
        progress.report({ increment: 100, message: 'Export failed' });
        throw error;
      }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    ErrorHandler.logError(`Premium export failed: ${errorMsg}`);
    await vscode.window.showErrorMessage(`Premium export failed: ${errorMsg}`);
  }
}

async function showPremiumStylePicker(enhancementManager: VisualEnhancementManager): Promise<string | undefined> {
  const themePacks = enhancementManager.getAvailableThemePacks();
  
  const quickPickItems = themePacks.map(pack => ({
    label: `${getStyleIcon(pack.name)} ${pack.name}`,
    description: pack.description,
    detail: pack.preview,
    value: pack.name.toLowerCase()
  }));

  const selected = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: 'Choose a premium style for your export',
    title: '✨ Premium Visual Styles',
    ignoreFocusOut: true
  });

  return selected?.value;
}

async function showPremiumExportOptions(fileName: string): Promise<ExportOptions | undefined> {
  // Format selection
  const formatItems = [
    { label: '🖼️ SVG', description: 'Vector graphics (recommended for premium effects)', value: 'svg' },
    { label: '🖨️ PNG', description: 'High-quality raster image', value: 'png' },
    { label: '📊 JPG', description: 'Compressed raster image', value: 'jpg' },
    { label: '📄 PDF', description: 'Print-ready document (requires CLI)', value: 'pdf' }
  ];

  const selectedFormat = await vscode.window.showQuickPick(formatItems, {
    placeHolder: 'Select export format',
    title: 'Export Format'
  });

  if (!selectedFormat) return undefined;

  // Size options for premium exports
  const sizeItems = [
    { label: '📱 Small (800×600)', value: { width: 800, height: 600 } },
    { label: '💻 Medium (1200×900)', value: { width: 1200, height: 900 } },
    { label: '🖥️ Large (1600×1200)', value: { width: 1600, height: 1200 } },
    { label: '📺 XL (2400×1800)', value: { width: 2400, height: 1800 } },
    { label: '🎯 Custom', value: 'custom' }
  ];

  const selectedSize = await vscode.window.showQuickPick(sizeItems, {
    placeHolder: 'Select export dimensions',
    title: 'Export Size'
  });

  if (!selectedSize) return undefined;

  let width = 1200, height = 900;
  
  if (selectedSize.value === 'custom') {
    const widthInput = await vscode.window.showInputBox({
      prompt: 'Enter width in pixels',
      value: '1200',
      validateInput: (value) => {
        const num = parseInt(value);
        return isNaN(num) || num < 100 || num > 8000 ? 'Width must be between 100 and 8000 pixels' : undefined;
      }
    });
    
    if (!widthInput) return undefined;
    
    const heightInput = await vscode.window.showInputBox({
      prompt: 'Enter height in pixels',
      value: '900',
      validateInput: (value) => {
        const num = parseInt(value);
        return isNaN(num) || num < 100 || num > 8000 ? 'Height must be between 100 and 8000 pixels' : undefined;
      }
    });
    
    if (!heightInput) return undefined;
    
    width = parseInt(widthInput);
    height = parseInt(heightInput);
  } else if (typeof selectedSize.value === 'object') {
    width = selectedSize.value.width;
    height = selectedSize.value.height;
  }

  // Generate output path
  const baseName = path.basename(fileName, path.extname(fileName));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const outputFileName = `${baseName}_premium_${timestamp}.${selectedFormat.value}`;
  
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const outputPath = workspaceFolder 
    ? path.join(workspaceFolder, outputFileName)
    : path.join(path.dirname(fileName), outputFileName);

  return {
    format: selectedFormat.value as any,
    outputPath,
    width,
    height,
    theme: 'default', // Will be overridden by enhancement manager
    backgroundColor: 'transparent'
  };
}

function getStyleIcon(styleName: string): string {
  const icons: { [key: string]: string } = {
    'Modern': '🎨',
    'Corporate': '💼',
    'Artistic': '🎭',
    'Minimal': '⚪',
    'Sketch': '✏️'
  };
  
  return icons[styleName] || '✨';
}