// Note: The integration tests stub common VS Code dialogs (showInformationMessage, showQuickPick)
// to avoid the extension's onboarding UI from blocking activation during CI/automated runs.
// This keeps activation deterministic and prevents interactive prompts from causing test flakes.
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Tests', () => {
  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('GSejas.mermaid-export-pro'));
  });

  test('should activate extension', async function() {
    this.timeout(30000); // Increase timeout for activation

    const extension = vscode.extensions.getExtension('GSejas.mermaid-export-pro');
    assert.ok(extension);
    // Prevent onboarding UI from blocking activation by stubbing common dialogs
    const originalShowInformation = vscode.window.showInformationMessage;
    const originalShowQuickPick = vscode.window.showQuickPick;
    const originalShowWarning = (vscode.window as any).showWarningMessage;

    // Auto-select 'Skip Setup' when presented with the welcome message to avoid interactive prompts
    (vscode.window as any).showInformationMessage = async (message: any, ...items: any[]) => {
      if (items && items.includes('Skip Setup')) {return 'Skip Setup';}
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
    } finally {
      // Restore original dialog functions
      (vscode.window as any).showInformationMessage = originalShowInformation;
      (vscode.window as any).showQuickPick = originalShowQuickPick;
      (vscode.window as any).showWarningMessage = originalShowWarning;
    }
  });

  test('should register export commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    
    assert.ok(commands.includes('mermaidExportPro.exportCurrent'));
    assert.ok(commands.includes('mermaidExportPro.exportAs'));
    assert.ok(commands.includes('mermaidExportPro.batchExport'));
  });
});
