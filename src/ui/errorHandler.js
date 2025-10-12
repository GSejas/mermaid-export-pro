"use strict";
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
exports.ErrorHandler = void 0;
const vscode = __importStar(require("vscode"));
const types_1 = require("../types");
/**
 * Provides a centralized mechanism for handling and logging errors within the VS Code extension.
 *
 * This is a static utility class that manages a dedicated VS Code `OutputChannel` for detailed logging.
 * It differentiates between generic `Error` types and custom `MermaidExportError` to provide
 * tailored user feedback and recovery options. It can display error messages to the user with
 * actionable buttons, such as installing dependencies, opening documentation, or reporting an issue on GitHub.
 *
 * All methods are static, so this class should not be instantiated.
 *
 * @example
 * try {
 *   // Some operation that might fail
 *   throw new Error('Something went wrong');
 * } catch (error) {
 *   if (error instanceof Error) {
 *     ErrorHandler.handleError(error, 'ExportOperation');
 *   }
 * }
 *
 * @see {@link vscode.OutputChannel}
 * @see {@link vscode.window.showErrorMessage}
 * @see {@link MermaidExportError}
 */
class ErrorHandler {
    static outputChannel;
    static initialize() {
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel('Mermaid Export Pro');
        }
    }
    /**
     * Handles errors with appropriate user feedback
     */
    static async handleError(error, context) {
        this.initialize();
        const timestamp = new Date().toISOString();
        const contextInfo = context ? ` [${context}]` : '';
        if (error instanceof types_1.MermaidExportError) {
            await this.handleMermaidError(error, contextInfo);
        }
        else {
            await this.handleGenericError(error, contextInfo);
        }
        // Log to output channel
        this.outputChannel.appendLine(`${timestamp}${contextInfo} ${error.message}`);
        if (error.stack) {
            this.outputChannel.appendLine(error.stack);
        }
    }
    static async handleMermaidError(error, contextInfo) {
        const message = `${error.errorInfo.message}${contextInfo}`;
        const actions = [];
        if (error.errorInfo.recoveryAction) {
            actions.push(error.errorInfo.recoveryAction);
        }
        actions.push('Show Log');
        const selection = await vscode.window.showErrorMessage(message, ...actions);
        if (selection === 'Show Log') {
            this.outputChannel.show();
        }
        else if (selection === error.errorInfo.recoveryAction) {
            await this.executeRecoveryAction(error.errorInfo);
        }
    }
    static async handleGenericError(error, contextInfo) {
        const message = `Mermaid Export Pro Error: ${error.message}${contextInfo}`;
        const selection = await vscode.window.showErrorMessage(message, 'Show Log', 'Report Issue');
        if (selection === 'Show Log') {
            this.outputChannel.show();
        }
        else if (selection === 'Report Issue') {
            await this.openIssueReporter(error);
        }
    }
    static async executeRecoveryAction(errorInfo) {
        switch (errorInfo.code) {
            case 'CLI_NOT_INSTALLED':
                await this.handleCliNotInstalled();
                break;
            case 'INVALID_MERMAID_SYNTAX':
                await this.handleInvalidSyntax();
                break;
            case 'OUTPUT_PERMISSION_DENIED':
                await this.handlePermissionDenied();
                break;
            default:
                vscode.window.showInformationMessage('Recovery action not implemented for this error type.');
        }
    }
    static async handleCliNotInstalled() {
        const selection = await vscode.window.showInformationMessage('Mermaid CLI is not installed. Would you like to install it now?', 'Install via npm', 'Install Globally', 'Use Web Fallback');
        if (selection === 'Install via npm') {
            const terminal = vscode.window.createTerminal('Mermaid CLI Install');
            terminal.sendText('npm install @mermaid-js/mermaid-cli');
            terminal.show();
        }
        else if (selection === 'Install Globally') {
            const terminal = vscode.window.createTerminal('Mermaid CLI Install');
            terminal.sendText('npm install -g @mermaid-js/mermaid-cli');
            terminal.show();
        }
    }
    static async handleInvalidSyntax() {
        const selection = await vscode.window.showInformationMessage('The Mermaid diagram contains syntax errors. Would you like to validate it?', 'Open Mermaid Live Editor', 'Check Documentation');
        if (selection === 'Open Mermaid Live Editor') {
            vscode.env.openExternal(vscode.Uri.parse('https://mermaid.live'));
        }
        else if (selection === 'Check Documentation') {
            vscode.env.openExternal(vscode.Uri.parse('https://mermaid.js.org/'));
        }
    }
    static async handlePermissionDenied() {
        const selection = await vscode.window.showInformationMessage('Permission denied when writing to output directory. Please check folder permissions.', 'Choose Different Location', 'Open Output Folder');
        if (selection === 'Choose Different Location') {
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('diagram.png'),
                filters: {
                    'Images': ['png', 'svg', 'pdf', 'webp']
                }
            });
            if (uri) {
                vscode.window.showInformationMessage(`Selected new location: ${uri.fsPath}`);
            }
        }
    }
    static async openIssueReporter(error) {
        const issueBody = encodeURIComponent(`## Error Report\n\n` +
            `**Error Message:** ${error.message}\n\n` +
            `**Stack Trace:**\n\`\`\`\n${error.stack || 'No stack trace available'}\n\`\`\`\n\n` +
            `**Environment:**\n` +
            `- VS Code Version: ${vscode.version}\n` +
            `- OS: ${process.platform}\n` +
            `- Extension Version: 0.0.1\n\n` +
            `**Steps to Reproduce:**\n1. \n2. \n3. \n\n` +
            `**Expected Behavior:**\n\n` +
            `**Actual Behavior:**\n`);
        const issueUrl = `https://github.com/your-username/mermaid-export-pro/issues/new?body=${issueBody}`;
        vscode.env.openExternal(vscode.Uri.parse(issueUrl));
    }
    /**
     * Creates standardized error info objects
     */
    static createErrorInfo(code, message, details, recoveryAction) {
        return { code, message, details, recoveryAction };
    }
    /**
     * Logs information to output channel
     */
    static logInfo(message) {
        this.initialize();
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`${timestamp} [INFO] ${message}`);
    }
    /**
     * Logs warnings to output channel
     */
    static logWarning(message) {
        this.initialize();
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`${timestamp} [WARN] ${message}`);
    }
    /**
     * Logs errors to output channel
     */
    static logError(message) {
        this.initialize();
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`${timestamp} [ERROR] ${message}`);
    }
    /**
     * Shows the output channel
     */
    static showOutput() {
        this.initialize();
        this.outputChannel.show();
    }
    /**
     * Disposes of resources
     */
    static dispose() {
        if (this.outputChannel) {
            this.outputChannel.dispose();
        }
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=errorHandler.js.map