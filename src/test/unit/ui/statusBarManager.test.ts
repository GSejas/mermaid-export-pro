import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { StatusBarManager } from '../../../ui/statusBarManager';
import { OnboardingManager } from '../../../services/onboardingManager';

suite('StatusBarManager Tests', () => {
  let statusBarManager: StatusBarManager;
  let mockContext: vscode.ExtensionContext;
  let mockOnboardingManager: OnboardingManager;
  let mockStatusBarItem: any;

  setup(() => {
    // Mock VS Code API
    mockStatusBarItem = {
      text: '',
      tooltip: '',
      show: sinon.stub(),
      hide: sinon.stub(),
      dispose: sinon.stub(),
      backgroundColor: undefined,
      color: undefined,
      command: ''
    };

    sinon.stub(vscode.window, 'createStatusBarItem').returns(mockStatusBarItem);
    
    // Mock extension context
    mockContext = {
      subscriptions: [],
      globalState: {
        get: sinon.stub(),
        update: sinon.stub()
      }
    } as any;

    // Mock onboarding manager
    mockOnboardingManager = {} as OnboardingManager;

    statusBarManager = new StatusBarManager(mockContext, mockOnboardingManager);
  });

  teardown(() => {
    sinon.restore();
  });

  suite('Display Format Tests', () => {
    test('icon-only format shows only icon', async () => {
      // Mock configuration
      const mockConfig = {
        get: sinon.stub().returns('icon-only')
      };
      sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

      // Mock active editor with mermaid content
      const mockDocument = {
        fileName: 'test.mmd',
        getText: () => 'graph TD\n  A --> B'
      };
      const mockEditor = { document: mockDocument };
      sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

      // Set status to CLI available so buildStatusBarContent works
      (statusBarManager as any).currentState = { status: 'cli-available' };

      // Trigger update
      await (statusBarManager as any).updateStatusBar();

      // Should show only icon, no count
      assert.ok(mockStatusBarItem.text.includes('$(file-media)'));
      assert.ok(!mockStatusBarItem.text.includes('1'));
    });

    test('icon-count format shows icon and number', async () => {
      // Mock configuration
      const mockConfig = {
        get: sinon.stub().returns('icon-count')
      };
      sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

      // Mock active editor with mermaid content
      const mockDocument = {
        fileName: 'test.mmd',
        getText: () => 'graph TD\n  A --> B'
      };
      const mockEditor = { document: mockDocument };
      sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

      // Set status to CLI available so buildStatusBarContent works
      (statusBarManager as any).currentState = { status: 'cli-available' };

      // Trigger update
      await (statusBarManager as any).updateStatusBar();

      // Should show icon and count
      assert.ok(mockStatusBarItem.text.includes('$(file-media)'));
      assert.ok(mockStatusBarItem.text.includes(' 1'));
    });

    test('text-count format shows icon and "N Mermaids"', async () => {
      // Mock configuration
      const mockConfig = {
        get: sinon.stub().returns('text-count')
      };
      sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

      // Mock markdown file with multiple mermaid blocks
      const mockDocument = {
        fileName: 'test.md',
        getText: () => '```mermaid\ngraph TD\n  A --> B\n```\n\n```mermaid\ngraph LR\n  C --> D\n```'
      };
      const mockEditor = { document: mockDocument };
      sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

      // Set status to CLI available so buildStatusBarContent works
      (statusBarManager as any).currentState = { status: 'cli-available' };

      // Trigger update
      await (statusBarManager as any).updateStatusBar();

      // Should show icon and "2 Mermaids"
      assert.ok(mockStatusBarItem.text.includes('$(file-media)'));
      assert.ok(mockStatusBarItem.text.includes('2 Mermaids'));
    });
  });

  suite('Mermaid Detection Tests', () => {
    test('detects single mermaid block in markdown', () => {
      const content = 'Some text\n\n```mermaid\ngraph TD\n  A --> B\n```\n\nMore text';
      const count = (statusBarManager as any).countMermaidBlocksInMarkdown(content);
      assert.strictEqual(count, 1);
    });

    test('detects multiple mermaid blocks', () => {
      const content = '```mermaid\ngraph TD\n  A --> B\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: Hello\n```';
      const count = (statusBarManager as any).countMermaidBlocksInMarkdown(content);
      assert.strictEqual(count, 2);
    });

    test('handles mermaid blocks with extra whitespace', () => {
      const content = '``` mermaid \ngraph TD\n  A --> B\n```';
      const count = (statusBarManager as any).countMermaidBlocksInMarkdown(content);
      assert.strictEqual(count, 1);
    });

    test('ignores non-mermaid code blocks', () => {
      const content = '```javascript\nconsole.log("hello");\n```\n\n```python\nprint("world")\n```';
      const count = (statusBarManager as any).countMermaidBlocksInMarkdown(content);
      assert.strictEqual(count, 0);
    });
  });

  suite('Status Bar Visibility Tests', () => {
    test('shows status bar when mermaid content present', () => {
      // Mock active editor with mermaid content
      const mockDocument = {
        fileName: 'test.mmd',
        getText: () => 'graph TD\n  A --> B'
      };
      const mockEditor = { document: mockDocument };
      sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

      // Trigger visibility update
      (statusBarManager as any).updateVisibility();

      // Should show status bar
      sinon.assert.called(mockStatusBarItem.show);
    });

    test('hides status bar when no mermaid content', () => {
      // Mock active editor with no mermaid content
      const mockDocument = {
        fileName: 'test.md',
        getText: () => 'Just regular markdown text'
      };
      const mockEditor = { document: mockDocument };
      sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

      // Trigger visibility update
      (statusBarManager as any).updateVisibility();

      // Should hide status bar
      sinon.assert.called(mockStatusBarItem.hide);
    });

    test('hides status bar when no active editor', () => {
      sinon.stub(vscode.window, 'activeTextEditor').value(undefined);

      // Trigger visibility update
      (statusBarManager as any).updateVisibility();

      // Should hide status bar
      sinon.assert.called(mockStatusBarItem.hide);
    });
  });

  suite('Click Handler Tests', () => {
    test('executes exportFile command when CLI available', async () => {
      // Set status to CLI available
      (statusBarManager as any).currentState = { status: 'cli-available' };

      // Mock active editor
      const mockEditor = { document: { fileName: 'test.mmd', uri: { fsPath: 'test.mmd' } } };
      sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

      // Mock executeCommand
      const executeCommandStub = sinon.stub(vscode.commands, 'executeCommand');

      // Handle click
      await statusBarManager.handleClick();

      // Should execute exportAll command
      sinon.assert.calledWith(executeCommandStub, 'mermaidExportPro.exportAll', mockEditor.document.uri);
    });

    test('shows setup options when not configured', async () => {
      // Set status to not configured
      (statusBarManager as any).currentState = { status: 'not-configured' };

      // Mock showQuickPick
      const showQuickPickStub = sinon.stub(vscode.window, 'showQuickPick').resolves(undefined);

      // Handle click
      await statusBarManager.handleClick();

      // Should show quick pick
      sinon.assert.called(showQuickPickStub);
    });
  });
});