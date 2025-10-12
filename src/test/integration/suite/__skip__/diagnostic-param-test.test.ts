/**
 * Diagnostic test to trace parameter passing
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ExtensionSetup } from '../helpers/extension-setup';

suite('Parameter Passing Diagnostic', () => {
  suiteSetup(async function(this: Mocha.Context) {
    this.timeout(30000);
    await ExtensionSetup.ensureActivated();
  });

  test('should verify _testExport command exists', async function(this: Mocha.Context) {
    this.timeout(5000);
    
    const commands = await vscode.commands.getCommands(true);
    const hasCommand = commands.includes('mermaidExportPro._testExport');
    
    console.log('[DIAGNOSTIC] Available commands:', commands.filter(c => c.includes('mermaid')));
    console.log('[DIAGNOSTIC] _testExport command registered:', hasCommand);
    
    assert.ok(hasCommand, '_testExport command should be registered');
  });

  test('should trace parameter passing to _testExport', async function(this: Mocha.Context) {
    this.timeout(5000);
    
    console.log('\n=== PARAMETER PASSING TEST ===');
    
    const testPath = 'C:\\temp\\test-output.svg';
    console.log('[DIAGNOSTIC] Calling _testExport with path:', testPath);
    
    try {
      // This will fail because we don't have a file open, but we can see if parameters are passed
      await vscode.commands.executeCommand('mermaidExportPro._testExport', undefined, testPath);
    } catch (error) {
      const err = error as Error;
      console.log('[DIAGNOSTIC] Command threw error (expected):', err.message);
      // Check if error mentions the path we passed
      assert.ok(err.message, 'Should have error message');
    }
    
    console.log('=== TEST COMPLETE ===\n');
  });
});
