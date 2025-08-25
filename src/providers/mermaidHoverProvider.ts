/**
 * Mermaid Export Pro - Hover Provider for Markdown Files
 * 
 * Purpose: Show export actions and diagram info on hover over mermaid blocks
 * Author: Claude Code Assistant
 * Date: 2025-08-24
 */

import * as vscode from 'vscode';

export class MermaidHoverProvider implements vscode.HoverProvider {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
    if (token.isCancellationRequested) {
      return undefined;
    }

    // Only process markdown files
    if (document.languageId !== 'markdown') {
      return undefined;
    }

    // Check if position is inside a mermaid block
    const mermaidBlock = this.findMermaidBlockAtPosition(document, position);
    if (!mermaidBlock) {
      return undefined;
    }

    // Create hover content
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true; // Enable command links
    markdown.supportHtml = true;

    // Add diagram type and info
    markdown.appendMarkdown(`**🧜‍♀️ Mermaid ${this.capitalizeFirst(mermaidBlock.type)} Diagram**\n\n`);
    
    if (mermaidBlock.content.split('\n').length > 1) {
      markdown.appendMarkdown(`📊 **Lines**: ${mermaidBlock.content.split('\n').length}  \n`);
    }
    
    // Add export actions
    markdown.appendMarkdown('**Export Options:**\n\n');
    
    const baseArgs = encodeURIComponent(JSON.stringify({
      uri: document.uri.toString(),
      startLine: mermaidBlock.range.start.line,
      endLine: mermaidBlock.range.end.line
    }));
    
    // Create command links for different formats
    const exportCommands = [
      { format: 'svg', icon: '📄', description: 'Vector graphics (best quality)' },
      { format: 'png', icon: '🖼️', description: 'Raster image with transparency' },
      { format: 'jpg', icon: '📷', description: 'Compressed image' },
      { format: 'pdf', icon: '📋', description: 'PDF document' }
    ];

    for (const cmd of exportCommands) {
      const commandUri = `command:mermaidExportPro.exportMarkdownBlock?${baseArgs}&format=${cmd.format}`;
      markdown.appendMarkdown(`${cmd.icon} [Export as ${cmd.format.toUpperCase()}](${commandUri}) - ${cmd.description}  \n`);
    }

    // Add preview of diagram content (first few lines)
    const preview = mermaidBlock.content.split('\n').slice(0, 3).join('\n');
    if (preview !== mermaidBlock.content) {
      markdown.appendMarkdown(`\n**Preview:**\n\`\`\`mermaid\n${preview}\n...\n\`\`\`\n`);
    } else {
      markdown.appendMarkdown(`\n**Content:**\n\`\`\`mermaid\n${preview}\n\`\`\`\n`);
    }

    return new vscode.Hover(markdown, mermaidBlock.range);
  }

  private findMermaidBlockAtPosition(document: vscode.TextDocument, position: vscode.Position): { content: string; range: vscode.Range; type: string } | null {
    const text = document.getText();
    const lines = text.split('\n');

    let inMermaidBlock = false;
    let startLine = -1;
    let endLine = -1;
    let mermaidContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '```mermaid') {
        inMermaidBlock = true;
        startLine = i;
        mermaidContent = [];
      } else if (line === '```' && inMermaidBlock) {
        inMermaidBlock = false;
        endLine = i;
        
        // Check if position is within this block
        if (position.line >= startLine && position.line <= endLine) {
          const diagramContent = mermaidContent.join('\n').trim();
          if (diagramContent) {
            const range = new vscode.Range(
              new vscode.Position(startLine, 0),
              new vscode.Position(endLine, lines[endLine].length)
            );

            return {
              content: diagramContent,
              range,
              type: this.detectDiagramType(diagramContent)
            };
          }
        }
      } else if (inMermaidBlock) {
        mermaidContent.push(lines[i]);
      }
    }

    return null;
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
      return 'entity-relationship';
    }
    if (firstLine.includes('journey')) {
      return 'user journey';
    }
    if (firstLine.includes('gantt')) {
      return 'gantt chart';
    }
    if (firstLine.includes('pie')) {
      return 'pie chart';
    }
    if (firstLine.includes('gitgraph')) {
      return 'git graph';
    }
    if (firstLine.includes('mindmap')) {
      return 'mind map';
    }
    
    return 'diagram';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}