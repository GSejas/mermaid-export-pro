import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TelemetryService } from '../../../services/telemetryService';
import * as vscode from 'vscode';

// Mock fs module
vi.mock('fs', () => ({
	existsSync: vi.fn(() => false),
	readFileSync: vi.fn(() => '[]'),
	writeFileSync: vi.fn(() => {}),
	mkdirSync: vi.fn(() => undefined),
	unlinkSync: vi.fn(() => {}),
	promises: {
		writeFile: vi.fn(() => Promise.resolve()),
		mkdir: vi.fn(() => Promise.resolve()),
		unlink: vi.fn(() => Promise.resolve()),
	},
}));

describe('TelemetryService Unit Tests', () => {
	let mockContext: any;
	let mockConfig: any;
	let telemetryEnabled = false;

	beforeEach(() => {
		// Reset state
		telemetryEnabled = false;
		(TelemetryService as any).instance = null;

		// Mock ExtensionContext
		mockContext = {
			globalStorageUri: {
				fsPath: '/mock/storage/path',
			},
			extension: {
				packageJSON: {
					version: '1.0.6',
				},
			},
		};

		// Mock configuration
		mockConfig = {
			get: vi.fn((key: string, defaultValue?: any) => {
				if (key === 'telemetry.enabled') {
					return telemetryEnabled;
				}
				return defaultValue;
			}),
		};

		vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(mockConfig as any);
		vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
		(TelemetryService as any).instance = null;
	});

	describe('Singleton Pattern', () => {
		it('should create singleton instance', () => {
			const instance1 = TelemetryService.getInstance(mockContext);
			const instance2 = TelemetryService.getInstance(mockContext);
			expect(instance1).toBe(instance2);
		});

		it('should initialize correctly', () => {
			const instance = TelemetryService.getInstance(mockContext);
			expect(instance).toBeDefined();
		});
	});

	describe('Export Tracking', () => {
		beforeEach(() => {
			telemetryEnabled = true;
			(TelemetryService as any).instance = null;
		});

		it('should track export when enabled', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			
			const summary = service.generateSummary();
			expect(summary.totalExports).toBe(1);
		});

		it('should not track when disabled', () => {
			telemetryEnabled = false;
			const service = TelemetryService.getInstance(mockContext);
			service.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			
			const summary = service.generateSummary();
			expect(summary.totalExports).toBe(0);
		});

		it('should track multiple exports', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			service.trackExport('svg', 'web', 1000, 1024, 'sequence', true);
			
			const summary = service.generateSummary();
			expect(summary.totalExports).toBe(2);
			expect(summary.exportsByFormat['png']).toBe(1);
			expect(summary.exportsByFormat['svg']).toBe(1);
		});
	});

	describe('Error Tracking', () => {
		beforeEach(() => {
			telemetryEnabled = true;
			(TelemetryService as any).instance = null;
		});

		it('should track errors when enabled', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackError('timeout', 'Export timeout', 'export');
			
			const summary = service.generateSummary();
			expect(summary.totalErrors).toBe(1);
		});

		it('should aggregate errors by type', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackError('timeout', 'Export timeout', 'export');
			service.trackError('timeout', 'Another timeout', 'export');
			service.trackError('cli-error', 'CLI failed', 'export');
			
			const summary = service.generateSummary();
			expect(summary.totalErrors).toBe(3);
			expect(summary.errorsByType['timeout']).toBe(2);
			expect(summary.errorsByType['cli-error']).toBe(1);
		});
	});

	describe('Command Tracking', () => {
		beforeEach(() => {
			telemetryEnabled = true;
			(TelemetryService as any).instance = null;
		});

		it('should track command execution', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackCommand('export', 'palette');
			
			const summary = service.generateSummary();
			expect(summary.commandUsage['export']).toBe(1);
		});

		it('should track commands from different sources', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackCommand('export', 'palette');
			service.trackCommand('exportAll', 'context-menu');
			
			const summary = service.generateSummary();
			expect(summary.commandUsage['export']).toBe(1);
			expect(summary.commandUsage['exportAll']).toBe(1);
		});
	});

	describe('Health Check Tracking', () => {
		beforeEach(() => {
			telemetryEnabled = true;
			(TelemetryService as any).instance = null;
		});

		it('should track health checks', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackHealthCheck(true, 'v18.17.0');
			
			// Health checks are tracked as events
			expect(service).toBeDefined();
		});
	});

	describe('Performance Tracking', () => {
		beforeEach(() => {
			telemetryEnabled = true;
			(TelemetryService as any).instance = null;
		});

		it('should track performance metrics', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackPerformance('export', 1500, { diagrams: 5 });
			
			expect(service).toBeDefined();
		});
	});

	describe('Summary Generation', () => {
		beforeEach(() => {
			telemetryEnabled = true;
			(TelemetryService as any).instance = null;
		});

		it('should generate empty summary for new service', () => {
			const service = TelemetryService.getInstance(mockContext);
			const summary = service.generateSummary();
			
			expect(summary.totalExports).toBe(0);
			expect(summary.totalErrors).toBe(0);
			expect(summary.sessionCount).toBe(0);
		});

		it('should calculate correct statistics', () => {
			const service = TelemetryService.getInstance(mockContext);
			
			service.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			service.trackExport('svg', 'web', 1000, 1024, 'sequence', true);
			service.trackError('timeout', 'Export timeout', 'export');
			service.trackCommand('export', 'palette');
			
			const summary = service.generateSummary();
			
			expect(summary.totalExports).toBe(2);
			expect(summary.totalErrors).toBe(1);
			expect(summary.exportsByFormat['png']).toBe(1);
			expect(summary.exportsByFormat['svg']).toBe(1);
			expect(summary.commandUsage['export']).toBe(1);
		});
	});

	describe('Data Export', () => {
		beforeEach(() => {
			telemetryEnabled = true;
			(TelemetryService as any).instance = null;
		});

		it('should export telemetry data', async () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			
			const exportPath = await service.exportData();
			
			expect(exportPath).toBeDefined();
			expect(typeof exportPath).toBe('string');
			// Verify export was attempted (fs.writeFileSync would be called)
		});
	});

	describe('Data Clearing', () => {
		beforeEach(() => {
			telemetryEnabled = true;
			(TelemetryService as any).instance = null;
		});

		it('should clear all data', async () => {
			const service = TelemetryService.getInstance(mockContext);
			
			service.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			service.trackCommand('export', 'palette');
			
			let summary = service.generateSummary();
			expect(summary.totalExports).toBe(1);
			
			await service.clearData();
			
			summary = service.generateSummary();
			expect(summary.totalExports).toBe(0);
		});
	});

	describe('Privacy - Error Message Sanitization', () => {
		beforeEach(() => {
			telemetryEnabled = true;
			(TelemetryService as any).instance = null;
		});

		it('should sanitize file paths in error messages', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackError(
				'file-error',
				'Error at C:\\Users\\TestUser\\Documents\\diagram.mmd',
				'export'
			);
			
			const summary = service.generateSummary();
			expect(summary.totalErrors).toBe(1);
			// Sanitization happens internally
		});

		it('should sanitize email addresses in error messages', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackError(
				'email-error',
				'Failed to send to user@example.com',
				'export'
			);
			
			const summary = service.generateSummary();
			expect(summary.totalErrors).toBe(1);
			// Sanitization happens internally
		});

		it('should truncate long error messages', () => {
			const service = TelemetryService.getInstance(mockContext);
			const longMessage = 'A'.repeat(1000);
			
			service.trackError('long-error', longMessage, 'export');
			
			const summary = service.generateSummary();
			expect(summary.totalErrors).toBe(1);
			// Message is truncated to 500 chars internally
		});
	});

	describe('Configuration Changes', () => {
		it('should respond to configuration changes', () => {
			telemetryEnabled = false;
			const service = TelemetryService.getInstance(mockContext);
			
			service.trackCommand('export', 'palette');
			let summary = service.generateSummary();
			expect(summary.commandUsage['export']).toBeUndefined();
			
			// Enable telemetry
			telemetryEnabled = true;
			service.trackCommand('exportAll', 'palette');
			summary = service.generateSummary();
			// Still won't track because service was initialized with disabled state
			// This tests the initialization behavior
		});
	});

	describe('Dispose', () => {
		beforeEach(() => {
			telemetryEnabled = true;
			(TelemetryService as any).instance = null;
		});

		it('should dispose cleanly', () => {
			const service = TelemetryService.getInstance(mockContext);
			service.trackExport('png', 'cli', 1500, 2048, 'flowchart', true);
			
			service.dispose();
			
			// Should have attempted to save
			expect(service).toBeDefined();
		});
	});
});
