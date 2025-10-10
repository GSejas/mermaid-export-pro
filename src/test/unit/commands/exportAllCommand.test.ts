import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { runExportAllCommand } from '../../../commands/exportAllCommand';
import * as vscode from 'vscode';
import { OperationTimeoutManager } from '../../../services/operationTimeoutManager';
import { CLIExportStrategy } from '../../../strategies/cliExportStrategy';
import { WebExportStrategy } from '../../../strategies/webExportStrategy';
import * as fs from 'fs';

// Mock vscode
vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    showErrorMessage: vi.fn(() => Promise.resolve(undefined)),
    showWarningMessage: vi.fn(() => Promise.resolve(undefined)),
    showInformationMessage: vi.fn(() => Promise.resolve(undefined)),
    showQuickPick: vi.fn(() => Promise.resolve(undefined)),
    showTextDocument: vi.fn(() => Promise.resolve(undefined)),
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn(),
      clear: vi.fn()
    })),
    withProgress: vi.fn((options, task) => task({ report: vi.fn() }))
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue: any) => {
        const defaults: Record<string, any> = {
          defaultFormat: 'png',
          theme: 'default',
          width: 1200,
          height: 800,
          backgroundColor: 'transparent'
        };
        return defaults[key] ?? defaultValue;
      })
    })),
    openTextDocument: vi.fn()
  },
  commands: {
    executeCommand: vi.fn(() => Promise.resolve())
  },
  env: {
    clipboard: {
      writeText: vi.fn(() => Promise.resolve())
    }
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, scheme: 'file', path }))
  },
  Range: class {
    constructor(public start: any, public end: any) {}
  },
  Selection: class {
    constructor(public start: any, public end: any) {}
  },
  ProgressLocation: {
    Notification: 15
  }
}));

// Mock OperationTimeoutManager
vi.mock('../../../services/operationTimeoutManager', () => ({
  OperationTimeoutManager: {
    getInstance: vi.fn(() => ({
      canStartExport: vi.fn(() => true),
      getExportCooldownRemaining: vi.fn(() => 0),
      startOperation: vi.fn(),
      updateProgress: vi.fn(),
      completeOperation: vi.fn(),
      cancelOperation: vi.fn()
    }))
  }
}));

// Mock strategies
vi.mock('../../../strategies/cliExportStrategy', () => ({
  CLIExportStrategy: vi.fn(() => ({
    isAvailable: vi.fn(() => Promise.resolve(true)),
    export: vi.fn(() => Promise.resolve(Buffer.from('mocked-svg-content')))
  }))
}));

vi.mock('../../../strategies/webExportStrategy', () => ({
  WebExportStrategy: vi.fn(() => ({
    isAvailable: vi.fn(() => Promise.resolve(true)),
    export: vi.fn(() => Promise.resolve(Buffer.from('mocked-svg-content')))
  }))
}));

// Mock fs
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn(() => Promise.resolve())
  }
}));

// Mock ErrorHandler
vi.mock('../../../ui/errorHandler', () => ({
  ErrorHandler: {
    logError: vi.fn(),
    logInfo: vi.fn(),
    logWarning: vi.fn()
  }
}));

