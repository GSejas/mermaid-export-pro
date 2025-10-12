/**
 * Minimal test to verify _testExport works without dialogs
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { VSCodeTestHelper } from '../helpers/vscode-helpers';
import { FixtureManager } from '../helpers/fixture-manager';
import { ExtensionSetup } from '../helpers/extension-setup';

// TODO(ci-testing): Restore once CLI/web exports work reliably in GitHub Actions (2025-10-12)
suite.skip('Minimal Dialog Test', () => {
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
    await vscodeHelper.closeAllEditors();
  });

  test('should export SVG without showing any dialogs', async function(this: Mocha.Context) {
    this.timeout(20000);

    console.log('\n=== STARTING MINIMAL TEST ===');

    // Create test workspace with one diagram
    const workspaceDir = await fixtureManager.createTestWorkspace('minimal-test', []);
    const diagramPath = await fixtureManager.createMermaidFile(
      workspaceDir,
      'test.mmd',
      'graph TD\n  A[Start] --> B[End]'
    );

    console.log('[TEST] Created diagram at:', diagramPath);

    // Open the file in editor
    const editor = await vscodeHelper.openFile(diagramPath);
    assert.ok(editor, 'Failed to open diagram file');
    console.log('[TEST] File opened in editor');

    // Define expected output path
    const outputPath = diagramPath.replace('.mmd', '.svg');
    console.log('[TEST] Expected output path:', outputPath);

    // Execute TEST command with explicit output path (NO DIALOGS!)
    console.log('[TEST] Executing _testExport command...');
    await vscodeHelper.executeTestExport(outputPath);

    // Wait for export to complete
    console.log('[TEST] Waiting for export to complete...');
    await vscodeHelper.sleep(5000);

    // Verify SVG file was created
    console.log('[TEST] Checking if file exists...');
    const exists = fs.existsSync(outputPath);
    assert.ok(exists, `Expected SVG output at ${outputPath}`);

    // Verify it's a valid SVG (basic check)
    const content = fs.readFileSync(outputPath, 'utf8');
    assert.ok(content.includes('<svg'), 'Output should be valid SVG');
    assert.ok(content.includes('</svg>'), 'Output should be valid SVG');

    console.log('[TEST] ✅ Test passed! File created without dialogs.');
    console.log('=== TEST COMPLETE ===\n');
  });
});
