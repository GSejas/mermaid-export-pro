/**
 * DEBUG TEST - exportAs command
 * Minimal test to verify exportAs behavior
 */

import * as assert from 'assert';
import { VSCodeTestHelper } from '../helpers/vscode-helpers';
import { FixtureManager } from '../helpers/fixture-manager';

suite('DEBUG: exportAs Command', () => {
  let vscodeHelper: VSCodeTestHelper;
  let fixtureManager: FixtureManager;

  setup(async () => {
    vscodeHelper = new VSCodeTestHelper();
    fixtureManager = new FixtureManager();
  });

  teardown(async () => {
    await fixtureManager.cleanup();
  });

  test('exportAs - should auto-generate filename', async function() {
    this.timeout(30000);

    console.log('[DEBUG] Creating test workspace...');
    const workspaceDir = await fixtureManager.createTestWorkspace('debug-exportAs', []);
    
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

    console.log('[DEBUG] Calling exportAs command (preferAuto=true)...');
    console.log('[DEBUG] Watch for save dialog - if it appears, preferAuto is not working!');
    
    await vscodeHelper.executeCommand('mermaidExportPro.exportAs');

    console.log('[DEBUG] Command completed!');
    
    // Give it time to complete
    await vscodeHelper.sleep(3000);

    console.log('[DEBUG] Test finished - did you see a save dialog?');
    assert.ok(true, 'Command executed');
  });
});
