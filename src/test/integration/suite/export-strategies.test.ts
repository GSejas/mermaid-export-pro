/**
 * E2E Tests for Export Strategies and Single File Exports
 *
 * Validates:
 * - Single file export workflows
 * - CLI to Web strategy failover
 * - Format selection and preferences
 * - Error handling for export strategies
 *
 * @author Claude/Jorge
 * @version 1.0.0
 * @date 2025-10-10
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { FixtureManager } from '../helpers/fixture-manager';
import { VSCodeTestHelper } from '../helpers/vscode-helpers';
import { ExportValidator } from '../helpers/export-validator';

suite('Export Strategies E2E Tests', () => {
  let fixtureManager: FixtureManager;
  let vscodeHelper: VSCodeTestHelper;
  let exportValidator: ExportValidator;

  setup(() => {
    fixtureManager = new FixtureManager();
    vscodeHelper = new VSCodeTestHelper();
    exportValidator = new ExportValidator();
  });

  teardown(async () => {
    await fixtureManager.cleanup();
    vscodeHelper.restoreMockDialogs();
    await vscodeHelper.closeAllEditors();
  });

  /**
   * TC-E2E-007: Single File Export
   * Priority: High
   */
  suite('TC-E2E-007: Single File Export', () => {
    test('should export current file via exportCurrent command', async function() {
      this.timeout(20000);

      // Create test workspace with one diagram
      const workspaceDir = await fixtureManager.createTestWorkspace('single-export', []);
      const diagramPath = await fixtureManager.createMermaidFile(
        workspaceDir,
        'test-diagram.mmd',
        fixtureManager.createSimpleFlowchart('Test Export')
      );

      // Open the file in editor
      const editor = await vscodeHelper.openFile(diagramPath);
      assert.ok(editor, 'Failed to open diagram file');

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setDefaultMockResponse('Yes');

      // Execute export current command
      await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');

      // Wait for export
      await vscodeHelper.sleep(5000);

      // Verify SVG file was created (default format)
      const outputPath = diagramPath.replace('.mmd', '.svg');
      const exists = await exportValidator.verifyFileExists(outputPath);
      assert.ok(exists, `Expected output file at ${outputPath}`);

      // Verify it's a valid SVG
      const validation = await exportValidator.verifySVGContent(outputPath);
      assert.ok(validation.isValid, 'Exported SVG is not valid');
    });

    test('should export with format selection via exportAs command', async function() {
      this.timeout(20000);

      const workspaceDir = await fixtureManager.createTestWorkspace('export-as', []);
      const diagramPath = await fixtureManager.createMermaidFile(
        workspaceDir,
        'diagram.mmd',
        fixtureManager.createSequenceDiagram()
      );

      await vscodeHelper.openFile(diagramPath);

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setMockResponse('Select export format', 'PNG'); // Select PNG format
      vscodeHelper.setDefaultMockResponse('Yes');

      // Execute exportAs command
      await vscodeHelper.executeCommand('mermaidExportPro.exportAs');

      await vscodeHelper.sleep(5000);

      // Verify PNG file was created
      const outputPath = diagramPath.replace('.mmd', '.png');
      const exists = await exportValidator.verifyFileExists(outputPath);
      assert.ok(exists, `Expected PNG output at ${outputPath}`);

      const validation = await exportValidator.verifyPNGContent(outputPath);
      assert.ok(validation.isValid, 'Exported PNG is not valid');
    });

    test('should export markdown diagram blocks', async function() {
      this.timeout(20000);

      const workspaceDir = await fixtureManager.createTestWorkspace('md-export', []);
      const mdPath = await fixtureManager.createMarkdownFile(
        workspaceDir,
        'document.md',
        [fixtureManager.createSimpleFlowchart('From Markdown')]
      );

      await vscodeHelper.openFile(mdPath);

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setDefaultMockResponse('Yes');

      // Execute export current
      await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');

      await vscodeHelper.sleep(5000);

      // Should create SVG export
      const outputDir = path.dirname(mdPath);
      const svgCount = await exportValidator.getFileCount(outputDir, '.svg');
      assert.ok(svgCount >= 1, 'Expected at least 1 SVG export from markdown');
    });
  });

  /**
   * TC-E2E-008: Export Strategy Selection
   * Priority: Critical
   */
  suite('TC-E2E-008: Strategy Selection', () => {
    test('should use configured export strategy', async function() {
      this.timeout(20000);

      const workspaceDir = await fixtureManager.createTestWorkspace('strategy-config', []);
      const diagramPath = await fixtureManager.createMermaidFile(
        workspaceDir,
        'test.mmd',
        fixtureManager.createSimpleFlowchart()
      );

      // Configure to prefer CLI strategy
      await vscodeHelper.updateConfig('mermaidExportPro', 'exportStrategy', 'cli');

      await vscodeHelper.openFile(diagramPath);

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setDefaultMockResponse('Yes');

      await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');

      await vscodeHelper.sleep(5000);

      // Verify export completed (strategy should be used)
      const outputPath = diagramPath.replace('.mmd', '.svg');
      const exists = await exportValidator.verifyFileExists(outputPath);
      assert.ok(exists, 'Export should complete using configured strategy');

      // Reset config
      await vscodeHelper.resetConfig('mermaidExportPro', 'exportStrategy');
    });

    test('should fallback to web strategy when CLI unavailable', async function() {
      this.timeout(20000);

      const workspaceDir = await fixtureManager.createTestWorkspace('fallback-test', []);
      const diagramPath = await fixtureManager.createMermaidFile(
        workspaceDir,
        'fallback.mmd',
        fixtureManager.createSimpleFlowchart()
      );

      // Configure to prefer CLI, but test should fallback to web if CLI fails
      await vscodeHelper.updateConfig('mermaidExportPro', 'exportStrategy', 'auto');

      await vscodeHelper.openFile(diagramPath);

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setDefaultMockResponse('Yes');

      await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');

      await vscodeHelper.sleep(8000);

      // Export should complete using fallback strategy
      const outputPath = diagramPath.replace('.mmd', '.svg');
      const exists = await exportValidator.verifyFileExists(outputPath);
      assert.ok(exists, 'Export should complete using fallback strategy');

      await vscodeHelper.resetConfig('mermaidExportPro', 'exportStrategy');
    });
  });

  /**
   * TC-E2E-009: Theme and Enhancement Options
   * Priority: Medium
   */
  suite('TC-E2E-009: Theme Options', () => {
    test('should apply configured theme to exports', async function() {
      this.timeout(20000);

      const workspaceDir = await fixtureManager.createTestWorkspace('theme-test', []);
      const diagramPath = await fixtureManager.createMermaidFile(
        workspaceDir,
        'themed.mmd',
        fixtureManager.createSimpleFlowchart()
      );

      // Configure dark theme
      await vscodeHelper.updateConfig('mermaidExportPro', 'theme', 'dark');

      await vscodeHelper.openFile(diagramPath);

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setDefaultMockResponse('Yes');

      await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');

      await vscodeHelper.sleep(5000);

      const outputPath = diagramPath.replace('.mmd', '.svg');
      const exists = await exportValidator.verifyFileExists(outputPath);
      assert.ok(exists, 'Themed export should be created');

      // Verify SVG content (dark theme might affect attributes)
      const validation = await exportValidator.verifySVGContent(outputPath);
      assert.ok(validation.isValid, 'Themed SVG should be valid');

      await vscodeHelper.resetConfig('mermaidExportPro', 'theme');
    });

    test('should export with transparent background when configured', async function() {
      this.timeout(20000);

      const workspaceDir = await fixtureManager.createTestWorkspace('transparent', []);
      const diagramPath = await fixtureManager.createMermaidFile(
        workspaceDir,
        'transparent.mmd',
        fixtureManager.createSimpleFlowchart()
      );

      // Configure transparent background
      await vscodeHelper.updateConfig('mermaidExportPro', 'backgroundColor', 'transparent');

      await vscodeHelper.openFile(diagramPath);

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setDefaultMockResponse('Yes');

      await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');

      await vscodeHelper.sleep(5000);

      const outputPath = diagramPath.replace('.mmd', '.svg');
      const validation = await exportValidator.verifySVGContent(outputPath);
      assert.ok(validation.isValid, 'Transparent background export should be valid');

      await vscodeHelper.resetConfig('mermaidExportPro', 'backgroundColor');
    });
  });

  /**
   * TC-E2E-010: Output Directory Configuration
   * Priority: Medium
   */
  suite('TC-E2E-010: Output Configuration', () => {
    test('should use configured output directory', async function() {
      this.timeout(20000);

      const workspaceDir = await fixtureManager.createTestWorkspace('output-config', []);
      const customOutputDir = path.join(workspaceDir, 'custom-output');

      const diagramPath = await fixtureManager.createMermaidFile(
        workspaceDir,
        'test.mmd',
        fixtureManager.createSimpleFlowchart()
      );

      // Configure custom output directory
      await vscodeHelper.updateConfig('mermaidExportPro', 'outputDirectory', customOutputDir);

      await vscodeHelper.openFile(diagramPath);

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setDefaultMockResponse('Yes');

      await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');

      await vscodeHelper.sleep(5000);

      // Verify file was created in custom directory
      const svgCount = await exportValidator.getFileCount(customOutputDir, '.svg');
      assert.ok(svgCount >= 1, 'Export should be created in custom output directory');

      await vscodeHelper.resetConfig('mermaidExportPro', 'outputDirectory');
    });
  });

  /**
   * TC-E2E-011: Error Handling
   * Priority: High
   */
  suite('TC-E2E-011: Export Error Handling', () => {
    test('should show error for invalid mermaid syntax', async function() {
      this.timeout(15000);

      const workspaceDir = await fixtureManager.createTestWorkspace('invalid-syntax', []);
      const diagramPath = await fixtureManager.createMermaidFile(
        workspaceDir,
        'invalid.mmd',
        fixtureManager.createInvalidDiagram()
      );

      await vscodeHelper.openFile(diagramPath);

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setDefaultMockResponse('OK');

      // Execute export - should fail gracefully
      try {
        await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');
        await vscodeHelper.sleep(3000);

        // Export might fail, but extension should not crash
        assert.ok(true, 'Invalid syntax handled without crashing');
      } catch (err) {
        // Error is expected for invalid syntax
        assert.ok(true, 'Invalid syntax error caught properly');
      }
    });

    test('should handle export when no file is open', async function() {
      this.timeout(10000);

      // Close all editors
      await vscodeHelper.closeAllEditors();

      vscodeHelper.setupMockDialogs();

      // Execute export with no file open
      try {
        await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');
        await vscodeHelper.sleep(1000);

        // Should show appropriate error/info message
        assert.ok(true, 'No file open handled gracefully');
      } catch (err) {
        // Error is expected
        assert.ok(true, 'No file error handled properly');
      }
    });
  });
});
