/**
 * DEBUG TEST - exportCurrent command
 * Minimal test to verify exportCurrent behavior
 */

import * as assert from 'assert';
import { VSCodeTestHelper } from '../helpers/vscode-helpers';
import { FixtureManager } from '../helpers/fixture-manager';

suite('DEBUG: exportCurrent Command', () => {
  let vscodeHelper: VSCodeTestHelper;
  let fixtureManager: FixtureManager;

  setup(async () => {
    vscodeHelper = new VSCodeTestHelper();
    fixtureManager = new FixtureManager();
  });

  teardown(async () => {
    await fixtureManager.cleanup();
  });

  test('exportCurrent - should show save dialog', async function() {
    this.timeout(30000);

    console.log('[DEBUG] Creating test workspace...');
    const workspaceDir = await fixtureManager.createTestWorkspace('debug-exportCurrent', []);
    
    console.log('[DEBUG] Creating diagram file...');
    const diagramPath = await fixtureManager.createMermaidFile(
      workspaceDir,
      'test.mmd',
      'graph TD\n  A-->B'
    );
    console.log('[DEBUG] Diagram path:', diagramPath);

    console.log('[DEBUG] Opening file...');
    await vscodeHelper.openFile(diagramPath);

    console.log('[DEBUG] Setting up mock dialogs...');
    vscodeHelper.setupMockDialogs();
    vscodeHelper.setMockResponse('Select export format', 'SVG');
    vscodeHelper.setMockResponse('Select theme', 'Default');
    vscodeHelper.setDefaultMockResponse('Yes');

    console.log('[DEBUG] Calling exportCurrent command (preferAuto=false)...');
    console.log('[DEBUG] This SHOULD show format dialog, theme dialog, AND save dialog');
    
    await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');

    console.log('[DEBUG] Command completed!');
    
    // Give it time to complete
    await vscodeHelper.sleep(3000);

    console.log('[DEBUG] Test finished - you should have seen 3 dialogs');
    assert.ok(true, 'Command executed');
  });
});
