"use strict";
/**
 * Dialog Service - Testable wrapper for VS Code UI dialogs
 *
 * This service provides a testable interface for VS Code dialogs,
 * allowing integration tests to inject mock implementations.
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
exports.getDialogService = getDialogService;
exports.setDialogService = setDialogService;
exports.resetDialogService = resetDialogService;
const vscode = __importStar(require("vscode"));
class DialogService {
    async showSaveDialog(options) {
        return vscode.window.showSaveDialog(options);
    }
    async showInformationMessage(message, ...items) {
        return vscode.window.showInformationMessage(message, ...items);
    }
    async showErrorMessage(message, ...items) {
        return vscode.window.showErrorMessage(message, ...items);
    }
    async showWarningMessage(message, ...items) {
        return vscode.window.showWarningMessage(message, ...items);
    }
    async showQuickPick(items, options) {
        return vscode.window.showQuickPick(items, options);
    }
}
// Singleton instance
let instance = new DialogService();
/**
 * Get the dialog service instance
 */
function getDialogService() {
    console.log('[DialogService] getDialogService() called, returning:', instance.constructor.name);
    return instance;
}
/**
 * Set a custom dialog service (for testing)
 */
function setDialogService(service) {
    console.log('[DialogService] setDialogService() called, setting:', service.constructor.name);
    instance = service;
    console.log('[DialogService] Current instance is now:', instance.constructor.name);
}
/**
 * Reset to default dialog service
 */
function resetDialogService() {
    instance = new DialogService();
}
//# sourceMappingURL=dialogService.js.map