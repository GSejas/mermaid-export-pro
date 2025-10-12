/**
 * Debug test to verify MockDialogService is working
 */

import * as assert from 'assert';
import { VSCodeTestHelper } from '../helpers/vscode-helpers';
import { FixtureManager } from '../helpers/fixture-manager';
import { ExtensionSetup } from '../helpers/extension-setup';

suite('Debug Mock Dialog Test', () => {
  let vscodeHelper: VSCodeTestHelper;
  let fixtureManager: FixtureManager;

  suiteSetup(async function(this: Mocha.Context) {
    this.timeout(30000);
    await ExtensionSetup.ensureActivated();
  });

  setup(() => {
    fixtureManager = new FixtureManager();
    vscodeHelper = new VSCodeTestHelper();
  });

  teardown(async () => {
    await fixtureManager.cleanup();
    vscodeHelper.restoreMockDialogs();
    await vscodeHelper.closeAllEditors();
  });

  test('should use MockDialogService when setupMockDialogs is called', async function(this: Mocha.Context) {
    this.timeout(20000);

    console.log('\n=== STARTING DEBUG TEST ===');

    // Create test workspace with one diagram
    const workspaceDir = await fixtureManager.createTestWorkspace('mock-test', []);
    const diagramPath = await fixtureManager.createMermaidFile(
      workspaceDir,
      'test.mmd',
      'graph TD\n  A-->B'
    );

    console.log('[TEST] Opening file:', diagramPath);
    const editor = await vscodeHelper.openFile(diagramPath);
    assert.ok(editor, 'Failed to open diagram file');

    console.log('[TEST] Setting up mock dialogs...');
    vscodeHelper.setupMockDialogs();
    console.log('[TEST] Mock dialogs setup complete');

    console.log('[TEST] Executing exportCurrent command...');
    await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');

    console.log('[TEST] Waiting for command to complete...');
    await vscodeHelper.sleep(3000);

    console.log('=== TEST COMPLETE ===\n');
  });
});
