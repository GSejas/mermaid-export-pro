import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sinon from 'sinon';
import { CLIExportStrategy } from '../../../strategies/cliExportStrategy';
import { PathUtils } from '../../../utils/pathUtils';
import * as fs from 'fs';
import * as vscode from 'vscode';

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

  describe('Font Awesome CSS File Generation', () => {
    it('should generate CSS file with Font Awesome import when fontAwesomeEnabled is true', async () => {
      // Mock config with Font Awesome enabled
      const mockConfig = {
        get: vi.fn((key: string, defaultValue: any) => {
          if (key === 'fontAwesomeEnabled') {return true;}
          if (key === 'customCss') {return [];}
          return defaultValue;
        })
      };
      vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(mockConfig as any);

      // Mock file operations
      const writeSpy = vi.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(PathUtils as any, 'createTempFilePath').mockReturnValue('/tmp/styles.css');
      vi.spyOn(PathUtils as any, 'fileExists').mockResolvedValue(true);

      const args = await (strategy as any).buildCliArguments('/in.mmd', '/out.png', {
        format: 'png',
        theme: 'default'
      });

      // Verify CSS file was created with Font Awesome import
      expect(writeSpy).toHaveBeenCalled();
      const cssContent = writeSpy.mock.calls[0][1] as string;
      expect(cssContent).toContain('@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css")');
      
      // Verify --cssFile flag was added
      expect(args).toContain('--cssFile');
      const cssFileIndex = args.indexOf('--cssFile');
      expect(args[cssFileIndex + 1]).toContain('.css');
    });

    it('should not generate CSS file when fontAwesomeEnabled is false and no customCss', async () => {
      // Mock config with Font Awesome disabled
      const mockConfig = {
        get: vi.fn((key: string, defaultValue: any) => {
          if (key === 'fontAwesomeEnabled') {return false;}
          if (key === 'customCss') {return [];}
          return defaultValue;
        })
      };
      vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(mockConfig as any);

      const writeSpy = vi.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(PathUtils as any, 'fileExists').mockResolvedValue(true);

      const args = await (strategy as any).buildCliArguments('/in.mmd', '/out.png', {
        format: 'png',
        theme: 'default'
      });

      // Verify --cssFile flag was not added
      expect(args).not.toContain('--cssFile');
      
      // writeFile should not have been called for CSS generation
      const cssWrites = writeSpy.mock.calls.filter(call => 
        typeof call[1] === 'string' && call[1].includes('@import')
      );
      expect(cssWrites).toHaveLength(0);
    });

    it('should include custom CSS URLs in generated CSS file', async () => {
      const customUrls = [
        'https://example.com/custom.css',
        'https://cdn.example.com/icons.css'
      ];

      // Mock config with custom CSS
      const mockConfig = {
        get: vi.fn((key: string, defaultValue: any) => {
          if (key === 'fontAwesomeEnabled') {return false;}
          if (key === 'customCss') {return customUrls;}
          return defaultValue;
        })
      };
      vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(mockConfig as any);

      const writeSpy = vi.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(PathUtils as any, 'createTempFilePath').mockReturnValue('/tmp/styles.css');
      vi.spyOn(PathUtils as any, 'fileExists').mockResolvedValue(true);

      await (strategy as any).buildCliArguments('/in.mmd', '/out.png', {
        format: 'png',
        theme: 'default'
      });

      // Verify CSS file includes custom URLs
      const cssContent = writeSpy.mock.calls[0][1] as string;
      expect(cssContent).toContain('@import url("https://example.com/custom.css")');
      expect(cssContent).toContain('@import url("https://cdn.example.com/icons.css")');
    });

    it('should handle file:// protocol custom CSS by inlining content', async () => {
      const fileUrl = 'file:///C:/styles/custom.css';
      const customCssContent = '.custom { color: red; }';

      // Mock config with file:// custom CSS
      const mockConfig = {
        get: vi.fn((key: string, defaultValue: any) => {
          if (key === 'fontAwesomeEnabled') {return false;}
          if (key === 'customCss') {return [fileUrl];}
          return defaultValue;
        })
      };
      vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(mockConfig as any);

      // Mock readFile for custom CSS
      const readSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue(customCssContent as any);
      const writeSpy = vi.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(PathUtils as any, 'createTempFilePath').mockReturnValue('/tmp/styles.css');
      vi.spyOn(PathUtils as any, 'fileExists').mockResolvedValue(true);

      await (strategy as any).buildCliArguments('/in.mmd', '/out.png', {
        format: 'png',
        theme: 'default'
      });

      // Verify file was read - file:// replaced with empty gives /C:/styles/custom.css
      expect(readSpy).toHaveBeenCalledWith('/C:/styles/custom.css', 'utf8');

      // Verify CSS content was inlined (not imported)
      const writeCall = writeSpy.mock.calls.find(call => 
        typeof call[1] === 'string' && call[1].includes('.custom')
      );
      expect(writeCall).toBeDefined();
      const cssContent = writeCall![1] as string;
      expect(cssContent).toContain('.custom { color: red; }');
      expect(cssContent).not.toContain('file://');
    });

    it('should combine Font Awesome and custom CSS in single file', async () => {
      const customUrls = ['https://example.com/custom.css'];

      // Mock config with both Font Awesome and custom CSS
      const mockConfig = {
        get: vi.fn((key: string, defaultValue: any) => {
          if (key === 'fontAwesomeEnabled') {return true;}
          if (key === 'customCss') {return customUrls;}
          return defaultValue;
        })
      };
      vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(mockConfig as any);

      const writeSpy = vi.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(PathUtils as any, 'createTempFilePath').mockReturnValue('/tmp/styles.css');
      vi.spyOn(PathUtils as any, 'fileExists').mockResolvedValue(true);

      await (strategy as any).buildCliArguments('/in.mmd', '/out.png', {
        format: 'png',
        theme: 'default'
      });

      // Verify CSS file includes both Font Awesome and custom CSS
      const cssContent = writeSpy.mock.calls[0][1] as string;
      expect(cssContent).toContain('@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css")');
      expect(cssContent).toContain('@import url("https://example.com/custom.css")');
    });
  });
});
