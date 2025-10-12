"use strict";
/**
 * Implements the `ExportStrategy` interface by utilizing the `@mermaid-js/mermaid-cli` (mmdc)
 * command-line tool. This strategy is designed for server-side or environments where spawning
 * child processes is permissible.
 *
 * The export process involves the following steps:
 * 1. A temporary input file with the Mermaid diagram content is created.
 * 2. A temporary output file path is generated based on the desired format.
 * 3. The `mmdc` command is invoked as a child process, with arguments constructed from the
 *    provided `ExportOptions` (e.g., theme, dimensions, background color).
 * 4. The CLI tool reads the input file and writes the converted diagram to the output file.
 * 5. The content of the output file is read into a `Buffer` and returned.
 * 6. Both temporary files are cleaned up, regardless of whether the export succeeded or failed.
 *
 * This approach is particularly robust for complex diagrams and is the required method for
 * generating PDF outputs. It also includes platform-specific optimizations, such as attempting
 * to locate a system-installed Chrome/Edge on Windows to avoid issues with bundled Puppeteer/Chromium
 * installations.
 *
 * @implements {ExportStrategy}
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIExportStrategy = void 0;
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
const errorHandler_1 = require("../ui/errorHandler");
/**
 * Implements the `ExportStrategy` interface using the `@mermaid-js/mermaid-cli` (mmdc) command-line tool.
 *
 * This strategy works by writing the Mermaid diagram content to a temporary file
 * and then invoking the `mmdc` executable as a separate process to perform the conversion.
 * It is suitable for environments where spawning child processes is allowed and can be more
 * robust for complex diagrams or specific output formats like PDF.
 *
 * @implements {ExportStrategy}
 */
class CLIExportStrategy {
    name = 'CLI Export Strategy';
    cliCommand = 'mmdc';
    async export(content, options) {
        const tempInputPath = pathUtils_1.PathUtils.createTempFilePath('mmd');
        const tempOutputPath = pathUtils_1.PathUtils.createTempFilePath(options.format);
        try {
            // Write content to temporary file
            await fs.promises.writeFile(tempInputPath, content, 'utf8');
            // Build CLI arguments
            const args = await this.buildCliArguments(tempInputPath, tempOutputPath, options);
            // Execute CLI command
            const buffer = await this.executeCli(args, tempOutputPath);
            errorHandler_1.ErrorHandler.logInfo(`Successfully exported using CLI strategy: ${options.format}`);
            return buffer;
        }
        catch (error) {
            throw new types_1.MermaidExportError(errorHandler_1.ErrorHandler.createErrorInfo('CLI_EXPORT_FAILED', `Failed to export using CLI: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, 'Install CLI'), error instanceof Error ? error : undefined);
        }
        finally {
            // Cleanup temporary files
            await this.cleanup([tempInputPath, tempOutputPath]);
        }
    }
    async isAvailable() {
        try {
            // Check if mmdc command is available
            await this.executeCli(['--version'], undefined, 5000);
            return true;
        }
        catch (error) {
            errorHandler_1.ErrorHandler.logWarning('Mermaid CLI not available: ' + (error instanceof Error ? error.message : 'Unknown error'));
            return false;
        }
    }
    getRequiredDependencies() {
        return ['@mermaid-js/mermaid-cli'];
    }
    /**
     * Try to find system Chrome installation for Puppeteer
     */
    findSystemChrome() {
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
                }
                catch {
                    // Continue checking other paths
                }
            }
        }
        return undefined;
    }
    async buildCliArguments(inputPath, outputPath, options) {
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
        if (options.backgroundColor !== undefined) {
            if (options.backgroundColor === '' || options.backgroundColor === 'transparent') {
                errorHandler_1.ErrorHandler.logInfo(`CLI Export: Setting transparent background (original: "${options.backgroundColor}")`);
                args.push('--backgroundColor', 'transparent');
            }
            else {
                errorHandler_1.ErrorHandler.logInfo(`CLI Export: Setting background color: "${options.backgroundColor}"`);
                args.push('--backgroundColor', options.backgroundColor);
            }
        }
        else {
            errorHandler_1.ErrorHandler.logInfo('CLI Export: No background color specified (undefined)');
        }
        // Add custom CSS file
        if (options.cssFile && await pathUtils_1.PathUtils.fileExists(options.cssFile)) {
            args.push('--cssFile', options.cssFile);
        }
        // Add config file
        if (options.configFile && await pathUtils_1.PathUtils.fileExists(options.configFile)) {
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
        errorHandler_1.ErrorHandler.logInfo(`CLI Export: Complete command args: ${this.cliCommand} ${args.join(' ')}`);
        return args;
    }
    async executeCli(args, outputPath, timeout = 30000) {
        return new Promise((resolve, reject) => {
            // Windows-specific spawn options to handle EFTYPE error
            const spawnOptions = {
                stdio: ['pipe', 'pipe', 'pipe'],
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
            const childProcess = (0, child_process_1.spawn)(this.cliCommand, args, spawnOptions);
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
                        }
                        catch (error) {
                            reject(new Error(`Failed to read output file: ${error instanceof Error ? error.message : 'Unknown error'}`));
                        }
                    }
                    else {
                        // For version check or other commands that don't produce files
                        resolve(Buffer.from(stdout));
                    }
                }
                else {
                    const errorMessage = stderr || stdout || `Process exited with code ${code}`;
                    reject(new Error(errorMessage));
                }
            });
            childProcess.on('error', (error) => {
                if (error.message.includes('ENOENT')) {
                    reject(new Error('Mermaid CLI not found. Please install @mermaid-js/mermaid-cli'));
                }
                else if (error.message.includes('EFTYPE') || error.message.includes('spawn')) {
                    reject(new Error('Puppeteer/Chromium launch failed. Try installing Chrome or setting PUPPETEER_EXECUTABLE_PATH'));
                }
                else {
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
    async cleanup(filePaths) {
        for (const filePath of filePaths) {
            try {
                if (await pathUtils_1.PathUtils.fileExists(filePath)) {
                    await fs.promises.unlink(filePath);
                }
            }
            catch (error) {
                errorHandler_1.ErrorHandler.logWarning(`Failed to cleanup temporary file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    /**
     * Tests the CLI with a simple diagram
     */
    async testCli() {
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
        }
        catch (error) {
            errorHandler_1.ErrorHandler.logWarning(`CLI test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
    /**
     * Gets CLI version information
     */
    async getVersion() {
        try {
            const buffer = await this.executeCli(['--version'], undefined, 5000);
            return buffer.toString().trim();
        }
        catch (error) {
            throw new Error(`Failed to get CLI version: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.CLIExportStrategy = CLIExportStrategy;
//# sourceMappingURL=cliExportStrategy.js.map