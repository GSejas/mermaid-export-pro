/**
 * Dialog Service - Testable wrapper for VS Code UI dialogs
 * 
 * This service provides a testable interface for VS Code dialogs,
 * allowing integration tests to inject mock implementations.
 */

import * as vscode from 'vscode';

export interface IDialogService {
  showSaveDialog(options?: vscode.SaveDialogOptions): Promise<vscode.Uri | undefined>;
  showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showQuickPick<T extends vscode.QuickPickItem>(items: T[] | Thenable<T[]>, options?: vscode.QuickPickOptions): Promise<T | undefined>;
}

class DialogService implements IDialogService {
  async showSaveDialog(options?: vscode.SaveDialogOptions): Promise<vscode.Uri | undefined> {
    return vscode.window.showSaveDialog(options);
  }

  async showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
    return vscode.window.showInformationMessage(message, ...items) as Promise<string | undefined>;
  }

  async showErrorMessage(message: string, ...items: string[]): Promise<string | undefined> {
    return vscode.window.showErrorMessage(message, ...items) as Promise<string | undefined>;
  }

  async showWarningMessage(message: string, ...items: string[]): Promise<string | undefined> {
    return vscode.window.showWarningMessage(message, ...items) as Promise<string | undefined>;
  }

  async showQuickPick<T extends vscode.QuickPickItem>(
    items: T[] | Thenable<T[]>,
    options?: vscode.QuickPickOptions
  ): Promise<T | undefined> {
    return vscode.window.showQuickPick(items, options);
  }
}

// Singleton instance
let instance: IDialogService = new DialogService();

/**
 * Get the dialog service instance
 */
export function getDialogService(): IDialogService {
  return instance;
}

/**
 * Set a custom dialog service (for testing)
 */
export function setDialogService(service: IDialogService): void {
  instance = service;
}

/**
 * Reset to default dialog service
 */
export function resetDialogService(): void {
  instance = new DialogService();
}
