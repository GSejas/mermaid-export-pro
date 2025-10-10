import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { ErrorHandler } from '../../../ui/errorHandler';
import { MermaidExportError } from '../../../types';

vi.mock('vscode', async () => {
  // define dummy output channel inside factory so hoisting doesn't break
  class DummyOutputChannel {
    lines: string[] = [];
    shown = false;
    appendLine(line: string) { this.lines.push(line); }
    show() { this.shown = true; }
    dispose() {}
  }

  const actual = await vi.importActual<typeof import('vscode')>('vscode');
  const output = new DummyOutputChannel();
  return {
    ...actual,
    // minimal required exports used by ErrorHandler.openIssueReporter
    version: '1.0.0',
    Uri: {
      // minimal parse implementation for tests
      parse: (s: string) => ({ toString: () => s, fsPath: s })
    },
    window: {
      createOutputChannel: () => output,
      showErrorMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      createTerminal: vi.fn(() => ({ sendText: vi.fn(), show: vi.fn() })),
      showSaveDialog: vi.fn()
    },
    env: {
      openExternal: vi.fn()
    }
  };
});

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // ensure fresh init
    ErrorHandler.dispose();
  });

  afterEach(() => {
    ErrorHandler.dispose();
  });

  it('createErrorInfo returns expected object', () => {
    const info = ErrorHandler.createErrorInfo('TEST_CODE', 'Test message', 'Details', 'Recovery');
    expect(info.code).toBe('TEST_CODE');
    expect(info.message).toBe('Test message');
    expect(info.details).toBe('Details');
    expect(info.recoveryAction).toBe('Recovery');
  });

  it('log methods append lines to output channel', () => {
    // initialize channel
    ErrorHandler.logInfo('info message');
    ErrorHandler.logWarning('warn message');
    ErrorHandler.logError('error message');

    // Access the mocked output channel via vscode.window.createOutputChannel
    const oc = (vscode as any).window.createOutputChannel();
    expect(oc.lines.some((l: string) => l.includes('info message'))).toBe(true);
    expect(oc.lines.some((l: string) => l.includes('warn message'))).toBe(true);
    expect(oc.lines.some((l: string) => l.includes('error message'))).toBe(true);
  });

  it('handleGenericError shows error message and opens issue reporter when requested', async () => {
    const err = new Error('generic failure');
  const showError = (vscode as any).window.showErrorMessage as unknown as ReturnType<typeof vi.fn>;
    // simulate user selecting 'Report Issue'
    showError.mockResolvedValue('Report Issue');

    await ErrorHandler.handleError(err, 'context');

    // openExternal should have been called via openIssueReporter
    expect((vscode as any).env.openExternal).toHaveBeenCalled();
  });

  it('handleGenericError shows log when Show Log is selected', async () => {
    const err = new Error('generic failure 2');
  const showError = (vscode as any).window.showErrorMessage as unknown as ReturnType<typeof vi.fn>;
    showError.mockResolvedValue('Show Log');

    await ErrorHandler.handleError(err);

    const oc = (vscode as any).window.createOutputChannel();
    expect(oc.shown).toBe(true);
  });

  it('handleMermaidError triggers recovery action when selected', async () => {
  const showError = (vscode as any).window.showErrorMessage as unknown as ReturnType<typeof vi.fn>;
  const showInfo = (vscode as any).window.showInformationMessage as unknown as ReturnType<typeof vi.fn>;
  // create a mermaid error with a recovery action
  const info = ErrorHandler.createErrorInfo('CLI_NOT_INSTALLED', 'CLI missing', undefined, 'Install via npm');
  const mer = new MermaidExportError(info);

  // simulate selecting the recovery action on showError
  showError.mockResolvedValue('Install via npm');
  // simulate user selecting "Install via npm" on the subsequent information message
  showInfo.mockResolvedValue('Install via npm');

  await ErrorHandler.handleError(mer);

  // createTerminal should have been called
  expect((vscode as any).window.createTerminal).toHaveBeenCalled();
  });
});
