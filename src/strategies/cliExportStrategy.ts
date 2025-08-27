


import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { ExportStrategy, ExportOptions, MermaidExportError } from '../types';
import { PathUtils } from '../utils/pathUtils';
import { ErrorHandler } from '../ui/errorHandler';

export class CLIExportStrategy implements ExportStrategy {
  readonly name = 'CLI Export Strategy';
  private readonly cliCommand = 'mmdc';

  async export(content: string, options: ExportOptions): Promise<Buffer> {
    const tempInputPath = PathUtils.createTempFilePath('mmd');
    const tempOutputPath = PathUtils.createTempFilePath(options.format);

    try {
      // Write content to temporary file
      await fs.promises.writeFile(tempInputPath, content, 'utf8');

      // Build CLI arguments
      const args = await this.buildCliArguments(tempInputPath, tempOutputPath, options);

      // Execute CLI command
      const buffer = await this.executeCli(args, tempOutputPath);

      ErrorHandler.logInfo(`Successfully exported using CLI strategy: ${options.format}`);
      return buffer;

    } catch (error) {
      throw new MermaidExportError(
        ErrorHandler.createErrorInfo(
          'CLI_EXPORT_FAILED',
          `Failed to export using CLI: ${error instanceof Error ? error.message : 'Unknown error'}`,
          undefined,
          'Install CLI'
        ),
        error instanceof Error ? error : undefined
      );
    } finally {
      // Cleanup temporary files
      await this.cleanup([tempInputPath, tempOutputPath]);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if mmdc command is available
      await this.executeCli(['--version'], undefined, 5000);
      return true;
    } catch (error) {
      ErrorHandler.logWarning('Mermaid CLI not available: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  }

  getRequiredDependencies(): string[] {
    return ['@mermaid-js/mermaid-cli'];
  }

  /**
   * Try to find system Chrome installation for Puppeteer
   */
  private findSystemChrome(): string | undefined {
    if (process.platform === 'win32') {
      const possiblePaths = [
        'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
        'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
        'C:\\\\Users\\\\' + process.env.USERNAME + '\\\\AppData\\\\Local\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
        'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
        'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe'
      ];
      
      for (const chromePath of possiblePaths) {
        try {
          if (fs.existsSync(chromePath)) {
            return chromePath;
          }
        } catch {
          // Continue checking other paths
        }
      }
    }
    return undefined;
  }

  private async buildCliArguments(inputPath: string, outputPath: string, options: ExportOptions): Promise<string[]> {
    const args = [
      '--input', inputPath,
      '--output', outputPath
    ];

    // Add theme
    if (options.theme && options.theme !== 'default') {
      args.push('--theme', options.theme);
    }

    // Add dimensions
    if (options.width) {
      args.push('--width', options.width.toString());
    }
    if (options.height) {
      args.push('--height', options.height.toString());
    }

    // Add background color (including transparent)
    if (options.backgroundColor) {
      args.push('--backgroundColor', options.backgroundColor);
    }

    // Add custom CSS file
    if (options.cssFile && await PathUtils.fileExists(options.cssFile)) {
      args.push('--cssFile', options.cssFile);
    }

    // Add config file
    if (options.configFile && await PathUtils.fileExists(options.configFile)) {
      args.push('--configFile', options.configFile);
    }

    // Format-specific options
    switch (options.format) {
      case 'pdf':
        args.push('--pdfFit');
        break;
      case 'png':
      case 'webp':
        // PNG and WebP specific options can be added here
        break;
    }

    return args;
  }

  private async executeCli(args: string[], outputPath?: string, timeout = 30000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Windows-specific spawn options to handle EFTYPE error
      const spawnOptions = {
        stdio: ['pipe', 'pipe', 'pipe'] as any,
        shell: process.platform === 'win32',
        timeout,
        // Add Windows-specific environment variables
        env: {
          ...process.env,
          // Force Puppeteer to use system Chrome if available
          PUPPETEER_EXECUTABLE_PATH: this.findSystemChrome(),
          // Disable Puppeteer sandbox on Windows
          PUPPETEER_ARGS: '--no-sandbox --disable-setuid-sandbox'
        }
      };

      const childProcess = spawn(this.cliCommand, args, spawnOptions);

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', async (code) => {
        if (code === 0) {
          if (outputPath) {
            try {
              const buffer = await fs.promises.readFile(outputPath);
              resolve(buffer);
            } catch (error) {
              reject(new Error(`Failed to read output file: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          } else {
            // For version check or other commands that don't produce files
            resolve(Buffer.from(stdout));
          }
        } else {
          const errorMessage = stderr || stdout || `Process exited with code ${code}`;
          reject(new Error(errorMessage));
        }
      });

      childProcess.on('error', (error) => {
        if (error.message.includes('ENOENT')) {
          reject(new Error('Mermaid CLI not found. Please install @mermaid-js/mermaid-cli'));
        } else if (error.message.includes('EFTYPE') || error.message.includes('spawn')) {
          reject(new Error('Puppeteer/Chromium launch failed. Try installing Chrome or setting PUPPETEER_EXECUTABLE_PATH'));
        } else {
          reject(error);
        }
      });

      // Handle timeout
      const timeoutHandle = setTimeout(() => {
        childProcess.kill();
        reject(new Error('CLI command timed out'));
      }, timeout);

      childProcess.on('close', () => {
        clearTimeout(timeoutHandle);
      });
    });
  }

  private async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (await PathUtils.fileExists(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (error) {
        ErrorHandler.logWarning(`Failed to cleanup temporary file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Tests the CLI with a simple diagram
   */
  async testCli(): Promise<boolean> {
    const testDiagram = `
graph TD
    A[Test] --> B[Success]
`;

    try {
      await this.export(testDiagram, {
        format: 'svg',
        theme: 'default'
      });
      return true;
    } catch (error) {
      ErrorHandler.logWarning(`CLI test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Gets CLI version information
   */
  async getVersion(): Promise<string> {
    try {
      const buffer = await this.executeCli(['--version'], undefined, 5000);
      return buffer.toString().trim();
    } catch (error) {
      throw new Error(`Failed to get CLI version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
