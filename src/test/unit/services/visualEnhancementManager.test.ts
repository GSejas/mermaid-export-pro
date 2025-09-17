import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { VisualEnhancementManager } from '../../../services/visualEnhancementManager';

describe('VisualEnhancementManager', () => {
  it('returns default options when no config is set', () => {
  // stub workspace configuration to return an object with a 'get' method
  vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({ get: (key?: string, def?: any) => def } as any);

  const manager = new VisualEnhancementManager({} as any);
    const opts = manager.getEnhancementOptions();

    expect(opts.enabled).toBe(false);
    expect(opts.style).toBe('default');
  });

  it('enhanceExportOptions returns base options unchanged when disabled', () => {
  vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({ get: (key?: string, def?: any) => def } as any);
  const manager = new VisualEnhancementManager({} as any);

    const base = { format: 'svg' } as any;
    const enhanced = manager.enhanceExportOptions(base);

    expect(enhanced).toBe(base);
  });

  it('postProcessSvg applies processors when enabled', async () => {
    // create a manager and stub getThemePack to return a simple processor
    const manager = new VisualEnhancementManager({} as any);
    vi.spyOn(manager as any, 'getThemePack').mockReturnValue({
      postProcessors: [
        { name: 'test', process: (s: string) => s.replace('A', 'B') }
      ],
    } as any);

    const out = await manager.postProcessSvg('<svg>A</svg>', { enabled: true, style: 'modern', animations: false, customPalette: false, typography: 'default', effects: 'none', iconSet: 'default' } as any);
    expect(out).toContain('B');
  });
});
