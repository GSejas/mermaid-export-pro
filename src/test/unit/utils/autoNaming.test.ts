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

  describe('generateFileName with naming modes', () => {
    it('defaults to versioned mode when mode not specified', async () => {
      vi.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined as any);
      vi.spyOn(fs.promises, 'readdir').mockResolvedValueOnce([]);

      const result = await AutoNaming.generateFileName({
        baseName: 'diagram',
        format: 'svg',
        content: 'graph TD; A-->B',
        outputDirectory: '/test'
      });

      // Should generate versioned name: diagram-01-xxxxxxxx.svg
      // Use path.sep for cross-platform compatibility
      expect(result).toContain('diagram-01-');
      expect(result).toMatch(/diagram-01-[a-f0-9]{8}\.svg$/);
    });

    it('generates versioned name when mode=versioned', async () => {
      vi.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined as any);
      vi.spyOn(fs.promises, 'readdir').mockResolvedValueOnce([]);

      const result = await AutoNaming.generateFileName({
        baseName: 'diagram',
        format: 'svg',
        content: 'graph TD; A-->B',
        outputDirectory: '/test',
        mode: 'versioned'
      });

      expect(result).toContain('diagram-01-');
      expect(result).toMatch(/diagram-01-[a-f0-9]{8}\.svg$/);
    });

    it('generates simple overwrite name when mode=overwrite', async () => {
      const result = await AutoNaming.generateFileName({
        baseName: 'diagram1',
        format: 'svg',
        content: 'graph TD; A-->B',
        outputDirectory: '/test',
        mode: 'overwrite'
      });

      // Should generate simple name: diagram1.svg
      expect(path.basename(result)).toBe('diagram1.svg');
      expect(result).toContain('test');
    });

    it('overwrite mode extracts diagram number from baseName', async () => {
      const result = await AutoNaming.generateFileName({
        baseName: 'architecture-flow2',
        format: 'png',
        content: 'graph TD; A-->B',
        outputDirectory: '/output',
        mode: 'overwrite'
      });

      // Should extract number 2 and clean base name
      expect(path.basename(result)).toBe('architecture-flow2.png');
      expect(result).toContain('output');
    });

    it('overwrite mode defaults to 1 when no number in baseName', async () => {
      const result = await AutoNaming.generateFileName({
        baseName: 'diagram',
        format: 'svg',
        content: 'graph TD; A-->B',
        outputDirectory: '/test',
        mode: 'overwrite'
      });

      expect(path.basename(result)).toBe('diagram1.svg');
    });

    it('overwrite mode handles different formats', async () => {
      const result = await AutoNaming.generateFileName({
        baseName: 'diagram3',
        format: 'pdf',
        content: 'graph TD; A-->B',
        outputDirectory: '/docs',
        mode: 'overwrite'
      });

      expect(path.basename(result)).toBe('diagram3.pdf');
    });

    it('overwrite mode produces consistent names for same input', async () => {
      const options = {
        baseName: 'flow1',
        format: 'svg' as const,
        content: 'graph TD; A-->B',
        outputDirectory: '/test',
        mode: 'overwrite' as const
      };

      const result1 = await AutoNaming.generateFileName(options);
      const result2 = await AutoNaming.generateFileName(options);

      // Same input should produce same filename (ideal for overwrites)
      expect(result1).toBe(result2);
      expect(path.basename(result1)).toBe('flow1.svg');
    });
  });
});
