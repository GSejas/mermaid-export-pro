"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) {k2 = k;}
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) {k2 = k;}
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
            for (var k in o) {if (Object.prototype.hasOwnProperty.call(o, k)) {ar[ar.length] = k;}}
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) {return mod;}
        var result = {};
        if (mod !== null) {for (var k = ownKeys(mod), i = 0; i < k.length; i++) {if (k[i] !== "default") {__createBinding(result, mod, k[i]);}}}
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Note: The integration tests stub common VS Code dialogs (showInformationMessage, showQuickPick)
// to avoid the extension's onboarding UI from blocking activation during CI/automated runs.
// This keeps activation deterministic and prevents interactive prompts from causing test flakes.
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
suite('Extension Integration Tests', () => {
    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('GSejas.mermaid-export-pro'));
    });
    test('should activate extension', async function () {
        this.timeout(30000); // Increase timeout for activation
        const extension = vscode.extensions.getExtension('GSejas.mermaid-export-pro');
        assert.ok(extension);
        // Prevent onboarding UI from blocking activation by stubbing common dialogs
        const originalShowInformation = vscode.window.showInformationMessage;
        const originalShowQuickPick = vscode.window.showQuickPick;
        const originalShowWarning = vscode.window.showWarningMessage;
        // Auto-select 'Skip Setup' when presented with the welcome message to avoid interactive prompts
        vscode.window.showInformationMessage = async (message, ...items) => {
            if (items && items.includes('Skip Setup'))
                {return 'Skip Setup';}
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
            // Prefer commands being registered rather than waiting for full activation.
            // Poll briefly for commands which are registered early in activation.
            const deadline = Date.now() + 8000; // short poll window
            let ready = extension.isActive;
            while (!ready && Date.now() < deadline) {
                const commands = await vscode.commands.getCommands(true);
                if (commands.includes('mermaidExportPro.exportCurrent')) {
                    ready = true;
                    break;
                }
                // small sleep
                await new Promise((r) => setTimeout(r, 200));
            }
            assert.ok(ready, 'Extension did not activate or register commands within short window');
        }
        finally {
            // Restore original dialog functions
            vscode.window.showInformationMessage = originalShowInformation;
            vscode.window.showQuickPick = originalShowQuickPick;
            vscode.window.showWarningMessage = originalShowWarning;
        }
    });
    test('should register export commands', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('mermaidExportPro.exportCurrent'));
        assert.ok(commands.includes('mermaidExportPro.exportAs'));
        assert.ok(commands.includes('mermaidExportPro.batchExport'));
    });
});
//# sourceMappingURL=extension.test.js.map