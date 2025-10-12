"use strict";
/**
 * Extension Setup Helper for Integration Tests
 *
 * Ensures the extension is activated before tests run.
 * Prevents "configuration not registered" errors by waiting for full activation.
 *
 * @author Claude/Jorge
 * @version 1.0.0
 * @date 2025-10-11
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
exports.ExtensionSetup = void 0;
const vscode = __importStar(require("vscode"));
class ExtensionSetup {
    static isActivated = false;
    static activationPromise = null;
    /**
     * Ensure the extension is activated before running tests
     * Only activates once, subsequent calls return the same promise
     */
    static async ensureActivated(timeout = 30000) {
        if (this.isActivated) {
            return;
        }
        if (this.activationPromise) {
            return this.activationPromise;
        }
        this.activationPromise = this._activate(timeout);
        await this.activationPromise;
        this.isActivated = true;
    }
    static async _activate(timeout) {
        const extension = vscode.extensions.getExtension('GSejas.mermaid-export-pro');
        if (!extension) {
            throw new Error('Mermaid Export Pro extension not found');
        }
        // Stub dialogs to prevent onboarding UI from blocking
        const originalShowInformation = vscode.window.showInformationMessage;
        const originalShowQuickPick = vscode.window.showQuickPick;
        const originalShowWarning = vscode.window.showWarningMessage;
        // Auto-dismiss all dialogs
        vscode.window.showInformationMessage = async (message, ...items) => {
            if (items && items.includes('Skip Setup'))
                return 'Skip Setup';
            return items && items.length ? items[0] : undefined;
        };
        vscode.window.showQuickPick = async (items, options) => {
            const resolved = Array.isArray(items) ? items : await items;
            return resolved && resolved.length ? resolved[0] : undefined;
        };
        vscode.window.showWarningMessage = async (message, ...items) => {
            return items && items.length ? items[0] : undefined;
        };
        try {
            // Wait for extension activation and command registration
            const deadline = Date.now() + timeout;
            let ready = extension.isActive;
            while (!ready && Date.now() < deadline) {
                // Check if critical commands are registered
                const commands = await vscode.commands.getCommands(true);
                const criticalCommands = [
                    'mermaidExportPro.exportCurrent',
                    'mermaidExportPro.batchExport',
                    'mermaidExportPro.exportAs'
                ];
                const allRegistered = criticalCommands.every(cmd => commands.includes(cmd));
                if (allRegistered) {
                    ready = true;
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            if (!ready) {
                throw new Error('Extension did not activate within timeout');
            }
            // Additional wait to ensure configuration is fully registered
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        finally {
            // Restore original dialog functions
            vscode.window.showInformationMessage = originalShowInformation;
            vscode.window.showQuickPick = originalShowQuickPick;
            vscode.window.showWarningMessage = originalShowWarning;
        }
    }
    /**
     * Reset activation state (for testing purposes)
     */
    static reset() {
        this.isActivated = false;
        this.activationPromise = null;
    }
}
exports.ExtensionSetup = ExtensionSetup;
//# sourceMappingURL=extension-setup.js.map