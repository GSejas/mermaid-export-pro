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

import * as vscode from 'vscode';

export class ExtensionSetup {
  private static isActivated = false;
  private static activationPromise: Promise<void> | null = null;

  /**
   * Ensure the extension is activated before running tests
   * Only activates once, subsequent calls return the same promise
   */
  static async ensureActivated(timeout: number = 30000): Promise<void> {
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

  private static async _activate(timeout: number): Promise<void> {
    const extension = vscode.extensions.getExtension('GSejas.mermaid-export-pro');
     
    if (!extension) {
      throw new Error('Mermaid Export Pro extension not found');
    }

    // Stub dialogs to prevent onboarding UI from blocking
    const originalShowInformation = vscode.window.showInformationMessage;
    const originalShowQuickPick = vscode.window.showQuickPick;
    const originalShowWarning = (vscode.window as any).showWarningMessage;

    // Auto-dismiss all dialogs
    (vscode.window as any).showInformationMessage = async (message: any, ...items: any[]) => {
      if (items && items.includes('Skip Setup')) return 'Skip Setup';
      return items && items.length ? items[0] : undefined;
    };

    (vscode.window as any).showQuickPick = async (items: any[] | Thenable<any[]>, options?: any) => {
      const resolved = Array.isArray(items) ? items : await items;
      return resolved && resolved.length ? resolved[0] : undefined;
    };

    (vscode.window as any).showWarningMessage = async (message: any, ...items: any[]) => {
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

    } finally {
      // Restore original dialog functions
      (vscode.window as any).showInformationMessage = originalShowInformation;
      (vscode.window as any).showQuickPick = originalShowQuickPick;
      (vscode.window as any).showWarningMessage = originalShowWarning;
    }
  }

  /**
   * Reset activation state (for testing purposes)
   */
  static reset(): void {
    this.isActivated = false;
    this.activationPromise = null;
  }
}
