import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ThemeStatusBarManager } from '../../../ui/themeStatusBarManager';

suite('ThemeStatusBarManager Tests', () => {
  let themeStatusBarManager: ThemeStatusBarManager;
  let mockContext: vscode.ExtensionContext;
  let mockStatusBarItem: any;

  setup(() => {
    // Mock status bar item
    mockStatusBarItem = {
      text: '',
      tooltip: '',
      show: sinon.stub(),
      hide: sinon.stub(),
      dispose: sinon.stub(),
      color: undefined,
      command: 'mermaidExportPro.cycleTheme'
    };

    sinon.stub(vscode.window, 'createStatusBarItem').returns(mockStatusBarItem);
    
    // Mock extension context
    mockContext = {
      subscriptions: []
    } as any;

    themeStatusBarManager = new ThemeStatusBarManager(mockContext);
  });

  teardown(() => {
    sinon.restore();
  });

  suite('Theme Cycling Tests', () => {
    test('cycles through themes in correct order', async () => {
      // Mock configuration
      const mockConfig = {
        get: sinon.stub().returns('default'),
        update: sinon.stub()
      };
      sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

      // Mock showInformationMessage to prevent actual notifications during test
      sinon.stub(vscode.window, 'showInformationMessage');

      // Cycle theme
      await themeStatusBarManager.cycleTheme();

      // Should update to next theme (dark)
      sinon.assert.calledWith(mockConfig.update, 'theme', 'dark', vscode.ConfigurationTarget.Workspace);
    });

    test('wraps from neutral back to default', async () => {
      // Mock configuration starting at neutral
      const mockConfig = {
        get: sinon.stub().returns('neutral'),
        update: sinon.stub()
      };
      sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

      // Mock showInformationMessage
      sinon.stub(vscode.window, 'showInformationMessage');

      // Cycle theme
      await themeStatusBarManager.cycleTheme();

      // Should wrap to default
      sinon.assert.calledWith(mockConfig.update, 'theme', 'default', vscode.ConfigurationTarget.Workspace);
    });
  });

  suite('Debounced Notification Tests', () => {
    let clock: sinon.SinonFakeTimers;

    setup(() => {
      clock = sinon.useFakeTimers();
    });

    teardown(() => {
      clock.restore();
    });

    test('shows notification after debounce delay', async () => {
      // Mock configuration
      const mockConfig = {
        get: sinon.stub().returns('default'),
        update: sinon.stub()
      };
      sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

      // Mock showInformationMessage
      const showMessageStub = sinon.stub(vscode.window, 'showInformationMessage');

      // Cycle theme
      await themeStatusBarManager.cycleTheme();

      // Should not show message immediately
      sinon.assert.notCalled(showMessageStub);

      // Advance time by debounce delay (3000ms)
      clock.tick(3000);

      // Should show notification after delay
      sinon.assert.called(showMessageStub);
      sinon.assert.calledWith(showMessageStub, 'Mermaid theme: Dark Mode');
    });

    test('cancels previous notification on rapid cycling', async () => {
      // Mock configuration
      const mockConfig = {
        get: sinon.stub()
          .onFirstCall().returns('default')
          .onSecondCall().returns('default')  // for updateThemeDisplay
          .onThirdCall().returns('dark')      // for second cycle
          .onCall(3).returns('dark'),         // for updateThemeDisplay
        update: sinon.stub()
      };
      sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

      // Mock showInformationMessage
      const showMessageStub = sinon.stub(vscode.window, 'showInformationMessage');

      // First cycle
      await themeStatusBarManager.cycleTheme();
      
      // Advance time partially
      clock.tick(1500);
      
      // Second cycle (should cancel first timer)
      await themeStatusBarManager.cycleTheme();
      
      // Advance remaining time
      clock.tick(3000);

      // Should only show one notification (for forest theme, not dark)
      sinon.assert.calledOnce(showMessageStub);
      sinon.assert.calledWith(showMessageStub, 'Mermaid theme: Forest');
    });
  });

  suite('Theme Display Tests', () => {
    test('sets correct icon for default theme', () => {
      // Mock configuration
      const mockConfig = {
        get: sinon.stub().returns('default')
      };
      sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

      // Update theme display
      (themeStatusBarManager as any).updateThemeDisplay();

      // Should set symbol-color icon
      assert.strictEqual(mockStatusBarItem.text, '$(symbol-color)');
      assert.ok(mockStatusBarItem.tooltip.includes('Default'));
    });

    test('sets correct icon for dark theme', () => {
      // Mock configuration
      const mockConfig = {
        get: sinon.stub().returns('dark')
      };
      sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

      // Update theme display
      (themeStatusBarManager as any).updateThemeDisplay();

      // Should set color-mode icon
      assert.strictEqual(mockStatusBarItem.text, '$(color-mode)');
      assert.ok(mockStatusBarItem.tooltip.includes('Dark Mode'));
    });

    test('uses default color for all themes', () => {
      // Mock configuration
      const mockConfig = {
        get: sinon.stub().returns('forest')
      };
      sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

      // Update theme display
      (themeStatusBarManager as any).updateThemeDisplay();

      // Should use default color (undefined)
      assert.strictEqual(mockStatusBarItem.color, undefined);
    });
  });

  suite('Visibility Tests', () => {
    test('shows when mermaid content present', () => {
      // Mock active editor with mermaid content
      const mockDocument = {
        fileName: 'test.mmd',
        getText: () => 'graph TD\n  A --> B'
      };
      const mockEditor = { document: mockDocument };
      sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

      // Update visibility
      (themeStatusBarManager as any).updateVisibility();

      // Should show status bar
      sinon.assert.called(mockStatusBarItem.show);
    });

    test('hides when no mermaid content', () => {
      // Mock active editor with no mermaid content
      const mockDocument = {
        fileName: 'test.txt',
        getText: () => 'Just text'
      };
      const mockEditor = { document: mockDocument };
      sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

      // Update visibility
      (themeStatusBarManager as any).updateVisibility();

      // Should hide status bar
      sinon.assert.called(mockStatusBarItem.hide);
    });
  });

  suite('Cleanup Tests', () => {
    test('clears notification timer on dispose', () => {
      // Set up a notification timer
      (themeStatusBarManager as any).notificationTimer = setTimeout(() => {}, 1000);

      // Dispose
      themeStatusBarManager.dispose();

      // Timer should be cleared
      assert.strictEqual((themeStatusBarManager as any).notificationTimer, undefined);
    });
  });
});