import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate, deactivate } from '../../../src/extension';
import { ConfigManager } from '../../../src/services/configManager';
import { CLIExportStrategy } from '../../../src/strategies/cliExportStrategy';
import { WebExportStrategy } from '../../../src/strategies/webExportStrategy';
import { OnboardingManager } from '../../../src/services/onboardingManager';
import { StatusBarManager } from '../../../src/ui/statusBarManager';
import { ThemeStatusBarManager } from '../../../src/ui/themeStatusBarManager';
import { FormatPreferenceManager } from '../../../src/services/formatPreferenceManager';
import { BackgroundHealthMonitor } from '../../../src/services/backgroundHealthMonitor';
import { ErrorHandler } from '../../../src/ui/errorHandler';

// Mock VS Code APIs
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn()
  },
  languages: {
    registerCodeLensProvider: vi.fn(),
    registerHoverProvider: vi.fn()
  },
  window: {
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showQuickPick: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    withProgress: vi.fn(),
    showWarningMessage: vi.fn(),
    createStatusBarItem: vi.fn(() => ({
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
      text: '',
      tooltip: '',
      command: ''
    }))
  },
  workspace: {
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    openTextDocument: vi.fn()
  },
  ExtensionContext: vi.fn(),
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path }))
  },
  ProgressLocation: {
    Notification: 'notification'
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2
  },
  ThemeColor: vi.fn(),
  TreeItem: vi.fn(),
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  }
}));

// Mock services and strategies
vi.mock('../../../src/services/configManager');
vi.mock('../../../src/strategies/cliExportStrategy');
vi.mock('../../../src/strategies/webExportStrategy');
vi.mock('../../../src/services/onboardingManager');
vi.mock('../../../src/ui/statusBarManager');
vi.mock('../../../src/ui/themeStatusBarManager');
vi.mock('../../../src/services/formatPreferenceManager');
vi.mock('../../../src/services/backgroundHealthMonitor');
vi.mock('../../../src/ui/errorHandler');

// Mock commands
vi.mock('../../../src/commands/exportCommand');
vi.mock('../../../src/commands/exportAllCommand');
vi.mock('../../../src/commands/batchExportCommand.v2');
vi.mock('../../../src/commands/watchCommand');
vi.mock('../../../src/commands/diagnosticsCommand');
vi.mock('../../../src/commands/debugCommand');

// Mock providers
vi.mock('../../../src/providers/mermaidCodeLensProvider');
vi.mock('../../../src/providers/mermaidHoverProvider');

// Mock UI components
vi.mock('../../../src/ui/batchExportStatusBarManager');

