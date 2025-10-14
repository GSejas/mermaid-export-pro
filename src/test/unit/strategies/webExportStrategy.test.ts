import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { WebExportStrategy } from '../../../strategies/webExportStrategy';

// Helpers to build a mock webview panel
function createMockPanel() {
  const listeners: any[] = [];

  const webview = {
    html: '',
    cspSource: 'vscode-resource:',
    postMessage: vi.fn(() => Promise.resolve(true)),
    onDidReceiveMessage: (cb: any) => {
      listeners.push(cb);
      return { dispose: vi.fn() } as any;
    },
    asWebviewUri: vi.fn((uri: any) => ({ toString: () => uri.path || uri.fsPath }))
  } as any;

  const panel: any = {
    webview,
    dispose: vi.fn(),
  };

  // helper to simulate incoming messages
  const sendMessage = (msg: any) => {
    for (const cb of listeners) {cb(msg);}
  };

  return { panel, webview, sendMessage };
}

describe('WebExportStrategy', () => {
  let context: any;

  beforeEach(() => {
    vi.resetAllMocks();

    context = {
      extensionUri: { fsPath: '/ext' },
      subscriptions: []
    } as any;

    // Ensure vscode.Uri helpers exist for the strategy
    (vscode as any).Uri = (vscode as any).Uri || {};
    (vscode as any).Uri.joinPath = (base: any, ...parts: string[]) => {
      return { fsPath: `${(base && (base.fsPath || base.path)) || ''}/${parts.join('/')}` } as any;
    };
    (vscode as any).Uri.file = (p: string) => ({ fsPath: p });
  // Ensure ViewColumn enum exists for creating panels
  (vscode as any).ViewColumn = (vscode as any).ViewColumn || {};
  (vscode as any).ViewColumn.Beside = (vscode as any).ViewColumn.Beside || 2;

    // Mock workspace.fs.stat to behave for isAvailable tests
    (vscode.workspace as any).fs = {
      stat: vi.fn((uri: any) => {
        if ((uri.path && uri.path.includes('webview.js')) || (uri.fsPath && uri.fsPath.includes('webview.js'))) {return Promise.resolve({});}
        return Promise.reject(new Error('not found'));
      })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isAvailable returns true when bundled script exists', async () => {
    const strategy = new WebExportStrategy(context);
    const ok = await strategy.isAvailable();
    expect(ok).toBe(true);
  });

  it('isAvailable returns false when bundled script missing', async () => {
    // Make stat reject always
    vi.spyOn(vscode.workspace, 'fs', 'get').mockReturnValue({ stat: vi.fn(() => Promise.reject(new Error('missing'))) } as any);
    const strategy = new WebExportStrategy(context);
    const ok = await strategy.isAvailable();
    expect(ok).toBe(false);
  });

  it('export returns svg buffer when webview sends svg', async () => {
  const { panel, webview, sendMessage } = createMockPanel();

  // Mock creation of panel
  (vscode.window as any).createWebviewPanel = vi.fn(() => panel as any);

    // When postMessage('render') is called, simulate the webview lifecycle: ready -> svg
    const strategy = new WebExportStrategy(context);

    // Simulate ready and svg messages after a tick
    setTimeout(() => sendMessage({ type: 'ready' }), 0);
    setTimeout(() => sendMessage({ type: 'svg', svg: '<svg>ok</svg>' }), 10);

    const buf = await strategy.export('graph TD\nA --> B', { format: 'svg', theme: 'default', width: 400, height: 200 });
    expect(buf.toString('utf8')).toContain('<svg>ok</svg>');
    expect(panel.dispose).toHaveBeenCalled();
  });

  it('export converts svg to png via conversion message', async () => {
    const { panel, webview, sendMessage } = createMockPanel();
  (vscode.window as any).createWebviewPanel = vi.fn(() => panel as any);

    const strategy = new WebExportStrategy(context);

    // Simulate ready then svg, then conversion success after convert postMessage
    setTimeout(() => sendMessage({ type: 'ready' }), 0);
    setTimeout(() => sendMessage({ type: 'svg', svg: '<svg>ok</svg>' }), 5);
    // When postMessage('convert') is invoked by convertSvgToFormat, simulate conversion result
    webview.postMessage.mockImplementationOnce(() => {
      setTimeout(() => sendMessage({ type: 'conversion_success', data: 'data:image/png;base64,' + Buffer.from('PNGDATA').toString('base64') }), 10);
      return Promise.resolve(true);
    });

    const buf = await strategy.export('graph TD\nA --> B', { format: 'png', theme: 'default', width: 400, height: 200 });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.toString()).toContain('PNGDATA');
  });
});
