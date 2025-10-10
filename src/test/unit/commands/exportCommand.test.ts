import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock modules with factory functions
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn(),
    stat: vi.fn(() => Promise.resolve({ size: 1024 })),
  },
}));

vi.mock('../../../strategies/cliExportStrategy', () => ({
  CLIExportStrategy: vi.fn(() => ({
    name: 'CLI Export Strategy',
    isAvailable: vi.fn(() => Promise.resolve(true)),
    export: vi.fn(() => Promise.resolve(Buffer.from('mock-svg-content'))),
  })),
}));

vi.mock('../../../strategies/webExportStrategy', () => ({
  WebExportStrategy: vi.fn(() => ({
    name: 'Web Export Strategy',
    isAvailable: vi.fn(() => Promise.resolve(true)),
    export: vi.fn(() => Promise.resolve(Buffer.from('mock-svg-content'))),
  })),
}));

vi.mock('../../../ui/errorHandler', () => ({
  ErrorHandler: {
    logInfo: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('../../../utils/autoNaming', () => ({
  AutoNaming: {
    generateSmartName: vi.fn(() => Promise.resolve('/test/output.svg')),
  },
}));

vi.mock('../../../services/formatPreferenceManager', () => ({
  FormatPreferenceManager: vi.fn(() => ({
    setFileFormatPreference: vi.fn(),
  })),
}));

vi.mock('../../../services/operationTimeoutManager', () => ({
  OperationTimeoutManager: (() => {
    // Shared mock instance so tests can modify behavior and the code under test
    const mockInstance: any = {
      canStartExport: vi.fn(() => true),
      getExportCooldownRemaining: vi.fn(() => 0),
      startOperation: vi.fn(),
      updateProgress: vi.fn(),
      completeOperation: vi.fn(),
      cancelOperation: vi.fn(),
    };

    return {
      getInstance: vi.fn(() => mockInstance),
    };
  })(),
}));

// Import the function to test
import { runExportCommand } from '../../../commands/exportCommand';
import { CLIExportStrategy } from '../../../strategies/cliExportStrategy';
import { WebExportStrategy } from '../../../strategies/webExportStrategy';
import { OperationTimeoutManager } from '../../../services/operationTimeoutManager';
import { FormatPreferenceManager } from '../../../services/formatPreferenceManager';
import { AutoNaming } from '../../../utils/autoNaming';

// Mock vscode
vi.mock('vscode', () => {
  const mockTextDocument = {
    fileName: '/test/file.md',
    getText: vi.fn(() => '```mermaid\ngraph TD\nA --> B\n```'),
  };

  const mockTextEditor = {
    document: mockTextDocument,
    selection: {
      isEmpty: true,
    },
  };

  const mockExtensionContext = {
    globalState: {
      get: vi.fn(),
      update: vi.fn(),
    },
    subscriptions: [],
  };

  return {
    window: {
      activeTextEditor: mockTextEditor,
      showErrorMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      showQuickPick: vi.fn(),
      showSaveDialog: vi.fn(),
      showTextDocument: vi.fn(),
      withProgress: vi.fn((options, callback) => callback({ report: vi.fn() })),
    },
    workspace: {
      openTextDocument: vi.fn(() => Promise.resolve(mockTextDocument)),
      workspaceFolders: [
        {
          uri: {
            fsPath: '/test/workspace',
          },
        },
      ],
    },
    commands: {
      executeCommand: vi.fn(),
    },
    env: {
      clipboard: {
        writeText: vi.fn(),
      },
    },
    Uri: {
      file: vi.fn((path) => ({ fsPath: path })),
    },
    ProgressLocation: {
      Notification: 15,
    },
    Range: vi.fn(),
    Position: vi.fn(),
  };
});

describe('Export Command Tests', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock context
    mockContext = {
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
      },
      subscriptions: [],
    };
    
    // Ensure a valid activeTextEditor is present for tests by default
    (vscode.window as any).activeTextEditor = {
      document: {
        fileName: '/test/file.md',
        getText: vi.fn(() => '```mermaid\ngraph TD\nA --> B\n```'),
      },
      selection: {
        isEmpty: true,
      },
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('runExportCommand', () => {
    it('should handle no active editor gracefully', async () => {
      // Arrange
      const vscodeWindow = vscode.window as any;
      vscodeWindow.activeTextEditor = null;

      // Act
      await runExportCommand(mockContext);

      // Assert
      expect(vscodeWindow.showErrorMessage).toHaveBeenCalledWith(
        'No active document found. Please open a mermaid or markdown file.'
      );
    });

    it('should handle export throttling when cooldown active', async () => {
      // Arrange
  const mockGetInstance = vi.mocked(OperationTimeoutManager.getInstance as any);
  const mockTimeoutManagerInstance = mockGetInstance();
  mockTimeoutManagerInstance.canStartExport.mockReturnValue(false);
  mockTimeoutManagerInstance.getExportCooldownRemaining.mockReturnValue(5000);
      const vscodeWindow = vscode.window as any;

      // Act
      await runExportCommand(mockContext);

      // Assert
      expect(vscodeWindow.showWarningMessage).toHaveBeenCalledWith(
        'Please wait 5s before starting another export to prevent system overload.'
      );
    });

    it('should handle missing mermaid content', async () => {
      // Arrange
      const vscodeWindow = vscode.window as any;
      vscodeWindow.activeTextEditor.document.getText.mockReturnValue('No mermaid content here');
      
      // Act
      await runExportCommand(mockContext);

      // Assert
      expect(vscodeWindow.showErrorMessage).toHaveBeenCalledWith(
        'No mermaid diagram found. Ensure you have a ```mermaid code block or .mmd file open.'
      );
    });

    it('should successfully export with auto naming when preferAuto is true', async () => {
      // Arrange
      const vscodeWindow = vscode.window as any;
      
      // Mock user selections
      vscodeWindow.showQuickPick
        .mockResolvedValueOnce({ label: 'SVG', value: 'svg' }) // Format selection
        .mockResolvedValueOnce({ label: 'Default', value: 'default' }); // Theme selection
      
      vscodeWindow.showInformationMessage.mockResolvedValue('Open File');

      // Act
      await runExportCommand(mockContext, true);

      // Assert
      expect(vi.mocked(AutoNaming.generateSmartName)).toHaveBeenCalledWith({
        baseName: 'file',
        format: 'svg',
        content: 'graph TD\nA --> B',
        outputDirectory: '/test'
      });
      
  // The CLIExportStrategy constructor is mocked; check its exported mock instance was used
  const MockedCLIStrategyCtor = vi.mocked(CLIExportStrategy);
  const created = MockedCLIStrategyCtor.mock.results[0].value as any;
  expect(created.export).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalledWith('/test/output.svg', expect.any(Buffer));
    });

    it('should use save dialog when preferAuto is false', async () => {
      // Arrange
      const vscodeWindow = vscode.window as any;
      
      // Mock user selections
      vscodeWindow.showQuickPick
        .mockResolvedValueOnce({ label: 'PNG', value: 'png' }) // Format selection
        .mockResolvedValueOnce({ label: 'Dark', value: 'dark' }); // Theme selection
      
      vscodeWindow.showSaveDialog.mockResolvedValue({ fsPath: '/custom/path.png' });
      vscodeWindow.showInformationMessage.mockResolvedValue('Show in Explorer');

      // Act
      await runExportCommand(mockContext, false);

      // Assert
      const expectedDefault = path.join('\\test\\workspace', 'file.png');
      expect(vscodeWindow.showSaveDialog).toHaveBeenCalledWith({
        defaultUri: expect.objectContaining({ fsPath: expectedDefault }),
        filters: { 'PNG files': ['png'] },
        title: 'Save PNG file'
      });
      
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('revealFileInOS', expect.any(Object));
    });

    it('should handle user cancellation during format selection', async () => {
      // Arrange
      const vscodeWindow = vscode.window as any;
      vscodeWindow.showQuickPick.mockResolvedValueOnce(null); // User cancels format selection

      // Act
      await runExportCommand(mockContext);

      // Assert - should not proceed to export
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });

    it('should handle user cancellation during theme selection', async () => {
      // Arrange
      const vscodeWindow = vscode.window as any;
      vscodeWindow.showQuickPick
        .mockResolvedValueOnce({ label: 'SVG', value: 'svg' }) // Format selection
        .mockResolvedValueOnce(null); // User cancels theme selection

      // Act
      await runExportCommand(mockContext);

      // Assert - should not proceed to export
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });

    it('should fallback to web strategy when CLI unavailable', async () => {
      // Mock CLI strategy as unavailable
      const MockedCLIStrategy = vi.mocked(CLIExportStrategy);
      MockedCLIStrategy.mockImplementation(() => ({
        name: 'CLI Export Strategy',
        isAvailable: vi.fn(() => Promise.resolve(false)),
        export: vi.fn(),
      }) as any);
      
      const vscodeWindow = vscode.window as any;
      
      vscodeWindow.showQuickPick
        .mockResolvedValueOnce({ label: 'SVG', value: 'svg' })
        .mockResolvedValueOnce({ label: 'Default', value: 'default' });
      
      vscodeWindow.showInformationMessage.mockResolvedValue('Copy Path');

      // Act
      await runExportCommand(mockContext, true);

      // Assert
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('/test/output.svg');
    });

    it('should handle export strategy errors gracefully', async () => {
      // Mock CLI strategy to throw error
      const MockedCLIStrategy = vi.mocked(CLIExportStrategy);
      MockedCLIStrategy.mockImplementation(() => ({
        name: 'CLI Export Strategy',
        isAvailable: vi.fn(() => Promise.resolve(true)),
        export: vi.fn(() => Promise.reject(new Error('CLI export failed'))),
      }) as any);
      
      const vscodeWindow = vscode.window as any;
      
      vscodeWindow.showQuickPick
        .mockResolvedValueOnce({ label: 'SVG', value: 'svg' })
        .mockResolvedValueOnce({ label: 'Default', value: 'default' });

      // Act
      await runExportCommand(mockContext, true);

      // Assert
      expect(vscodeWindow.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Export failed:')
      );
    });

    it('should open document when documentUri is provided', async () => {
      // Arrange
      const mockUri = { fsPath: '/test/another-file.md' };
      const vscodeWindow = vscode.window as any;
      const vscodeWorkspace = vscode.workspace as any;
      
      vscodeWindow.showQuickPick
        .mockResolvedValueOnce({ label: 'PDF', value: 'pdf' })
        .mockResolvedValueOnce({ label: 'Forest', value: 'forest' });

      // Act
      await runExportCommand(mockContext, true, mockUri as vscode.Uri);

      // Assert
      expect(vscodeWorkspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(vscodeWindow.showTextDocument).toHaveBeenCalledWith(
        expect.any(Object),
        { preview: false }
      );
    });
  });

  describe('Helper Functions', () => {
    it('should extract mermaid content from .mmd files', async () => {
      // This tests the extractMermaidContent function indirectly
      const vscodeWindow = vscode.window as any;
      vscodeWindow.activeTextEditor.document.fileName = '/test/file.mmd';
      vscodeWindow.activeTextEditor.document.getText.mockReturnValue('graph TD\nA --> B');
      
      vscodeWindow.showQuickPick
        .mockResolvedValueOnce({ label: 'SVG', value: 'svg' })
        .mockResolvedValueOnce({ label: 'Default', value: 'default' });

      await runExportCommand(mockContext, true);

      // Assert that the content was processed correctly
      expect(fs.promises.writeFile).toHaveBeenCalledWith('/test/output.svg', expect.any(Buffer));
    });

    it('should extract mermaid content from markdown code blocks', async () => {
      const vscodeWindow = vscode.window as any;
      vscodeWindow.activeTextEditor.document.fileName = '/test/file.md';
      vscodeWindow.activeTextEditor.document.getText.mockReturnValue(
        '# My Document\n\n```mermaid\nflowchart LR\nX --> Y\n```\n\nMore content'
      );
      
      vscodeWindow.showQuickPick
        .mockResolvedValueOnce({ label: 'SVG', value: 'svg' })
        .mockResolvedValueOnce({ label: 'Default', value: 'default' });

      await runExportCommand(mockContext, true);

      // Assert that the content was processed correctly
      expect(fs.promises.writeFile).toHaveBeenCalledWith('/test/output.svg', expect.any(Buffer));
    });

    it('should handle selected text with mermaid syntax', async () => {
      const vscodeWindow = vscode.window as any;
      vscodeWindow.activeTextEditor.selection = {
        isEmpty: false,
      };
      vscodeWindow.activeTextEditor.document.getText.mockImplementation((selection) => {
        if (selection) {
          return 'sequenceDiagram\nAlice -> Bob: Hello';
        }
        return '# Document with various content';
      });
      
      vscodeWindow.showQuickPick
        .mockResolvedValueOnce({ label: 'SVG', value: 'svg' })
        .mockResolvedValueOnce({ label: 'Default', value: 'default' });

      await runExportCommand(mockContext, true);

      // Assert that the content was processed correctly
      expect(fs.promises.writeFile).toHaveBeenCalledWith('/test/output.svg', expect.any(Buffer));
    });
  });
});
