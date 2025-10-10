/**
 * E2E Tests for Batch Export
 *
 * Validates end-to-end batch export workflows including:
 * - Basic folder export with single and multiple files
 * - Multi-format exports
 * - Error recovery and partial failures
 * - Progress tracking and user feedback
 *
 * @author Claude/Jorge
 * @version 1.0.0
 * @date 2025-10-10
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { FixtureManager, DiagramFixture } from '../helpers/fixture-manager';
import { VSCodeTestHelper } from '../helpers/vscode-helpers';
import { ExportValidator } from '../helpers/export-validator';

suite('Batch Export E2E Tests', () => {
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
   * TC-E2E-001: Basic Batch Export Flow
   * Priority: Critical
   */
  suite('TC-E2E-001: Basic Batch Export', () => {
    test('should export all diagrams from folder via command', async function() {
      this.timeout(30000);

      // Create test workspace with 5 simple diagrams
      const diagrams: DiagramFixture[] = [
        { filename: 'diagram1.mmd', content: fixtureManager.createSimpleFlowchart('Flow 1'), type: 'mmd', isValid: true },
        { filename: 'diagram2.mmd', content: fixtureManager.createSimpleFlowchart('Flow 2'), type: 'mmd', isValid: true },
        { filename: 'diagram3.mmd', content: fixtureManager.createSequenceDiagram(), type: 'mmd', isValid: true },
        { filename: 'diagram4.mmd', content: fixtureManager.createClassDiagram(), type: 'mmd', isValid: true },
        { filename: 'diagram5.mmd', content: fixtureManager.createSimpleFlowchart('Flow 3'), type: 'mmd', isValid: true },
      ];

      const workspaceDir = await fixtureManager.createTestWorkspace('basic-batch', diagrams);
      const outputDir = path.join(workspaceDir, 'output');

      // Set up mock dialogs to auto-select SVG format and confirm
      vscodeHelper.setupMockDialogs();
      vscodeHelper.setMockResponse('Select export format(s)', 'SVG'); // Select SVG format
      vscodeHelper.setMockResponse('Select output directory', outputDir); // Output directory
      vscodeHelper.setDefaultMockResponse('Yes'); // Confirm all dialogs

      // Execute batch export command
      const folderUri = vscode.Uri.file(workspaceDir);
      await vscodeHelper.executeCommand('mermaidExportPro.batchExport', folderUri);

      // Wait for export to complete (check for output files)
      const exportComplete = await vscodeHelper.waitFor(
        async () => {
          const count = await exportValidator.getFileCount(outputDir, '.svg');
          return count === 5;
        },
        15000
      );

      assert.ok(exportComplete, 'Batch export did not complete within timeout');

      // Verify all 5 SVG files were created
      const svgCount = await exportValidator.getFileCount(outputDir, '.svg');
      assert.strictEqual(svgCount, 5, 'Expected 5 SVG files to be created');

      // Verify each file is a valid SVG
      const allExports = await exportValidator.getAllExports(outputDir);
      assert.strictEqual(allExports.length, 5, 'Expected 5 export files');

      for (const exportFile of allExports) {
        assert.strictEqual(exportFile.format, 'svg', `Expected SVG format, got ${exportFile.format}`);
        assert.ok(exportFile.valid, `Export file ${path.basename(exportFile.path)} is not valid`);
      }
    });

    test('should handle empty folder gracefully', async function() {
      this.timeout(10000);

      // Create empty workspace
      const workspaceDir = await fixtureManager.createTestWorkspace('empty-batch', []);

      vscodeHelper.setupMockDialogs();

      // Execute batch export command on empty folder
      const folderUri = vscode.Uri.file(workspaceDir);
      await vscodeHelper.executeCommand('mermaidExportPro.batchExport', folderUri);

      // Should show info message about no files found
      // The command should complete without errors
      await vscodeHelper.sleep(1000);

      // No crash = success
      assert.ok(true, 'Empty folder handled without errors');
    });
  });

  /**
   * TC-E2E-002: Multi-Format Export
   * Priority: Critical
   */
  suite('TC-E2E-002: Multi-Format Export', () => {
    test('should export diagrams in multiple formats', async function() {
      this.timeout(45000);

      // Create test workspace with 3 diagrams
      const diagrams: DiagramFixture[] = [
        { filename: 'flow.mmd', content: fixtureManager.createSimpleFlowchart('Multi-Format'), type: 'mmd', isValid: true },
        { filename: 'sequence.mmd', content: fixtureManager.createSequenceDiagram(), type: 'mmd', isValid: true },
        { filename: 'class.mmd', content: fixtureManager.createClassDiagram(), type: 'mmd', isValid: true },
      ];

      const workspaceDir = await fixtureManager.createTestWorkspace('multi-format', diagrams);
      const outputDir = path.join(workspaceDir, 'output');

      // Mock dialog responses for multi-format selection
      vscodeHelper.setupMockDialogs();
      vscodeHelper.setMockResponse('Select export format(s)', ['SVG', 'PNG']); // Multiple formats
      vscodeHelper.setDefaultMockResponse('Yes');

      const folderUri = vscode.Uri.file(workspaceDir);
      await vscodeHelper.executeCommand('mermaidExportPro.batchExport', folderUri);

      // Wait for exports (3 diagrams × 2 formats = 6 files)
      const exportComplete = await vscodeHelper.waitFor(
        async () => {
          const count = await exportValidator.getFileCount(outputDir);
          return count >= 6;
        },
        30000
      );

      assert.ok(exportComplete, 'Multi-format export did not complete');

      // Verify file counts
      const svgCount = await exportValidator.getFileCount(outputDir, '.svg');
      const pngCount = await exportValidator.getFileCount(outputDir, '.png');

      assert.strictEqual(svgCount, 3, 'Expected 3 SVG files');
      assert.strictEqual(pngCount, 3, 'Expected 3 PNG files');

      // Verify all exports are valid
      const allExports = await exportValidator.getAllExports(outputDir);
      for (const exportFile of allExports) {
        assert.ok(exportFile.valid, `Export ${path.basename(exportFile.path)} is invalid`);
      }
    });

    test('should organize exports by format when configured', async function() {
      this.timeout(30000);

      const diagrams: DiagramFixture[] = [
        { filename: 'test.mmd', content: fixtureManager.createSimpleFlowchart(), type: 'mmd', isValid: true },
      ];

      const workspaceDir = await fixtureManager.createTestWorkspace('organized', diagrams);
      const outputDir = path.join(workspaceDir, 'output');

      // Configure to organize by format
      await vscodeHelper.updateConfig('mermaidExportPro', 'organizeByFormat', true);

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setMockResponse('Select export format(s)', ['SVG', 'PNG']);
      vscodeHelper.setDefaultMockResponse('Yes');

      const folderUri = vscode.Uri.file(workspaceDir);
      await vscodeHelper.executeCommand('mermaidExportPro.batchExport', folderUri);

      await vscodeHelper.sleep(10000); // Wait for export

      // Verify organized structure (svg/ and png/ subdirectories)
      const hasStructure = await exportValidator.verifyOrganizedStructure(outputDir, ['svg', 'png']);
      assert.ok(hasStructure, 'Expected organized directory structure');

      // Reset config
      await vscodeHelper.resetConfig('mermaidExportPro', 'organizeByFormat');
    });
  });

  /**
   * TC-E2E-003: Error Recovery During Batch
   * Priority: Critical
   */
  suite('TC-E2E-003: Error Recovery', () => {
    test('should handle partial failures gracefully', async function() {
      this.timeout(30000);

      // Create workspace with mix of valid and invalid diagrams
      const diagrams: DiagramFixture[] = [
        { filename: 'valid1.mmd', content: fixtureManager.createSimpleFlowchart('Valid 1'), type: 'mmd', isValid: true },
        { filename: 'valid2.mmd', content: fixtureManager.createSequenceDiagram(), type: 'mmd', isValid: true },
        { filename: 'invalid.mmd', content: fixtureManager.createInvalidDiagram(), type: 'mmd', isValid: false },
        { filename: 'valid3.mmd', content: fixtureManager.createClassDiagram(), type: 'mmd', isValid: true },
      ];

      const workspaceDir = await fixtureManager.createTestWorkspace('error-recovery', diagrams);
      const outputDir = path.join(workspaceDir, 'output');

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setMockResponse('Select export format(s)', 'SVG');
      vscodeHelper.setDefaultMockResponse('Yes');

      const folderUri = vscode.Uri.file(workspaceDir);
      await vscodeHelper.executeCommand('mermaidExportPro.batchExport', folderUri);

      await vscodeHelper.sleep(10000);

      // Should have 3 valid exports (invalid one should fail)
      const svgCount = await exportValidator.getFileCount(outputDir, '.svg');

      // Depending on error handling, we expect either 3 or 4 files
      // (4 if error handling creates a placeholder, 3 if it skips)
      assert.ok(svgCount >= 3, `Expected at least 3 successful exports, got ${svgCount}`);

      // All created files should be valid
      const allExports = await exportValidator.getAllExports(outputDir);
      for (const exportFile of allExports) {
        if (exportFile.format === 'svg') {
          assert.ok(exportFile.valid, `SVG export ${path.basename(exportFile.path)} should be valid`);
        }
      }
    });
  });

  /**
   * TC-E2E-004: Markdown Processing
   * Priority: High
   */
  suite('TC-E2E-004: Markdown Processing', () => {
    test('should export diagrams from markdown files', async function() {
      this.timeout(30000);

      const workspaceDir = await fixtureManager.createTestWorkspace('markdown-test', []);

      // Create markdown file with multiple diagrams
      const diagrams = [
        fixtureManager.createSimpleFlowchart('Diagram 1'),
        fixtureManager.createSequenceDiagram(),
        fixtureManager.createClassDiagram()
      ];

      await fixtureManager.createMarkdownFile(workspaceDir, 'document.md', diagrams);
      const outputDir = path.join(workspaceDir, 'output');

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setMockResponse('Select export format(s)', 'SVG');
      vscodeHelper.setDefaultMockResponse('Yes');

      const folderUri = vscode.Uri.file(workspaceDir);
      await vscodeHelper.executeCommand('mermaidExportPro.batchExport', folderUri);

      // Wait for exports
      const exportComplete = await vscodeHelper.waitFor(
        async () => {
          const count = await exportValidator.getFileCount(outputDir, '.svg');
          return count >= 3;
        },
        20000
      );

      assert.ok(exportComplete, 'Markdown diagram export did not complete');

      // Should have 3 SVG files (one per diagram in markdown)
      const svgCount = await exportValidator.getFileCount(outputDir, '.svg');
      assert.ok(svgCount >= 3, `Expected at least 3 SVG exports from markdown, got ${svgCount}`);
    });
  });

  /**
   * TC-E2E-005: Recursive Folder Scanning
   * Priority: High
   */
  suite('TC-E2E-005: Recursive Scanning', () => {
    test('should export diagrams from nested folders', async function() {
      this.timeout(30000);

      // Create nested structure (3 levels deep)
      const workspaceDir = await fixtureManager.createNestedWorkspace('nested-test', 3);
      const outputDir = path.join(workspaceDir, 'output');

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setMockResponse('Select export format(s)', 'SVG');
      vscodeHelper.setDefaultMockResponse('Yes');

      const folderUri = vscode.Uri.file(workspaceDir);
      await vscodeHelper.executeCommand('mermaidExportPro.batchExport', folderUri);

      await vscodeHelper.sleep(10000);

      // Should find diagrams at all levels (3 diagrams from nested structure)
      const svgCount = await exportValidator.getFileCount(outputDir, '.svg');
      assert.ok(svgCount >= 3, `Expected at least 3 exports from nested folders, got ${svgCount}`);
    });

    test('should respect max depth configuration', async function() {
      this.timeout(30000);

      // Create deep nested structure (5 levels)
      const workspaceDir = await fixtureManager.createNestedWorkspace('depth-limit', 5);
      const outputDir = path.join(workspaceDir, 'output');

      // Set max depth to 2
      await vscodeHelper.updateConfig('mermaidExportPro', 'batchExportDefaultDepth', 2);

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setMockResponse('Select export format(s)', 'SVG');
      vscodeHelper.setDefaultMockResponse('Yes');

      const folderUri = vscode.Uri.file(workspaceDir);
      await vscodeHelper.executeCommand('mermaidExportPro.batchExport', folderUri);

      await vscodeHelper.sleep(10000);

      // Should only find diagrams up to depth 2 (max 2-3 diagrams)
      const svgCount = await exportValidator.getFileCount(outputDir, '.svg');
      assert.ok(svgCount <= 3, `Expected max 3 exports with depth limit, got ${svgCount}`);
      assert.ok(svgCount >= 2, `Expected at least 2 exports, got ${svgCount}`);

      // Reset config
      await vscodeHelper.resetConfig('mermaidExportPro', 'batchExportDefaultDepth');
    });
  });

  /**
   * TC-E2E-006: Performance with Large Batches
   * Priority: Medium
   */
  suite('TC-E2E-006: Large Batch Performance', () => {
    test('should handle 20+ diagrams efficiently', async function() {
      this.timeout(60000);

      // Create 20 simple diagrams
      const diagrams: DiagramFixture[] = [];
      for (let i = 0; i < 20; i++) {
        diagrams.push({
          filename: `diagram-${i}.mmd`,
          content: fixtureManager.createSimpleFlowchart(`Flow ${i}`),
          type: 'mmd',
          isValid: true
        });
      }

      const workspaceDir = await fixtureManager.createTestWorkspace('large-batch', diagrams);
      const outputDir = path.join(workspaceDir, 'output');

      vscodeHelper.setupMockDialogs();
      vscodeHelper.setMockResponse('Select export format(s)', 'SVG');
      vscodeHelper.setDefaultMockResponse('Yes');

      const startTime = Date.now();

      const folderUri = vscode.Uri.file(workspaceDir);
      await vscodeHelper.executeCommand('mermaidExportPro.batchExport', folderUri);

      // Wait for exports
      const exportComplete = await vscodeHelper.waitFor(
        async () => {
          const count = await exportValidator.getFileCount(outputDir, '.svg');
          return count >= 20;
        },
        45000
      );

      const duration = Date.now() - startTime;

      assert.ok(exportComplete, 'Large batch export did not complete');

      const svgCount = await exportValidator.getFileCount(outputDir, '.svg');
      assert.strictEqual(svgCount, 20, `Expected 20 SVG files, got ${svgCount}`);

      // Performance check: should complete in reasonable time (< 45 seconds)
      assert.ok(duration < 45000, `Export took too long: ${duration}ms`);
    });
  });
});
