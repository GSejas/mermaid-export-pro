import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sinon from 'sinon';
import { CLIExportStrategy } from '../../../strategies/cliExportStrategy';
import { PathUtils } from '../../../utils/pathUtils';
import * as fs from 'fs';

describe('CLIExportStrategy', () => {
  let strategy: CLIExportStrategy;

  beforeEach(() => {
    strategy = new CLIExportStrategy();
  });

  afterEach(() => {
  sinon.restore();
  vi.restoreAllMocks();
  });

  it('getRequiredDependencies returns expected package', () => {
    expect(strategy.getRequiredDependencies()).toEqual(['@mermaid-js/mermaid-cli']);
  });

  it('isAvailable returns true when executeCli resolves', async () => {
    const stub = sinon.stub(strategy as any, 'executeCli').resolves(Buffer.from('v1.2.3'));
    const available = await strategy.isAvailable();
    expect(available).toBe(true);
    sinon.assert.calledOnce(stub);
  });

  it('isAvailable returns false when executeCli rejects', async () => {
    sinon.stub(strategy as any, 'executeCli').rejects(new Error('ENOENT'));
    const available = await strategy.isAvailable();
    expect(available).toBe(false);
  });

  it('getVersion returns trimmed version string', async () => {
    sinon.stub(strategy as any, 'executeCli').resolves(Buffer.from('  1.2.3\n'));
    const version = await strategy.getVersion();
    expect(version).toBe('1.2.3');
  });

  it('testCli returns false when export throws', async () => {
    sinon.stub(strategy as any, 'export').rejects(new Error('export failed'));
    const res = await strategy.testCli();
    expect(res).toBe(false);
  });

  it('buildCliArguments includes theme/dimensions/background and files', async () => {
    // Arrange
  const stubExists = vi.spyOn(PathUtils as any, 'fileExists').mockImplementation(async (p: string) => true);

    // Act
    const args = await (strategy as any).buildCliArguments('/in.mmd', '/out.png', {
      format: 'png',
      theme: 'dark',
      width: 800,
      height: 600,
      backgroundColor: 'transparent',
      cssFile: '/some.css',
      configFile: '/some.config'
    });

    // Assert
    expect(args).toContain('--input');
    expect(args).toContain('/in.mmd');
    expect(args).toContain('--output');
    expect(args).toContain('/out.png');
    expect(args).toContain('--theme');
    expect(args).toContain('dark');
    expect(args).toContain('--width');
    expect(args).toContain('800');
    expect(args).toContain('--height');
    expect(args).toContain('--backgroundColor');
    expect(args).toContain('transparent');
    expect(args).toContain('--cssFile');
    expect(args).toContain('/some.css');
    expect(args).toContain('--configFile');
    expect(args).toContain('/some.config');

    stubExists.mockRestore();
  });

  it('export writes temp files, calls executeCli and returns buffer on success', async () => {
    // Arrange - control temp paths
  vi.spyOn(PathUtils as any, 'createTempFilePath').mockImplementationOnce(() => '/tmp/in.mmd').mockImplementationOnce(() => '/tmp/out.svg');
  const writeSpy = vi.spyOn(fs.promises as any, 'writeFile').mockResolvedValue(undefined);

    const fakeBuffer = Buffer.from('OUTPUT');
    // Stub internal methods
    vi.spyOn(strategy as any, 'buildCliArguments' as any).mockResolvedValue(['--input', '/tmp/in.mmd']);
    vi.spyOn(strategy as any, 'executeCli' as any).mockResolvedValue(fakeBuffer);

    // Ensure cleanup will attempt unlink; mock fileExists and unlink
  vi.spyOn(PathUtils as any, 'fileExists').mockResolvedValue(true);
  const unlinkSpy = vi.spyOn(fs.promises as any, 'unlink').mockResolvedValue(undefined);

    // Act
    const result = await strategy.export('graph TD\nA-->B', { format: 'svg', theme: 'default' } as any);

    // Assert
    expect(result).toEqual(fakeBuffer);
    expect(writeSpy).toHaveBeenCalledWith('/tmp/in.mmd', 'graph TD\nA-->B', 'utf8');
    expect(unlinkSpy).toHaveBeenCalled();
  });

  it('export throws MermaidExportError when executeCli fails', async () => {
  vi.spyOn(PathUtils as any, 'createTempFilePath').mockImplementationOnce(() => '/tmp/in2.mmd').mockImplementationOnce(() => '/tmp/out2.svg');
  vi.spyOn(fs.promises as any, 'writeFile').mockResolvedValue(undefined);
  vi.spyOn(strategy as any, 'buildCliArguments' as any).mockResolvedValue(['--input', '/tmp/in2.mmd']);
  vi.spyOn(strategy as any, 'executeCli' as any).mockRejectedValue(new Error('cli fail'));
  vi.spyOn(PathUtils as any, 'fileExists').mockResolvedValue(false);

    await expect(strategy.export('x', { format: 'svg', theme: 'default' } as any)).rejects.toThrow();
  });
});
