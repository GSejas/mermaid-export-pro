"use strict";
/**
 * VS Code E2E Test Helpers
 *
 * Utilities for interacting with VS Code UI during E2E tests.
 * Handles commands, dialogs, notifications, and status bar interactions.
 *
 * @author Claude/Jorge
 * @version 1.0.0
 * @date 2025-10-10
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
exports.VSCodeTestHelper = void 0;
const vscode = __importStar(require("vscode"));
const dialogService_1 = require("../../../services/dialogService");
/**
 * Mock implementation of IDialogService for testing
 */
class MockDialogService {
    helper;
    constructor(helper) {
        this.helper = helper;
    }
    async showSaveDialog(options) {
        console.log('[TEST] MockDialogService.showSaveDialog called!');
        console.log('[TEST] MockDialogService - helper:', this.helper.constructor.name);
        console.log('[TEST] MockDialogService - mockPath:', this.helper['mockSaveDialogPath']);
        console.log('[TEST] MockDialogService - defaultUri:', options?.defaultUri?.fsPath);
        if (this.helper['mockSaveDialogPath']) {
            console.log('[TEST] Returning mock path:', this.helper['mockSaveDialogPath']);
            return vscode.Uri.file(this.helper['mockSaveDialogPath']);
        }
        // If no mock path set, generate one from the defaultUri
        if (options?.defaultUri) {
            console.log('[TEST] Returning defaultUri:', options.defaultUri.fsPath);
            return options.defaultUri;
        }
        // Otherwise return undefined (user cancelled)
        console.log('[TEST] Returning undefined (cancelled)');
        return undefined;
    }
    async showInformationMessage(message, ...items) {
        const response = this.helper['mockResponses'].get(message) || this.helper['mockResponses'].get('*');
        return response !== undefined ? response : (items && items.length ? items[0] : undefined);
    }
    async showErrorMessage(message, ...items) {
        const response = this.helper['mockResponses'].get(message) || this.helper['mockResponses'].get('*');
        return response !== undefined ? response : (items && items.length ? items[0] : undefined);
    }
    async showWarningMessage(message, ...items) {
        const response = this.helper['mockResponses'].get(message) || this.helper['mockResponses'].get('*');
        return response !== undefined ? response : (items && items.length ? items[0] : undefined);
    }
    async showQuickPick(items, options) {
        const resolved = Array.isArray(items) ? items : await items;
        const label = options?.placeHolder || '*';
        const response = this.helper['mockResponses'].get(label);
        if (response !== undefined) {
            // If response is a number, return that index
            if (typeof response === 'number') {
                return resolved[response];
            }
            // If response is a string, find matching label
            if (typeof response === 'string') {
                return resolved.find((item) => (typeof item === 'string' ? item : item.label) === response);
            }
            return response;
        }
        // Default: return first item
        return resolved && resolved.length ? resolved[0] : undefined;
    }
}
class VSCodeTestHelper {
    originalShowInformation;
    originalShowQuickPick;
    originalShowWarning;
    originalShowError;
    originalShowSaveDialog;
    mockResponses = new Map();
    mockSaveDialogPath;
    mockDialogService = null;
    /**
     * Execute a VS Code command
     */
    async executeCommand(command, ...args) {
        return await vscode.commands.executeCommand(command, ...args);
    }
    /**
     * Wait for a command to be registered
     */
    async waitForCommand(commandId, timeout = 5000) {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const commands = await vscode.commands.getCommands(true);
            if (commands.includes(commandId)) {
                return true;
            }
            await this.sleep(100);
        }
        return false;
    }
    /**
     * Set up mock responses for VS Code dialogs
     */
    setupMockDialogs() {
        console.log('[TEST] setupMockDialogs() called');
        this.originalShowInformation = vscode.window.showInformationMessage;
        this.originalShowQuickPick = vscode.window.showQuickPick;
        this.originalShowWarning = vscode.window.showWarningMessage;
        this.originalShowError = vscode.window.showErrorMessage;
        this.originalShowSaveDialog = vscode.window.showSaveDialog;
        // Mock showInformationMessage
        vscode.window.showInformationMessage = async (message, ...items) => {
            const response = this.mockResponses.get(message) || this.mockResponses.get('*');
            if (response !== undefined) {
                return response;
            }
            // Default: return first item or undefined
            return items && items.length ? items[0] : undefined;
        };
        // Mock showQuickPick
        vscode.window.showQuickPick = async (items, options) => {
            const resolved = Array.isArray(items) ? items : await items;
            const label = options?.placeHolder || '*';
            const response = this.mockResponses.get(label);
            if (response !== undefined) {
                // If response is a number, return that index
                if (typeof response === 'number') {
                    return resolved[response];
                }
                // If response is a string, find matching label
                if (typeof response === 'string') {
                    return resolved.find((item) => (typeof item === 'string' ? item : item.label) === response);
                }
                return response;
            }
            // Default: return first item
            return resolved && resolved.length ? resolved[0] : undefined;
        };
        // Mock showWarningMessage
        vscode.window.showWarningMessage = async (message, ...items) => {
            const response = this.mockResponses.get(message) || this.mockResponses.get('*');
            return response !== undefined ? response : (items && items.length ? items[0] : undefined);
        };
        // Mock showErrorMessage
        vscode.window.showErrorMessage = async (message, ...items) => {
            const response = this.mockResponses.get(message) || this.mockResponses.get('*');
            return response !== undefined ? response : (items && items.length ? items[0] : undefined);
        };
        // Mock showSaveDialog - return predetermined path or generate one based on defaultUri
        vscode.window.showSaveDialog = async (options) => {
            console.log('[TEST] showSaveDialog mock called', {
                mockPath: this.mockSaveDialogPath,
                defaultUri: options?.defaultUri?.fsPath
            });
            if (this.mockSaveDialogPath) {
                console.log('[TEST] Returning mock path:', this.mockSaveDialogPath);
                return vscode.Uri.file(this.mockSaveDialogPath);
            }
            // If no mock path set, generate one from the defaultUri
            if (options?.defaultUri) {
                console.log('[TEST] Returning defaultUri:', options.defaultUri.fsPath);
                return options.defaultUri;
            }
            // Otherwise return undefined (user cancelled)
            console.log('[TEST] Returning undefined (cancelled)');
            return undefined;
        };
        // Set up mock dialog service
        console.log('[TEST] Creating MockDialogService...');
        this.mockDialogService = new MockDialogService(this);
        console.log('[TEST] Calling setDialogService with MockDialogService...');
        (0, dialogService_1.setDialogService)(this.mockDialogService);
        console.log('[TEST] setupMockDialogs() complete');
    }
    /**
     * Set a mock response for a specific dialog message
     */
    setMockResponse(messageOrPlaceholder, response) {
        this.mockResponses.set(messageOrPlaceholder, response);
    }
    /**
     * Set the mock path to return from showSaveDialog
     */
    setMockSaveDialogPath(path) {
        this.mockSaveDialogPath = path;
    }
    /**
     * Set default mock response for all dialogs
     */
    setDefaultMockResponse(response) {
        this.mockResponses.set('*', response);
    }
    /**
     * Restore original VS Code dialog functions
     */
    restoreMockDialogs() {
        if (this.originalShowInformation) {
            vscode.window.showInformationMessage = this.originalShowInformation;
        }
        if (this.originalShowQuickPick) {
            vscode.window.showQuickPick = this.originalShowQuickPick;
        }
        if (this.originalShowWarning) {
            vscode.window.showWarningMessage = this.originalShowWarning;
        }
        if (this.originalShowError) {
            vscode.window.showErrorMessage = this.originalShowError;
        }
        if (this.originalShowSaveDialog) {
            vscode.window.showSaveDialog = this.originalShowSaveDialog;
        }
        this.mockResponses.clear();
        this.mockSaveDialogPath = undefined;
        // Reset dialog service
        if (this.mockDialogService) {
            (0, dialogService_1.resetDialogService)();
            this.mockDialogService = null;
        }
    }
    /**
     * Open a file in VS Code
     */
    async openFile(filePath) {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        return await vscode.window.showTextDocument(document);
    }
    /**
     * Close all open editors
     */
    async closeAllEditors() {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await this.sleep(100); // Give time for editors to close
    }
    /**
     * Get the active text editor
     */
    getActiveEditor() {
        return vscode.window.activeTextEditor;
    }
    /**
     * Wait for an active editor with specific file
     */
    async waitForActiveEditor(fileName, timeout = 5000) {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.fileName.includes(fileName)) {
                return editor;
            }
            await this.sleep(100);
        }
        return undefined;
    }
    /**
     * Get all visible text editors
     */
    getVisibleEditors() {
        return vscode.window.visibleTextEditors;
    }
    /**
     * Sleep for specified milliseconds
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Wait for a condition to be true
     */
    async waitFor(condition, timeout = 5000, checkInterval = 100) {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            if (await condition()) {
                return true;
            }
            await this.sleep(checkInterval);
        }
        return false;
    }
    /**
     * Get workspace folder
     */
    getWorkspaceFolder(index = 0) {
        return vscode.workspace.workspaceFolders?.[index];
    }
    /**
     * Open a folder as workspace
     */
    async openWorkspace(folderPath) {
        const uri = vscode.Uri.file(folderPath);
        await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
        // Wait for workspace to be ready
        await this.sleep(1000);
    }
    /**
     * Get configuration value
     */
    getConfig(section, key) {
        return vscode.workspace.getConfiguration(section).get(key);
    }
    /**
     * Update configuration value
     */
    async updateConfig(section, key, value, target = vscode.ConfigurationTarget.Global) {
        await vscode.workspace.getConfiguration(section).update(key, value, target);
    }
    /**
     * Reset configuration to default
     */
    async resetConfig(section, key) {
        await vscode.workspace.getConfiguration(section).update(key, undefined, vscode.ConfigurationTarget.Global);
    }
}
exports.VSCodeTestHelper = VSCodeTestHelper;
//# sourceMappingURL=vscode-helpers.js.map