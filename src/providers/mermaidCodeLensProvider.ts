/**
 * Mermaid Export Pro - CodeLens Provider for Markdown Files
 * 
 * Purpose: Show export actions above mermaid code blocks in markdown files
 * Author: Claude/Jorge
 * Date: 2025-08-24
 */

import * as vscode from 'vscode';
import { FormatPreferenceManager } from '../services/formatPreferenceManager';
import { ExportFormat } from '../types';

interface MermaidBlock {
  content: string;
  range: vscode.Range;
  type: string;
}

export class MermaidCodeLensProvider implements vscode.CodeLensProvider {
  private context: vscode.ExtensionContext;
  private formatPreferenceManager: FormatPreferenceManager;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.formatPreferenceManager = new FormatPreferenceManager(context);
  console.log('[mermaidExportPro] MermaidCodeLensProvider constructed');
  }

  async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
    if (token.isCancellationRequested) {
      return [];
    }

    // Only process markdown files
    if (document.languageId !== 'markdown') {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const mermaidBlocks = this.findMermaidBlocks(document);

    for (const block of mermaidBlocks) {
      // Get adaptive format ordering based on user preferences
      const [topFormat, secondFormat] = await this.formatPreferenceManager.getTopTwoFormats();
      
      // Format display mapping
      const formatIcons: Record<ExportFormat, string> = {
        svg: '$(file-media)',
        png: '$(device-camera)', 
  jpg: '$(file-zip)',
  jpeg: '$(file-zip)',
        pdf: '$(file-pdf)',
        webp: '$(globe)'
      };

      const formatLabels: Record<ExportFormat, string> = {
        svg: 'SVG',
        png: 'PNG',
  jpg: 'JPG', 
  jpeg: 'JPEG',
        pdf: 'PDF',
        webp: 'WebP'
      };

      // Adaptive export commands - top 2 formats + More Options
      const exportCommands = [
        {
          title: `${formatIcons[topFormat]} Export ${formatLabels[topFormat]}`,
          command: 'mermaidExportPro.exportMarkdownBlock',
          arguments: [document.uri, block.range, topFormat]
        },
        {
          title: `${formatIcons[secondFormat]} Export ${formatLabels[secondFormat]}`,
          command: 'mermaidExportPro.exportMarkdownBlock', 
          arguments: [document.uri, block.range, secondFormat]
        },
        {
          title: '$(gear) More Options',
          command: 'mermaidExportPro.showExportOptions',
          arguments: [document.uri, block.range]
        }
      ];

      // Create CodeLens for each option
      exportCommands.forEach((cmd, index) => {
        // Position CodeLens slightly offset so they appear side by side
        const range = new vscode.Range(
          block.range.start.line,
          block.range.start.character + (index * 18),
          block.range.start.line,
          block.range.start.character + (index * 18) + 12
        );

        codeLenses.push(new vscode.CodeLens(range, cmd));
      });
    }

    return codeLenses;
  }

  resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens {
    // CodeLens is already resolved in provideCodeLenses
    return codeLens;
  }

  private findMermaidBlocks(document: vscode.TextDocument): MermaidBlock[] {
    const blocks: MermaidBlock[] = [];
    const text = document.getText();
    const lines = text.split('\n');

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
          const range = new vscode.Range(
            new vscode.Position(startLine, 0),
            new vscode.Position(i, lines[i].length)
          );

          blocks.push({
            content: diagramContent,
            range,
            type: this.detectDiagramType(diagramContent)
          });
        }
      } else if (inMermaidBlock) {
        mermaidContent.push(lines[i]);
      }
    }

    return blocks;
  }

  private detectDiagramType(content: string): string {
    const firstLine = content.trim().split('\n')[0].toLowerCase();
    
    if (firstLine.includes('flowchart') || firstLine.includes('graph')) {
      return 'flowchart';
    }
    if (firstLine.includes('sequencediagram')) {
      return 'sequence';
    }
    if (firstLine.includes('classdiagram')) {
      return 'class';
    }
    if (firstLine.includes('statediagram')) {
      return 'state';
    }
    if (firstLine.includes('erdiagram')) {
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
}