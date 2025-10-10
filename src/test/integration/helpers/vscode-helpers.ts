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

import * as vscode from 'vscode';

export class VSCodeTestHelper {
  private originalShowInformation: any;
  private originalShowQuickPick: any;
  private originalShowWarning: any;
  private originalShowError: any;
  private mockResponses: Map<string, any> = new Map();

  /**
   * Execute a VS Code command
   */
  async executeCommand<T = any>(command: string, ...args: any[]): Promise<T> {
    return await vscode.commands.executeCommand<T>(command, ...args);
  }

  /**
   * Wait for a command to be registered
   */
  async waitForCommand(commandId: string, timeout: number = 5000): Promise<boolean> {
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
  setupMockDialogs(): void {
    this.originalShowInformation = vscode.window.showInformationMessage;
    this.originalShowQuickPick = vscode.window.showQuickPick;
    this.originalShowWarning = (vscode.window as any).showWarningMessage;
    this.originalShowError = (vscode.window as any).showErrorMessage;

    // Mock showInformationMessage
    (vscode.window as any).showInformationMessage = async (message: string, ...items: any[]) => {
      const response = this.mockResponses.get(message) || this.mockResponses.get('*');
      if (response !== undefined) {
        return response;
      }
      // Default: return first item or undefined
      return items && items.length ? items[0] : undefined;
    };

    // Mock showQuickPick
    (vscode.window as any).showQuickPick = async (items: any[] | Thenable<any[]>, options?: any) => {
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
          return resolved.find((item: any) =>
            (typeof item === 'string' ? item : item.label) === response
          );
        }
        return response;
      }

      // Default: return first item
      return resolved && resolved.length ? resolved[0] : undefined;
    };

    // Mock showWarningMessage
    (vscode.window as any).showWarningMessage = async (message: string, ...items: any[]) => {
      const response = this.mockResponses.get(message) || this.mockResponses.get('*');
      return response !== undefined ? response : (items && items.length ? items[0] : undefined);
    };

    // Mock showErrorMessage
    (vscode.window as any).showErrorMessage = async (message: string, ...items: any[]) => {
      const response = this.mockResponses.get(message) || this.mockResponses.get('*');
      return response !== undefined ? response : (items && items.length ? items[0] : undefined);
    };
  }

  /**
   * Set a mock response for a specific dialog message
   */
  setMockResponse(messageOrPlaceholder: string, response: any): void {
    this.mockResponses.set(messageOrPlaceholder, response);
  }

  /**
   * Set default mock response for all dialogs
   */
  setDefaultMockResponse(response: any): void {
    this.mockResponses.set('*', response);
  }

  /**
   * Restore original VS Code dialog functions
   */
  restoreMockDialogs(): void {
    if (this.originalShowInformation) {
      (vscode.window as any).showInformationMessage = this.originalShowInformation;
    }
    if (this.originalShowQuickPick) {
      (vscode.window as any).showQuickPick = this.originalShowQuickPick;
    }
    if (this.originalShowWarning) {
      (vscode.window as any).showWarningMessage = this.originalShowWarning;
    }
    if (this.originalShowError) {
      (vscode.window as any).showErrorMessage = this.originalShowError;
    }
    this.mockResponses.clear();
  }

  /**
   * Open a file in VS Code
   */
  async openFile(filePath: string): Promise<vscode.TextEditor> {
    const uri = vscode.Uri.file(filePath);
    const document = await vscode.workspace.openTextDocument(uri);
    return await vscode.window.showTextDocument(document);
  }

  /**
   * Close all open editors
   */
  async closeAllEditors(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await this.sleep(100); // Give time for editors to close
  }

  /**
   * Get the active text editor
   */
  getActiveEditor(): vscode.TextEditor | undefined {
    return vscode.window.activeTextEditor;
  }

  /**
   * Wait for an active editor with specific file
   */
  async waitForActiveEditor(fileName: string, timeout: number = 5000): Promise<vscode.TextEditor | undefined> {
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
  getVisibleEditors(): readonly vscode.TextEditor[] {
    return vscode.window.visibleTextEditors;
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to be true
   */
  async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    checkInterval: number = 100
  ): Promise<boolean> {
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
  getWorkspaceFolder(index: number = 0): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.workspaceFolders?.[index];
  }

  /**
   * Open a folder as workspace
   */
  async openWorkspace(folderPath: string): Promise<void> {
    const uri = vscode.Uri.file(folderPath);
    await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
    // Wait for workspace to be ready
    await this.sleep(1000);
  }

  /**
   * Get configuration value
   */
  getConfig<T>(section: string, key: string): T | undefined {
    return vscode.workspace.getConfiguration(section).get<T>(key);
  }

  /**
   * Update configuration value
   */
  async updateConfig(section: string, key: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace): Promise<void> {
    await vscode.workspace.getConfiguration(section).update(key, value, target);
  }

  /**
   * Reset configuration to default
   */
  async resetConfig(section: string, key: string): Promise<void> {
    await vscode.workspace.getConfiguration(section).update(key, undefined, vscode.ConfigurationTarget.Workspace);
  }
}
