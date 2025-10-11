import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { runDiagnosticsCommand, runQuickHealthCheck } from '../../../commands/diagnosticsCommand';
import * as vscode from 'vscode';
import { OperationTimeoutManager } from '../../../services/operationTimeoutManager';

// Mock vscode
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn()
    })),
    showWarningMessage: vi.fn(() => Promise.resolve(undefined)),
    showInformationMessage: vi.fn(() => Promise.resolve(undefined)),
    createStatusBarItem: vi.fn(() => ({
      text: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn()
    }))
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue: any) => defaultValue)
    }))
  },
  version: '1.85.0',
  StatusBarAlignment: {
    Right: 2
  }
}));

// Mock OperationTimeoutManager
vi.mock('../../../services/operationTimeoutManager', () => ({
  OperationTimeoutManager: {
    getInstance: vi.fn()
  }
}));

// Mock strategies
vi.mock('../../../strategies/cliExportStrategy', () => ({
  CLIExportStrategy: class {
    async isAvailable() { return true; }
    getRequiredDependencies() { return ['@mermaid-js/mermaid-cli']; }
  }
}));

vi.mock('../../../strategies/webExportStrategy', () => ({
  WebExportStrategy: class {
    async isAvailable() { return true; }
  }
}));

describe('diagnosticsCommand', () => {
  let mockOutputChannel: any;
  let mockTimeoutManager: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOutputChannel = {
      clear: vi.fn(),
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn()
    };

    mockTimeoutManager = {
      getActiveOperations: vi.fn(),
      emergencyCleanup: vi.fn()
    };

    vi.mocked(vscode.window.createOutputChannel).mockReturnValue(mockOutputChannel);
    vi.mocked(OperationTimeoutManager.getInstance).mockReturnValue(mockTimeoutManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runDiagnosticsCommand()', () => {
    it('should create output channel and display diagnostics report', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([]);

      await runDiagnosticsCommand();

      expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Mermaid Export Pro - Diagnostics');
      expect(mockOutputChannel.clear).toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should show "all clear" when no active operations', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([]);

      await runDiagnosticsCommand();

      const calls = mockOutputChannel.appendLine.mock.calls.map((call: any) => call[0]);
      const hasAllClear = calls.some((line: string) => line.includes('No active operations'));
      
      expect(hasAllClear).toBe(true);
    });

    it('should list active operations with details', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([
        {
          id: 'op-123',
          name: 'Export Operation',
          duration: 5000,
          isWarned: false
        },
        {
          id: 'op-456',
          name: 'Export Folder',
          duration: 15000,
          isWarned: true
        }
      ]);

      await runDiagnosticsCommand();

      const calls = mockOutputChannel.appendLine.mock.calls.map((call: any) => call[0]);
      const hasOperation1 = calls.some((line: string) => line.includes('Export Operation'));
      const hasOperation2 = calls.some((line: string) => line.includes('Export Folder'));
      
      expect(hasOperation1).toBe(true);
      expect(hasOperation2).toBe(true);
    });

    it('should show emergency cleanup option for long-running operations', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([
        {
          id: 'op-stuck',
          name: 'Stuck Operation',
          duration: 60000,
          isWarned: true
        }
      ]);

      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('Keep Monitoring' as any);

      await runDiagnosticsCommand();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('long-running operation'),
        'Emergency Cleanup',
        'Keep Monitoring',
        'Show Details'
      );
    });

    it('should perform emergency cleanup when user chooses it', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([
        {
          id: 'op-stuck',
          name: 'Stuck Operation',
          duration: 60000,
          isWarned: true
        }
      ]);

      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('Emergency Cleanup' as any);

      await runDiagnosticsCommand();

      expect(mockTimeoutManager.emergencyCleanup).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('cleaned up')
      );
    });

    it('should show output channel when user chooses Show Details', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([
        {
          id: 'op-stuck',
          name: 'Stuck Operation',
          duration: 60000,
          isWarned: true
        }
      ]);

      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('Show Details' as any);

      await runDiagnosticsCommand();

      expect(mockOutputChannel.show).toHaveBeenCalled();
    });

    it('should display system information', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([]);

      await runDiagnosticsCommand();

      const calls = mockOutputChannel.appendLine.mock.calls.map((call: any) => call[0]);
      const hasSystemInfo = calls.some((line: string) => 
        line.includes('Platform') || line.includes('Node.js Version')
      );
      
      expect(hasSystemInfo).toBe(true);
    });

    it('should display memory usage information', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([]);

      await runDiagnosticsCommand();

      const calls = mockOutputChannel.appendLine.mock.calls.map((call: any) => call[0]);
      const hasMemoryInfo = calls.some((line: string) => 
        line.includes('MEMORY USAGE') || line.includes('Heap')
      );
      
      expect(hasMemoryInfo).toBe(true);
    });

    it('should check CLI strategy availability', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([]);

      await runDiagnosticsCommand();

      const calls = mockOutputChannel.appendLine.mock.calls.map((call: any) => call[0]);
      const hasCLICheck = calls.some((line: string) => 
        line.includes('CLI Export Strategy')
      );
      
      expect(hasCLICheck).toBe(true);
    });

    it('should check web strategy availability', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([]);

      await runDiagnosticsCommand();

      const calls = mockOutputChannel.appendLine.mock.calls.map((call: any) => call[0]);
      const hasWebCheck = calls.some((line: string) => 
        line.includes('Web Export Strategy')
      );
      
      expect(hasWebCheck).toBe(true);
    });

    it('should handle errors when checking strategy availability', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([]);

      // Mock require to throw error
      const originalRequire = require;
      (global as any).require = vi.fn(() => {
        throw new Error('Module not found');
      });

      await runDiagnosticsCommand();

      // Restore require
      (global as any).require = originalRequire;

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });
  });

  describe('runQuickHealthCheck()', () => {
    it('should show information message when no active operations', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([]);

      await runQuickHealthCheck();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        '✅ No hanging operations detected'
      );
    });

    it('should show warning with active operations', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([
        { id: 'op-1', name: 'Test', duration: 5000, isWarned: false }
      ]);

      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(undefined);

      await runQuickHealthCheck();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 active operation'),
        'Show Details',
        'Emergency Cleanup',
        'Monitor'
      );
    });

    it('should run full diagnostics when user chooses Show Details', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([
        { id: 'op-1', name: 'Test', duration: 5000, isWarned: false }
      ]);

      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('Show Details' as any);

      await runQuickHealthCheck();

      // Should have called diagnostics (which creates output channel)
      expect(vscode.window.createOutputChannel).toHaveBeenCalled();
    });

    it('should perform emergency cleanup when user chooses it', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([
        { id: 'op-1', name: 'Test', duration: 5000, isWarned: false }
      ]);

      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('Emergency Cleanup' as any);

      await runQuickHealthCheck();

      expect(mockTimeoutManager.emergencyCleanup).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Emergency cleanup completed'
      );
    });

    it('should show monitor status bar when user chooses Monitor', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([
        { id: 'op-1', name: 'Test', duration: 5000, isWarned: false }
      ]);

      const mockStatusItem = {
        text: '',
        tooltip: '',
        command: '',
        show: vi.fn(),
        dispose: vi.fn()
      };

      vi.mocked(vscode.window.createStatusBarItem).mockReturnValue(mockStatusItem as any);
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('Monitor' as any);

      await runQuickHealthCheck();

      expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
      expect(mockStatusItem.show).toHaveBeenCalled();
    });

    it('should handle undefined user choice gracefully', async () => {
      mockTimeoutManager.getActiveOperations.mockReturnValue([]);

      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(undefined);

      await expect(runQuickHealthCheck()).resolves.not.toThrow();
    });
  });
});