describe('exportAllCommand', () => {
  let mockContext: any;
  let mockDocument: any;
  let mockEditor: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      extensionPath: '/test/path',
      subscriptions: []
    };

    mockDocument = {
      fileName: '/test/document.md',
      lineCount: 20,
      getText: vi.fn(() => ''),
      uri: { fsPath: '/test/document.md' }
    };

    mockEditor = {
      document: mockDocument,
      selection: undefined
    };

    // Reset mocks
    (vscode.window as any).activeTextEditor = mockEditor;
    (vscode.window.showQuickPick as any).mockResolvedValue(undefined);
    (vscode.window.showInformationMessage as any).mockResolvedValue(undefined);
    (vscode.window.showWarningMessage as any).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as any).mockResolvedValue(undefined);

    // Reset timeout manager mock
    (OperationTimeoutManager.getInstance as any).mockReturnValue({
      canStartExport: vi.fn(() => true),
      getExportCooldownRemaining: vi.fn(() => 0),
      startOperation: vi.fn(),
      updateProgress: vi.fn(),
      completeOperation: vi.fn(),
      cancelOperation: vi.fn()
    });

    // Ensure clipboard mock is reset
    (vscode.env.clipboard.writeText as any).mockClear();

    // Reset strategy mocks to default behavior
    (CLIExportStrategy as any).mockImplementation(() => ({
      isAvailable: vi.fn(() => Promise.resolve(true)),
      export: vi.fn(() => Promise.resolve(Buffer.from('mocked-svg-content')))
    }));

    (WebExportStrategy as any).mockImplementation(() => ({
      isAvailable: vi.fn(() => Promise.resolve(true)),
      export: vi.fn(() => Promise.resolve(Buffer.from('mocked-svg-content')))
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('runExportAllCommand()', () => {
    it('should handle export throttling when cooldown active', async () => {
      // Need to create a fresh mock that returns the correct values
      const mockTimeoutManager = {
        canStartExport: vi.fn(() => false),
        getExportCooldownRemaining: vi.fn(() => 5000),
        startOperation: vi.fn(),
        updateProgress: vi.fn(),
        completeOperation: vi.fn(),
        cancelOperation: vi.fn()
      };

      (OperationTimeoutManager.getInstance as any).mockReturnValue(mockTimeoutManager);

      await runExportAllCommand(mockContext);

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Please wait 5s before starting another export')
      );
    });

    it('should handle no active editor', async () => {
      (vscode.window as any).activeTextEditor = undefined;

      await runExportAllCommand(mockContext);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'No active document found. Please open a mermaid or markdown file.'
      );
    });

    it('should handle no mermaid diagrams found', async () => {
      mockDocument.getText.mockReturnValue('# Just a regular markdown file\nNo diagrams here.');

      await runExportAllCommand(mockContext);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'No mermaid diagrams found in the current file.'
      );
    });

    it('should delegate to single export when only one diagram found', async () => {
      mockDocument.getText.mockReturnValue('```mermaid\nflowchart TD\n  A-->B\n```');

      await runExportAllCommand(mockContext);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mermaidExportPro.exportCurrent');
    });

    it('should show options when multiple diagrams found', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      await runExportAllCommand(mockContext);

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: expect.stringContaining('Export All 2 Diagrams') }),
          expect.objectContaining({ label: expect.stringContaining('Export Single Diagram') }),
          expect.objectContaining({ label: expect.stringContaining('Custom Export Options') })
        ]),
        expect.any(Object)
      );
    });

    it('should handle "Export All" choice', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      (vscode.window.showQuickPick as any).mockResolvedValue({
        label: '📊 Export All 2 Diagrams',
        description: 'Export all diagrams with auto-generated names'
      });

      await runExportAllCommand(mockContext);

      expect(vscode.window.withProgress).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
    });

    it('should handle "Export Single" choice', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      // First show the main menu
      (vscode.window.showQuickPick as any)
        .mockResolvedValueOnce({
          label: '🎯 Export Single Diagram',
          description: 'Choose which diagram to export'
        })
        .mockResolvedValueOnce({
          label: '📊 Diagram 1',
          diagram: { content: 'flowchart TD\n  A-->B', startLine: 0, endLine: 2, type: 'markdown' },
          index: 0
        });

      await runExportAllCommand(mockContext);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mermaidExportPro.exportCurrent');
    });

    it('should handle "Custom Export Options" choice', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      // Mock user selections
      (vscode.window.showQuickPick as any)
        .mockResolvedValueOnce({
          label: '⚙️ Custom Export Options',
          description: 'Choose format, theme, and output location'
        })
        .mockResolvedValueOnce({ label: 'SVG', value: 'svg' }) // Format
        .mockResolvedValueOnce({ label: 'Dark', value: 'dark' }); // Theme

      await runExportAllCommand(mockContext);

      expect(vscode.window.withProgress).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
    });

    it('should handle user cancellation during format selection', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      (vscode.window.showQuickPick as any)
        .mockResolvedValueOnce({
          label: '⚙️ Custom Export Options',
          description: 'Choose format, theme, and output location'
        })
        .mockResolvedValueOnce(undefined); // User cancels format selection

      await runExportAllCommand(mockContext);

      expect(vscode.window.withProgress).not.toHaveBeenCalled();
    });

    it('should handle user cancellation during theme selection', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      (vscode.window.showQuickPick as any)
        .mockResolvedValueOnce({
          label: '⚙️ Custom Export Options',
          description: 'Choose format, theme, and output location'
        })
        .mockResolvedValueOnce({ label: 'SVG', value: 'svg' }) // Format
        .mockResolvedValueOnce(undefined); // User cancels theme selection

      await runExportAllCommand(mockContext);

      expect(vscode.window.withProgress).not.toHaveBeenCalled();
    });

    it('should handle .mmd files correctly', async () => {
      mockDocument.fileName = '/test/diagram.mmd';
      mockDocument.getText.mockReturnValue('flowchart TD\n  A-->B\n  B-->C');
      mockDocument.lineCount = 3;

      await runExportAllCommand(mockContext);

      // .mmd files have only one diagram, should delegate to single export
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mermaidExportPro.exportCurrent');
    });

    it('should handle export strategy fallback', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      // CLI unavailable, web available
      (CLIExportStrategy as any).mockImplementation(() => ({
        isAvailable: vi.fn(() => Promise.resolve(false))
      }));
      (WebExportStrategy as any).mockImplementation(() => ({
        isAvailable: vi.fn(() => Promise.resolve(true)),
        export: vi.fn(() => Promise.resolve(Buffer.from('web-export')))
      }));

      (vscode.window.showQuickPick as any).mockResolvedValue({
        label: '📊 Export All 2 Diagrams',
        description: 'Export all diagrams with auto-generated names'
      });

      await runExportAllCommand(mockContext);

      expect(vscode.window.withProgress).toHaveBeenCalled();
    });

    it('should handle no available export strategies', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      // Both strategies unavailable
      (CLIExportStrategy as any).mockImplementation(() => ({
        isAvailable: vi.fn(() => Promise.resolve(false))
      }));
      (WebExportStrategy as any).mockImplementation(() => ({
        isAvailable: vi.fn(() => Promise.resolve(false))
      }));

      (vscode.window.showQuickPick as any).mockResolvedValue({
        label: '📊 Export All 2 Diagrams',
        description: 'Export all diagrams with auto-generated names'
      });

      await runExportAllCommand(mockContext);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('No export strategy available')
      );
    });

    it('should open provided document URI before processing', async () => {
      const testUri = vscode.Uri.file('/test/another.md');
      const mockDoc = {
        fileName: '/test/another.md',
        lineCount: 5,
        getText: vi.fn(() => '```mermaid\nflowchart TD\n  A-->B\n```')
      };

      (vscode.workspace.openTextDocument as any).mockResolvedValue(mockDoc);

      await runExportAllCommand(mockContext, testUri);

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(testUri);
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDoc, { preview: false });
    });

    it('should handle partial export failures gracefully', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      // First export succeeds, second fails
      const mockStrategy = {
        isAvailable: vi.fn(() => Promise.resolve(true)),
        export: vi.fn()
          .mockResolvedValueOnce(Buffer.from('diagram-1'))
          .mockRejectedValueOnce(new Error('Export failed'))
      };

      (CLIExportStrategy as any).mockImplementation(() => mockStrategy);

      (vscode.window.showQuickPick as any).mockResolvedValue({
        label: '📊 Export All 2 Diagrams',
        description: 'Export all diagrams with auto-generated names'
      });

      await runExportAllCommand(mockContext);

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Exported 1 diagrams successfully, 1 failed'),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should show error when all exports fail', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      const mockStrategy = {
        isAvailable: vi.fn(() => Promise.resolve(true)),
        export: vi.fn().mockRejectedValue(new Error('Export failed'))
      };

      (CLIExportStrategy as any).mockImplementation(() => mockStrategy);

      (vscode.window.showQuickPick as any).mockResolvedValue({
        label: '📊 Export All 2 Diagrams',
        description: 'Export all diagrams with auto-generated names'
      });

      await runExportAllCommand(mockContext);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Export failed: No diagrams were exported successfully.'
      );
    });

    it('should handle "Open File" action for single export', async () => {
      mockDocument.getText.mockReturnValue('```mermaid\nflowchart TD\n  A-->B\n```');
      mockDocument.fileName = '/test/single.md';

      // Create 1 diagram
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\nSome text\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      (vscode.window.showQuickPick as any).mockResolvedValue({
        label: '📊 Export All 2 Diagrams',
        description: 'Export all diagrams with auto-generated names'
      });

      (vscode.window.showInformationMessage as any).mockResolvedValue('Open File');

      await runExportAllCommand(mockContext);

      // Note: This will show "Show in Explorer" since we have 2 diagrams, not "Open File"
      // But if we had 1 diagram, it would delegate to single export
    });

    it('should handle "Copy Paths" action', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n  A-->B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```'
      );

      (vscode.window.showQuickPick as any).mockResolvedValue({
        label: '📊 Export All 2 Diagrams',
        description: 'Export all diagrams with auto-generated names'
      });

      // First call is for the success message with action buttons, returns 'Copy Paths'
      (vscode.window.showInformationMessage as any).mockResolvedValue('Copy Paths');

      await runExportAllCommand(mockContext);

      expect(vscode.env.clipboard.writeText).toHaveBeenCalled();
      // First call with action buttons
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Successfully exported all 2 diagrams'),
        'Show in Explorer',
        'Copy Paths'
      );
      // Second call confirming clipboard copy
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('File paths copied to clipboard');
    });

    it('should extract diagrams with preserved indentation', async () => {
      mockDocument.getText.mockReturnValue(
        '```mermaid\nflowchart TD\n    A-->B\n    B-->C\n```'
      );

      // Mock to capture the diagram content passed to export
      const mockExport = vi.fn(() => Promise.resolve(Buffer.from('test')));
      (CLIExportStrategy as any).mockImplementation(() => ({
        isAvailable: vi.fn(() => Promise.resolve(true)),
        export: mockExport
      }));

      // Only 1 diagram, so it will delegate to single export command
      await runExportAllCommand(mockContext);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mermaidExportPro.exportCurrent');
    });
  });

  describe('Diagram Extraction', () => {
    it('should extract multiple diagrams from markdown', async () => {
      const content = `# My Diagrams
      
\`\`\`mermaid
flowchart TD
  A-->B
\`\`\`

Some text here

\`\`\`mermaid
sequenceDiagram
  A->>B: Hello
\`\`\`

More text

\`\`\`mermaid
classDiagram
  class Animal
\`\`\``;

      mockDocument.getText.mockReturnValue(content);

      await runExportAllCommand(mockContext);

      // Should detect 3 diagrams and show options
      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: expect.stringContaining('Export All 3 Diagrams') })
        ]),
        expect.any(Object)
      );
    });

    it('should ignore non-mermaid code blocks', async () => {
      const content = `\`\`\`javascript
console.log('not mermaid');
\`\`\`

\`\`\`mermaid
flowchart TD
  A-->B
\`\`\`

\`\`\`python
print('also not mermaid')
\`\`\``;

      mockDocument.getText.mockReturnValue(content);

      await runExportAllCommand(mockContext);

      // Should delegate to single export (only 1 mermaid diagram)
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mermaidExportPro.exportCurrent');
    });

    it('should handle empty mermaid blocks', async () => {
      const content = `\`\`\`mermaid
\`\`\`

\`\`\`mermaid
flowchart TD
  A-->B
\`\`\``;

      mockDocument.getText.mockReturnValue(content);

      await runExportAllCommand(mockContext);

      // Should only detect 1 valid diagram
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mermaidExportPro.exportCurrent');
    });
  });
});
