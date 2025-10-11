import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PathUtils } from '../../../utils/pathUtils';

describe('PathUtils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generateOutputPath uses same directory when outputDir not provided', () => {
    const input = path.join('project', 'docs', 'diagram.mmd');
    const out = PathUtils.generateOutputPath(input, 'png');
    expect(out).toBe(path.join(path.parse(input).dir, 'diagram.png'));
  });

  it('generateOutputPath resolves relative outputDir against input file dir', () => {
    const input = path.join('project', 'diagrams', 'file.mmd');
    const out = PathUtils.generateOutputPath(input, 'svg', 'out');
    expect(out).toBe(path.join(path.parse(input).dir, 'out', 'file.svg'));
  });

  it('ensureDirectory does not call mkdir when access succeeds', async () => {
    const accessSpy = vi.spyOn(fs.promises, 'access').mockResolvedValueOnce();
    const mkdirSpy = vi.spyOn(fs.promises, 'mkdir').mockResolvedValueOnce(undefined as any);

    await PathUtils.ensureDirectory('some-dir');

    expect(accessSpy).toHaveBeenCalled();
    expect(mkdirSpy).not.toHaveBeenCalled();
  });

  it('ensureDirectory calls mkdir when access throws', async () => {
    vi.spyOn(fs.promises, 'access').mockRejectedValueOnce(new Error('nope'));
    const mkdirSpy = vi.spyOn(fs.promises, 'mkdir').mockResolvedValueOnce(undefined as any);

    await PathUtils.ensureDirectory('missing-dir');

    expect(mkdirSpy).toHaveBeenCalledWith('missing-dir', { recursive: true });
  });

  it('sanitizePath normalizes safe path and throws on traversal', () => {
    const safe = 'folder/child/file.mmd';
    const normalized = PathUtils.sanitizePath(safe);
    expect(normalized).toBe(path.normalize(safe));

    expect(() => PathUtils.sanitizePath('../outside/file')).toThrow(/Path traversal/);
  });

  it('fileExists returns true when access succeeds and false when it throws', async () => {
    vi.spyOn(fs.promises, 'access').mockResolvedValueOnce();
    expect(await PathUtils.fileExists('exists')).toBe(true);

    vi.spyOn(fs.promises, 'access').mockRejectedValueOnce(new Error('nope'));
    expect(await PathUtils.fileExists('missing')).toBe(false);
  });

  it('getUniqueFilePath returns same path when not existing', async () => {
    const spy = vi.spyOn(PathUtils, 'fileExists').mockResolvedValueOnce(false);
    const target = path.join('tmp', 'a.png');
    const result = await PathUtils.getUniqueFilePath(target);
    expect(spy).toHaveBeenCalled();
    expect(result).toBe(target);
  });

  it('getUniqueFilePath increments filename when target exists', async () => {
    const target = path.join('tmp', 'file.png');
    const mock = vi.spyOn(PathUtils, 'fileExists')
      .mockResolvedValueOnce(true) // target exists
      .mockResolvedValueOnce(true) // file (1) exists
      .mockResolvedValueOnce(false); // file (2) does not

    const result = await PathUtils.getUniqueFilePath(target);
    expect(mock).toHaveBeenCalled();
    expect(result).toBe(path.join(path.parse(target).dir, `${path.parse(target).name} (2)${path.parse(target).ext}`));
  });

  it('getTempDirectory and createTempFilePath produce a path in tmpdir with given extension', () => {
    const tmp = PathUtils.getTempDirectory();
    expect(tmp).toBe(os.tmpdir());

    const file = PathUtils.createTempFilePath('png');
    expect(path.extname(file)).toBe('.png');
    expect(file.startsWith(tmp) || file.includes(tmp)).toBeTruthy();
  });

  it('validateOutputPath rejects invalid characters and overly long paths', () => {
    // use a relative/portable path (function treats Windows drive-colon as invalid)
    expect(PathUtils.validateOutputPath('some/good/path')).toBe(true);
    expect(PathUtils.validateOutputPath('inva*lid.txt')).toBe(false);

    const long = 'a'.repeat(300);
    expect(PathUtils.validateOutputPath(long)).toBe(false);
  });

  it('getDisplayPath returns relative when shorter and inside workspace', () => {
    const workspace = path.join('project');
    const full = path.join(workspace, 'sub', 'file.mmd');
    const disp = PathUtils.getDisplayPath(full, workspace);
    expect(disp).toBe(path.relative(workspace, full));

    const outside = path.join('other', 'file.mmd');
    expect(PathUtils.getDisplayPath(outside, workspace)).toBe(outside);
  });
});