describe('Extension Activation', () => {
  let mockContext: vscode.ExtensionContext;
  let consoleSpy: vi.SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock context
    mockContext = {
      subscriptions: [],
      globalState: {
        get: vi.fn(),
        update: vi.fn()
      },
      workspaceState: {
        get: vi.fn(),
        update: vi.fn()
      }
    } as any;

    // Setup console spy
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock service constructors
    (ConfigManager as any).mockImplementation(() => ({
      onConfigurationChanged: vi.fn(() => ({ dispose: vi.fn() }))
    }));

    (CLIExportStrategy as any).mockImplementation(() => ({}));
    (WebExportStrategy as any).mockImplementation(() => ({}));
    (OnboardingManager as any).mockImplementation(() => ({
      maybeShowWelcome: vi.fn().mockResolvedValue(undefined)
    }));

    (StatusBarManager as any).mockImplementation(() => ({
      refresh: vi.fn().mockResolvedValue(undefined),
      onConfigurationChanged: vi.fn()
    }));

    (ThemeStatusBarManager as any).mockImplementation(() => ({
      onConfigurationChanged: vi.fn()
    }));

    (FormatPreferenceManager as any).mockImplementation(() => ({}));
    (BackgroundHealthMonitor.getInstance as any).mockReturnValue({
      start: vi.fn()
    });

    (ErrorHandler.initialize as any).mockImplementation(() => {});
    (ErrorHandler.logInfo as any).mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('activate()', () => {
    it('should initialize all services successfully', async () => {
      await activate(mockContext);

      expect(ErrorHandler.initialize).toHaveBeenCalled();
      expect(ConfigManager).toHaveBeenCalledWith();
      expect(CLIExportStrategy).toHaveBeenCalledWith();
      expect(OnboardingManager).toHaveBeenCalledWith(mockContext);
      expect(StatusBarManager).toHaveBeenCalledWith(mockContext, expect.any(Object));
      expect(ThemeStatusBarManager).toHaveBeenCalledWith(mockContext);
      expect(FormatPreferenceManager).toHaveBeenCalledWith(mockContext);
      expect(BackgroundHealthMonitor.getInstance).toHaveBeenCalledWith(mockContext);
    });

    it('should register all commands', async () => {
      const registerCommandSpy = vi.spyOn(vscode.commands, 'registerCommand');

      await activate(mockContext);

      // Verify command registration calls
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.exportCurrent',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.exportAs',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.exportAll',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.batchExport',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.showOutput',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.debugExport',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.runSetup',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.cancelBatchExport',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.toggleAutoExport',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.exportMarkdownBlock',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.statusBarClick',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.cycleTheme',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.showExportOptions',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.exportFile',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.diagnostics',
        expect.any(Function)
      );
      expect(registerCommandSpy).toHaveBeenCalledWith(
        'mermaidExportPro.healthCheck',
        expect.any(Function)
      );
    });

    it('should register providers for markdown and mermaid files', async () => {
      const registerCodeLensSpy = vi.spyOn(vscode.languages, 'registerCodeLensProvider');
      const registerHoverSpy = vi.spyOn(vscode.languages, 'registerHoverProvider');

      await activate(mockContext);

      expect(registerCodeLensSpy).toHaveBeenCalledWith(
        [{ language: 'markdown' }, { language: 'mermaid' }],
        expect.any(Object)
      );
      expect(registerHoverSpy).toHaveBeenCalledWith(
        [{ language: 'markdown' }, { language: 'mermaid' }],
        expect.any(Object)
      );
    });

    it('should show onboarding for new users', async () => {
      const mockOnboardingManager = {
        maybeShowWelcome: vi.fn().mockResolvedValue(undefined)
      };
      (OnboardingManager as any).mockImplementation(() => mockOnboardingManager);

      await activate(mockContext);

      expect(mockOnboardingManager.maybeShowWelcome).toHaveBeenCalled();
    });

    it('should initialize auto-export', async () => {
      const { initializeAutoExport } = await import('../../../src/commands/watchCommand');
      const initializeSpy = vi.mocked(initializeAutoExport);

      await activate(mockContext);

      expect(initializeSpy).toHaveBeenCalledWith(mockContext);
    });

    it('should refresh status bar after onboarding', async () => {
      const mockStatusBarManager = {
        refresh: vi.fn().mockResolvedValue(undefined),
        onConfigurationChanged: vi.fn()
      };
      (StatusBarManager as any).mockImplementation(() => mockStatusBarManager);

      await activate(mockContext);

      expect(mockStatusBarManager.refresh).toHaveBeenCalled();
    });

    it('should start background health monitoring', async () => {
      const mockHealthMonitor = {
        start: vi.fn()
      };
      (BackgroundHealthMonitor.getInstance as any).mockReturnValue(mockHealthMonitor);

      await activate(mockContext);

      expect(mockHealthMonitor.start).toHaveBeenCalled();
    });

    it('should register configuration change listener', async () => {
      const mockConfigManager = {
        onConfigurationChanged: vi.fn(() => ({ dispose: vi.fn() }))
      };
      (ConfigManager as any).mockImplementation(() => mockConfigManager);

      await activate(mockContext);

      expect(mockConfigManager.onConfigurationChanged).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should add all disposables to context subscriptions', async () => {
      await activate(mockContext);

      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });

    it('should log activation success', async () => {
      await activate(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('[mermaidExportPro] Activating extension...');
      expect(ErrorHandler.logInfo).toHaveBeenCalledWith('Mermaid Export Pro extension activated successfully');
    });

    it('should handle activation errors gracefully', async () => {
      const mockError = new Error('Test activation error');
      (ConfigManager as any).mockImplementation(() => {
        throw mockError;
      });

      await activate(mockContext);

      expect(ErrorHandler.handleError).toHaveBeenCalledWith(
        mockError,
        'Extension Activation'
      );
    });
  });

  describe('deactivate()', () => {
    it('should dispose error handler', () => {
      const disposeSpy = vi.fn();
      (ErrorHandler.dispose as any) = disposeSpy;

      deactivate();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should dispose auto-export', async () => {
      const { disposeAutoExport } = await import('../../../src/commands/watchCommand');
      const disposeSpy = vi.mocked(disposeAutoExport);

      deactivate();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should log deactivation', () => {
      deactivate();

      expect(consoleSpy).toHaveBeenCalledWith('Mermaid Export Pro extension deactivated');
    });
  });

  describe('Command Handlers', () => {
    let mockRunExportCommand: any;
    let mockRunExportAllCommand: any;
    let mockRunBatchExport: any;
    let mockRunDebugExport: any;
    let mockToggleAutoExport: any;
    let mockRunDiagnosticsCommand: any;
    let mockRunQuickHealthCheck: any;

    beforeEach(async () => {
      // Import and mock command functions
      const exportCommand = await import('../../../src/commands/exportCommand');
      const exportAllCommand = await import('../../../src/commands/exportAllCommand');
      const batchExportCommand = await import('../../../src/commands/batchExportCommand.v2');
      const debugCommand = await import('../../../src/commands/debugCommand');
      const watchCommand = await import('../../../src/commands/watchCommand');
      const diagnosticsCommand = await import('../../../src/commands/diagnosticsCommand');

      mockRunExportCommand = vi.mocked(exportCommand.runExportCommand);
      mockRunExportAllCommand = vi.mocked(exportAllCommand.runExportAllCommand);
      mockRunBatchExport = vi.mocked(batchExportCommand.runBatchExport);
      mockRunDebugExport = vi.mocked(debugCommand.runDebugExport);
      mockToggleAutoExport = vi.mocked(watchCommand.toggleAutoExport);
      mockRunDiagnosticsCommand = vi.mocked(diagnosticsCommand.runDiagnosticsCommand);
      mockRunQuickHealthCheck = vi.mocked(diagnosticsCommand.runQuickHealthCheck);

      // Mock successful command executions
      mockRunExportCommand.mockResolvedValue(undefined);
      mockRunExportAllCommand.mockResolvedValue(undefined);
      mockRunBatchExport.mockResolvedValue(undefined);
      mockRunDebugExport.mockResolvedValue(undefined);
      mockToggleAutoExport.mockResolvedValue(undefined);
      mockRunDiagnosticsCommand.mockResolvedValue(undefined);
      mockRunQuickHealthCheck.mockResolvedValue(undefined);
    });

    it('should handle exportCurrent command successfully', async () => {
      await activate(mockContext);

      // Find the exportCurrent command registration
      const registerCommandSpy = vi.mocked(vscode.commands.registerCommand);
      const exportCurrentCall = registerCommandSpy.mock.calls.find(
        call => call[0] === 'mermaidExportPro.exportCurrent'
      );

      expect(exportCurrentCall).toBeDefined();

      const commandHandler = exportCurrentCall![1];
      await commandHandler();

      expect(mockRunExportCommand).toHaveBeenCalledWith(mockContext, false, undefined);
    });

    it('should handle exportAs command successfully', async () => {
      await activate(mockContext);

      const registerCommandSpy = vi.mocked(vscode.commands.registerCommand);
      const exportAsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === 'mermaidExportPro.exportAs'
      );

      expect(exportAsCall).toBeDefined();

      const commandHandler = exportAsCall![1];
      await commandHandler();

      expect(mockRunExportCommand).toHaveBeenCalledWith(mockContext, true, undefined);
    });

    it('should handle exportAll command successfully', async () => {
      await activate(mockContext);

      const registerCommandSpy = vi.mocked(vscode.commands.registerCommand);
      const exportAllCall = registerCommandSpy.mock.calls.find(
        call => call[0] === 'mermaidExportPro.exportAll'
      );

      expect(exportAllCall).toBeDefined();

      const commandHandler = exportAllCall![1];
      await commandHandler();

      expect(mockRunExportAllCommand).toHaveBeenCalledWith(mockContext, undefined);
    });

    it('should handle batchExport command successfully', async () => {
      await activate(mockContext);

      const registerCommandSpy = vi.mocked(vscode.commands.registerCommand);
      const batchExportCall = registerCommandSpy.mock.calls.find(
        call => call[0] === 'mermaidExportPro.batchExport'
      );

      expect(batchExportCall).toBeDefined();

      const commandHandler = batchExportCall![1];
      await commandHandler();

      expect(mockRunBatchExport).toHaveBeenCalledWith(mockContext, undefined);
    });

    it('should handle debugExport command successfully', async () => {
      await activate(mockContext);

      const registerCommandSpy = vi.mocked(vscode.commands.registerCommand);
      const debugExportCall = registerCommandSpy.mock.calls.find(
        call => call[0] === 'mermaidExportPro.debugExport'
      );

      expect(debugExportCall).toBeDefined();

      const commandHandler = debugExportCall![1];
      await commandHandler();

      expect(mockRunDebugExport).toHaveBeenCalledWith(mockContext);
    });

    it('should handle toggleAutoExport command successfully', async () => {
      await activate(mockContext);

      const registerCommandSpy = vi.mocked(vscode.commands.registerCommand);
      const toggleAutoExportCall = registerCommandSpy.mock.calls.find(
        call => call[0] === 'mermaidExportPro.toggleAutoExport'
      );

      expect(toggleAutoExportCall).toBeDefined();

      const commandHandler = toggleAutoExportCall![1];
      await commandHandler();

      expect(mockToggleAutoExport).toHaveBeenCalledWith(mockContext);
    });

    it('should handle diagnostics command successfully', async () => {
      await activate(mockContext);

      const registerCommandSpy = vi.mocked(vscode.commands.registerCommand);
      const diagnosticsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === 'mermaidExportPro.diagnostics'
      );

      expect(diagnosticsCall).toBeDefined();

      const commandHandler = diagnosticsCall![1];
      await commandHandler();

      expect(mockRunDiagnosticsCommand).toHaveBeenCalled();
    });

    it('should handle healthCheck command successfully', async () => {
      await activate(mockContext);

      const registerCommandSpy = vi.mocked(vscode.commands.registerCommand);
      const healthCheckCall = registerCommandSpy.mock.calls.find(
        call => call[0] === 'mermaidExportPro.healthCheck'
      );

      expect(healthCheckCall).toBeDefined();

      const commandHandler = healthCheckCall![1];
      await commandHandler();

      expect(mockRunQuickHealthCheck).toHaveBeenCalled();
    });

    it('should handle command errors gracefully', async () => {
      const mockError = new Error('Command failed');
      mockRunExportCommand.mockRejectedValue(mockError);

      await activate(mockContext);

      const registerCommandSpy = vi.mocked(vscode.commands.registerCommand);
      const exportCurrentCall = registerCommandSpy.mock.calls.find(
        call => call[0] === 'mermaidExportPro.exportCurrent'
      );

      const commandHandler = exportCurrentCall![1];
      await commandHandler();

      expect(ErrorHandler.handleError).toHaveBeenCalledWith(
        mockError,
        'Export Current'
      );
    });
  });
});
