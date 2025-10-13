import { describe, it, beforeEach, suite, suiteTeardown } from 'mocha';
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TelemetryService } from '../../services/telemetryService';

/**
 * Integration Tests for Telemetry Commands
 * 
 * Tests the full workflow of telemetry commands including:
 * - Enabling/disabling telemetry via settings
 * - Tracking events through real usage
 * - Showing telemetry summary
 * - Exporting telemetry data
 * - Clearing telemetry data
 */

suite('Telemetry Commands Integration Tests', () => {
	let telemetryService: TelemetryService;
	let testContext: vscode.ExtensionContext;
	const exportDir = path.join(os.homedir(), 'mermaid-export-pro-telemetry');

	suiteSetup(async function() {
		this.timeout(10000); // Allow time for extension activation

		// Get the extension context
		const ext = vscode.extensions.getExtension('gsejas.mermaid-export-pro');
		assert.ok(ext, 'Extension should be available');

		if (!ext.isActive) {
			await ext.activate();
		}

		testContext = (ext.exports as any).context;
		telemetryService = TelemetryService.getInstance(testContext);
	});

	suiteTeardown(async () => {
		// Clean up any telemetry data
		await telemetryService.clearData();
		
		// Clean up export directory
		if (fs.existsSync(exportDir)) {
			const files = fs.readdirSync(exportDir);
			for (const file of files) {
				fs.unlinkSync(path.join(exportDir, file));
			}
			fs.rmdirSync(exportDir);
		}
	});

	suite('showTelemetry Command', () => {
		beforeEach(async function() {
			this.timeout(5000);
			// Enable telemetry
			await vscode.workspace.getConfiguration('mermaidExportPro').update('telemetry.enabled', true, true);
			await telemetryService.clearData();
		});

		it('should display telemetry summary in new document', async function() {
			this.timeout(5000);

			// Track some sample events
			telemetryService.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			telemetryService.trackCommand('export', 'palette');
			telemetryService.trackError('test-error', 'Test error message', 'test');

			// Execute show telemetry command
			await vscode.commands.executeCommand('mermaidExportPro.showTelemetry');

			// Wait for document to open
			await new Promise(resolve => setTimeout(resolve, 1000));

			// Verify a document was opened
			const activeEditor = vscode.window.activeTextEditor;
			assert.ok(activeEditor, 'Active editor should be defined');

			// Verify it's a markdown document
			assert.strictEqual(activeEditor.document.languageId, 'markdown', 'Document should be markdown');

			// Verify content contains expected sections
			const content = activeEditor.document.getText();
			assert.ok(content.includes('Mermaid Export Pro'), 'Should include extension name');
			assert.ok(content.includes('Total Exports'), 'Should include export statistics');
		});

		it('should show empty summary for new installation', async function() {
			this.timeout(5000);

			// Clear existing data
			await telemetryService.clearData();

			// Execute show telemetry command
			await vscode.commands.executeCommand('mermaidExportPro.showTelemetry');
			await new Promise(resolve => setTimeout(resolve, 1000));

			const activeEditor = vscode.window.activeTextEditor;
			assert.ok(activeEditor, 'Active editor should be defined');

			const content = activeEditor.document.getText();
			assert.ok(content.includes('Total Exports: 0') || content.includes('No data'), 'Should show empty data');
		});
	});

	suite('exportTelemetry Command', () => {
		beforeEach(async function() {
			this.timeout(5000);
			await vscode.workspace.getConfiguration('mermaidExportPro').update('telemetry.enabled', true, true);
			await telemetryService.clearData();
			
			// Clean up export directory
			if (fs.existsSync(exportDir)) {
				const files = fs.readdirSync(exportDir);
				for (const file of files) {
					fs.unlinkSync(path.join(exportDir, file));
				}
			}
		});

		it('should export telemetry data to file', async function() {
			this.timeout(10000);

			// Track some sample events
			telemetryService.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			telemetryService.trackExport('svg', 'web', 1000, 1024, 'sequence', true);
			telemetryService.trackCommand('export', 'palette');

			// Execute export telemetry command
			await vscode.commands.executeCommand('mermaidExportPro.exportTelemetry');

			// Wait for file to be written
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Verify export directory exists
			assert.ok(fs.existsSync(exportDir), 'Export directory should exist');

			// Verify export file exists
			const files = fs.readdirSync(exportDir);
			assert.ok(files.length > 0, 'Export file should exist');

			// Verify export file is valid JSON
			const exportFile = path.join(exportDir, files[0]);
			const content = fs.readFileSync(exportFile, 'utf-8');
			const data = JSON.parse(content);

			// Verify structure
			assert.ok(data.summary, 'Should have summary property');
			assert.ok(data.exported_at, 'Should have exported_at property');
			assert.ok(data.extension_version, 'Should have extension_version property');

			// Verify summary data
			assert.strictEqual(data.summary.totalExports, 2, 'Should have 2 exports');
		});
	});

	suite('clearTelemetry Command', () => {
		beforeEach(async function() {
			this.timeout(5000);
			await vscode.workspace.getConfiguration('mermaidExportPro').update('telemetry.enabled', true, true);
		});

		it('should clear all telemetry data', async function() {
			this.timeout(5000);

			// Track some sample events
			telemetryService.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			telemetryService.trackCommand('export', 'palette');
			telemetryService.trackError('test-error', 'Test error', 'test');

			// Verify data exists
			let summary = telemetryService.generateSummary();
			assert.ok(summary.totalExports > 0, 'Should have exports before clearing');

			// Execute clear telemetry command
			await vscode.commands.executeCommand('mermaidExportPro.clearTelemetry');

			// Wait for operation to complete
			await new Promise(resolve => setTimeout(resolve, 1000));

			// Verify data is cleared
			summary = telemetryService.generateSummary();
			assert.strictEqual(summary.totalExports, 0, 'Should have no exports after clearing');
			assert.strictEqual(summary.totalErrors, 0, 'Should have no errors after clearing');
		});

		it('should not affect future tracking', async function() {
			this.timeout(5000);

			// Track and clear
			telemetryService.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			await vscode.commands.executeCommand('mermaidExportPro.clearTelemetry');
			await new Promise(resolve => setTimeout(resolve, 1000));

			// Track again
			telemetryService.trackExport('svg', 'web', 1000, 1024, 'sequence', true);

			// Verify new data is tracked
			const summary = telemetryService.generateSummary();
			assert.strictEqual(summary.totalExports, 1, 'Should track new export after clearing');
		});
	});

	suite('Telemetry Settings Integration', () => {
		it('should stop tracking when telemetry is disabled', async function() {
			this.timeout(5000);

			// Enable and track
			await vscode.workspace.getConfiguration('mermaidExportPro').update('telemetry.enabled', true, true);
			await new Promise(resolve => setTimeout(resolve, 500));
			await telemetryService.clearData();

			telemetryService.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);

			let summary = telemetryService.generateSummary();
			const initialCount = summary.totalExports;
			assert.ok(initialCount > 0, 'Should track when enabled');

			// Disable telemetry
			await vscode.workspace.getConfiguration('mermaidExportPro').update('telemetry.enabled', false, true);
			await new Promise(resolve => setTimeout(resolve, 500));

			// Try to track (should not work)
			telemetryService.trackExport('svg', 'web', 1000, 1024, 'sequence', true);

			summary = telemetryService.generateSummary();
			assert.strictEqual(summary.totalExports, initialCount, 'Should not track new exports when disabled');
		});
	});

	suite('Privacy Validation', () => {
		beforeEach(async function() {
			this.timeout(5000);
			await vscode.workspace.getConfiguration('mermaidExportPro').update('telemetry.enabled', true, true);
			await telemetryService.clearData();
			
			// Clean up export directory
			if (fs.existsSync(exportDir)) {
				const files = fs.readdirSync(exportDir);
				for (const file of files) {
					fs.unlinkSync(path.join(exportDir, file));
				}
			}
		});

		it('should sanitize file paths in exported data', async function() {
			this.timeout(10000);

			// Track error with file path
			telemetryService.trackError(
				'file-not-found',
				'File not found: C:\\Users\\SensitiveUser\\Documents\\secret-diagram.mmd',
				'export'
			);

			// Export data
			await vscode.commands.executeCommand('mermaidExportPro.exportTelemetry');
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Read export
			const files = fs.readdirSync(exportDir);
			assert.ok(files.length > 0, 'Export file should exist');

			const exportFile = path.join(exportDir, files[0]);
			const content = fs.readFileSync(exportFile, 'utf-8');

			// Verify no file paths
			assert.ok(!content.includes('SensitiveUser'), 'Should not include username');
			assert.ok(!content.includes('secret-diagram'), 'Should not include filename');
			assert.ok(content.includes('[PATH]'), 'Should include [PATH] placeholder');
		});

		it('should sanitize email addresses in exported data', async function() {
			this.timeout(10000);

			// Track error with email
			telemetryService.trackError(
				'email-error',
				'Failed to send report to user@example.com',
				'export'
			);

			// Export data
			await vscode.commands.executeCommand('mermaidExportPro.exportTelemetry');
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Read export
			const files = fs.readdirSync(exportDir);
			const exportFile = path.join(exportDir, files[0]);
			const content = fs.readFileSync(exportFile, 'utf-8');

			// Verify no email addresses
			assert.ok(!content.includes('user@example.com'), 'Should not include email');
			assert.ok(content.includes('[EMAIL]'), 'Should include [EMAIL] placeholder');
		});
	});
});
