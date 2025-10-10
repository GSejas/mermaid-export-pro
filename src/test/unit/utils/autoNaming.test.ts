import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { AutoNaming } from '../../../utils/autoNaming';

describe('AutoNaming', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generateDialogName returns baseName-diagram.format', () => {
    expect(AutoNaming.generateDialogName('architecture', 'svg')).toBe('architecture-diagram.svg');
  });

  it('getBaseName cleans filename and lowers case', () => {
    const res = AutoNaming.getBaseName('C:/My Stuff/Design Diagram (v1).mmd');
    // implementation preserves parentheses content but normalizes characters
    expect(res).toBe('design-diagram-(v1)');
  });

  it('validateDirectory returns valid true for writable directory', async () => {
    const statSpy = vi.spyOn(fs.promises, 'stat').mockResolvedValueOnce({ isDirectory: () => true } as any);
    const writeSpy = vi.spyOn(fs.promises, 'writeFile').mockResolvedValueOnce(undefined as any);
    const unlinkSpy = vi.spyOn(fs.promises, 'unlink').mockResolvedValueOnce(undefined as any);

    const result = await AutoNaming.validateDirectory('some-dir');
    expect(result.valid).toBe(true);
    expect(statSpy).toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalled();
    expect(unlinkSpy).toHaveBeenCalled();
  });

  it('validateDirectory handles ENOENT error', async () => {
    const err: any = new Error('no');
    err.code = 'ENOENT';
    vi.spyOn(fs.promises, 'stat').mockRejectedValueOnce(err);

    const result = await AutoNaming.validateDirectory('missing');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Directory does not exist');
  });

  it('ensureDirectory creates when missing', async () => {
    vi.spyOn(fs.promises, 'access').mockRejectedValueOnce(new Error('no'));
    const mkdirSpy = vi.spyOn(fs.promises, 'mkdir').mockResolvedValueOnce(undefined as any);

    await AutoNaming.ensureDirectory('new-dir');
    expect(mkdirSpy).toHaveBeenCalledWith('new-dir', { recursive: true });
  });
});
