import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { MermaidCodeLensProvider } from '../../../providers/mermaidCodeLensProvider';

describe('MermaidCodeLensProvider', () => {
  it('returns no CodeLenses for non-markdown documents', async () => {
    const context: any = { subscriptions: [] };
    const provider = new MermaidCodeLensProvider(context);

    const doc: any = {
      languageId: 'plaintext',
      getText: () => 'no mermaid here'
    };

    const lenses = await provider.provideCodeLenses(doc as unknown as vscode.TextDocument, { isCancellationRequested: false } as any);
    expect(lenses.length).toBe(0);
  });

  it('detects mermaid blocks and returns CodeLenses', async () => {
    const context: any = { subscriptions: [] };
    const provider = new MermaidCodeLensProvider(context);

    // Ensure minimal Position/Range constructors exist on the vscode mock used in tests
    if (!(vscode as any).Position) {
      (vscode as any).Position = class Position { line: number; character: number; constructor(line: number, character: number) { this.line = line; this.character = character; } };
    }
    if (!(vscode as any).Range) {
      (vscode as any).Range = class Range { start: any; end: any; constructor(start: any, end: any) { this.start = start; this.end = end; } };
    }
    if (!(vscode as any).CodeLens) {
      (vscode as any).CodeLens = class CodeLens { constructor(public range: any, public command?: any) {} };
    }

  const md = '# Title\n\n' + '```mermaid\nflowchart LR\nA-->B\n```\n';
    const doc: any = {
      languageId: 'markdown',
      getText: () => md
    };

    // Stub preference manager to return predictable top formats
    vi.spyOn((provider as any).formatPreferenceManager, 'getTopTwoFormats').mockResolvedValue(['png', 'svg']);

    const lenses = await provider.provideCodeLenses(doc as unknown as vscode.TextDocument, { isCancellationRequested: false } as any);
    expect(lenses.length).toBeGreaterThanOrEqual(3);

    // Verify one of the CodeLens commands is exportMarkdownBlock
    const hasExport = lenses.some(l => (l.command && l.command.command === 'mermaidExportPro.exportMarkdownBlock') || false);
    expect(hasExport).toBe(true);
  });
});
