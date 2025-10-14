import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Opt-in Telemetry Service for Mermaid Export Pro
 * 
 * This service collects anonymous usage data to help improve the extension.
 * All data collection is:
 * - Opt-in (disabled by default)
 * - Anonymous (no personal information)
 * - Local (stored on user's machine)
 * - Exportable (user can review and share)
 * 
 * Users control their data via settings and can export/delete at any time.
 */

export interface TelemetryEvent {
	timestamp: string;
	eventType: 'export' | 'error' | 'command' | 'health' | 'performance';
	action: string;
	details: TelemetryDetails;
	sessionId: string;
}

export interface TelemetryDetails {
	// Export events
	format?: string;
	strategy?: 'cli' | 'web';
	duration?: number;
	fileSize?: number;
	diagramType?: string;
	
	// Error events
	errorType?: string;
	errorMessage?: string;
	
	// Command events
	command?: string;
	source?: 'palette' | 'context-menu' | 'codelens' | 'status-bar';
	
	// Health events
	cliAvailable?: boolean;
	nodeVersion?: string;
	
	// System info (anonymous)
	platform?: string;
	vscodeVersion?: string;
	extensionVersion?: string;
}

export interface TelemetrySummary {
	totalExports: number;
	exportsByFormat: Record<string, number>;
	exportsByStrategy: Record<string, number>;
	exportsByDiagramType: Record<string, number>;
	averageExportTime: number;
	totalErrors: number;
	errorsByType: Record<string, number>;
	commandUsage: Record<string, number>;
	cliSuccessRate: number;
	webSuccessRate: number;
	sessionCount: number;
	firstUsed: string;
	lastUsed: string;
}

export class TelemetryService {
	private static instance: TelemetryService;
	private enabled: boolean = false;
	private sessionId: string;
	private events: TelemetryEvent[] = [];
	private readonly maxEvents: number = 10000; // Limit storage
	private readonly storageFile: string;
	private context: vscode.ExtensionContext;

	private constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.sessionId = this.generateSessionId();
		this.storageFile = path.join(context.globalStorageUri.fsPath, 'telemetry.json');
		
		// Load settings
		this.loadSettings();
		
		// Load existing events
		this.loadEvents();
		
		// Listen for settings changes
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('mermaidExportPro.telemetry')) {
				this.loadSettings();
			}
		});
	}

	public static getInstance(context: vscode.ExtensionContext): TelemetryService {
		if (!TelemetryService.instance) {
			TelemetryService.instance = new TelemetryService(context);
		}
		return TelemetryService.instance;
	}

	private loadSettings(): void {
		const config = vscode.workspace.getConfiguration('mermaidExportPro');
		const previousState = this.enabled;
		this.enabled = config.get<boolean>('telemetry.enabled', false);
		
		// Notify user when telemetry is enabled
		if (this.enabled && !previousState) {
			vscode.window.showInformationMessage(
				'Mermaid Export Pro: Anonymous telemetry enabled. Thank you for helping improve the extension! You can review and export your data anytime.',
				'Review Data',
				'Settings'
			).then(choice => {
				if (choice === 'Review Data') {
					vscode.commands.executeCommand('mermaidExportPro.showTelemetry');
				} else if (choice === 'Settings') {
					vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro.telemetry');
				}
			});
		}
	}

	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Track an export operation
	 */
	public trackExport(
		format: string,
		strategy: 'cli' | 'web',
		duration: number,
		fileSize: number,
		diagramType?: string,
		success: boolean = true
	): void {
		if (!this.enabled) {return;}

		this.addEvent({
			timestamp: new Date().toISOString(),
			eventType: success ? 'export' : 'error',
			action: success ? 'export_success' : 'export_failure',
			details: {
				format,
				strategy,
				duration,
				fileSize,
				diagramType,
				platform: os.platform(),
				vscodeVersion: vscode.version,
				extensionVersion: this.context.extension.packageJSON.version
			},
			sessionId: this.sessionId
		});
	}

	/**
	 * Track an error
	 */
	public trackError(errorType: string, errorMessage: string, action: string): void {
		if (!this.enabled) {return;}

		this.addEvent({
			timestamp: new Date().toISOString(),
			eventType: 'error',
			action,
			details: {
				errorType,
				errorMessage: this.sanitizeErrorMessage(errorMessage),
				platform: os.platform(),
				vscodeVersion: vscode.version,
				extensionVersion: this.context.extension.packageJSON.version
			},
			sessionId: this.sessionId
		});
	}

	/**
	 * Track command usage
	 */
	public trackCommand(command: string, source: 'palette' | 'context-menu' | 'codelens' | 'status-bar'): void {
		if (!this.enabled) {return;}

		this.addEvent({
			timestamp: new Date().toISOString(),
			eventType: 'command',
			action: 'command_executed',
			details: {
				command,
				source,
				platform: os.platform()
			},
			sessionId: this.sessionId
		});
	}

	/**
	 * Track system health check
	 */
	public trackHealthCheck(cliAvailable: boolean, nodeVersion?: string): void {
		if (!this.enabled) {return;}

		this.addEvent({
			timestamp: new Date().toISOString(),
			eventType: 'health',
			action: 'health_check',
			details: {
				cliAvailable,
				nodeVersion,
				platform: os.platform(),
				vscodeVersion: vscode.version,
				extensionVersion: this.context.extension.packageJSON.version
			},
			sessionId: this.sessionId
		});
	}

	/**
	 * Track performance metrics
	 */
	public trackPerformance(action: string, duration: number, details?: Record<string, any>): void {
		if (!this.enabled) {return;}

		this.addEvent({
			timestamp: new Date().toISOString(),
			eventType: 'performance',
			action,
			details: {
				duration,
				...details,
				platform: os.platform()
			},
			sessionId: this.sessionId
		});
	}

	private addEvent(event: TelemetryEvent): void {
		this.events.push(event);
		
		// Limit storage size
		if (this.events.length > this.maxEvents) {
			this.events = this.events.slice(-this.maxEvents);
		}
		
		// Save to disk (debounced)
		this.saveEventsDebounced();
	}

	private saveTimeout?: NodeJS.Timeout;
	private saveEventsDebounced(): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}
		
		this.saveTimeout = setTimeout(() => {
			this.saveEvents();
		}, 5000); // Save after 5 seconds of inactivity
	}

	private async saveEvents(): Promise<void> {
		try {
			// Ensure storage directory exists
			const dir = path.dirname(this.storageFile);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			
			// Write events to file
			fs.writeFileSync(
				this.storageFile,
				JSON.stringify(this.events, null, 2),
				'utf-8'
			);
		} catch (error) {
			console.error('[TelemetryService] Failed to save events:', error);
		}
	}

	private loadEvents(): void {
		try {
			if (fs.existsSync(this.storageFile)) {
				const data = fs.readFileSync(this.storageFile, 'utf-8');
				this.events = JSON.parse(data);
			}
		} catch (error) {
			console.error('[TelemetryService] Failed to load events:', error);
			this.events = [];
		}
	}

	/**
	 * Generate a summary of telemetry data
	 */
	public generateSummary(): TelemetrySummary {
		const exportEvents = this.events.filter(e => e.eventType === 'export');
		const errorEvents = this.events.filter(e => e.eventType === 'error');
		const commandEvents = this.events.filter(e => e.eventType === 'command');

		const summary: TelemetrySummary = {
			totalExports: exportEvents.length,
			exportsByFormat: {},
			exportsByStrategy: {},
			exportsByDiagramType: {},
			averageExportTime: 0,
			totalErrors: errorEvents.length,
			errorsByType: {},
			commandUsage: {},
			cliSuccessRate: 0,
			webSuccessRate: 0,
			sessionCount: new Set(this.events.map(e => e.sessionId)).size,
			firstUsed: this.events[0]?.timestamp || 'N/A',
			lastUsed: this.events[this.events.length - 1]?.timestamp || 'N/A'
		};

		// Aggregate export data
		let totalDuration = 0;
		let cliExports = 0;
		let cliSuccesses = 0;
		let webExports = 0;
		let webSuccesses = 0;

		for (const event of exportEvents) {
			const { format, strategy, duration, diagramType } = event.details;
			
			if (format) {
				summary.exportsByFormat[format] = (summary.exportsByFormat[format] || 0) + 1;
			}
			
			if (strategy) {
				summary.exportsByStrategy[strategy] = (summary.exportsByStrategy[strategy] || 0) + 1;
				
				if (strategy === 'cli') {
					cliExports++;
					if (event.action === 'export_success') {cliSuccesses++;}
				} else if (strategy === 'web') {
					webExports++;
					if (event.action === 'export_success') {webSuccesses++;}
				}
			}
			
			if (diagramType) {
				summary.exportsByDiagramType[diagramType] = (summary.exportsByDiagramType[diagramType] || 0) + 1;
			}
			
			if (duration) {
				totalDuration += duration;
			}
		}

		summary.averageExportTime = exportEvents.length > 0 ? totalDuration / exportEvents.length : 0;
		summary.cliSuccessRate = cliExports > 0 ? (cliSuccesses / cliExports) * 100 : 0;
		summary.webSuccessRate = webExports > 0 ? (webSuccesses / webExports) * 100 : 0;

		// Aggregate error data
		for (const event of errorEvents) {
			const { errorType } = event.details;
			if (errorType) {
				summary.errorsByType[errorType] = (summary.errorsByType[errorType] || 0) + 1;
			}
		}

		// Aggregate command usage
		for (const event of commandEvents) {
			const { command } = event.details;
			if (command) {
				summary.commandUsage[command] = (summary.commandUsage[command] || 0) + 1;
			}
		}

		return summary;
	}

	/**
	 * Export telemetry data for user review or sharing
	 */
	public async exportData(): Promise<string> {
		const summary = this.generateSummary();
		
		const exportData = {
			summary,
			raw_events: this.enabled ? this.events : 'Telemetry is disabled',
			exported_at: new Date().toISOString(),
			extension_version: this.context.extension.packageJSON.version,
			platform: os.platform(),
			vscode_version: vscode.version
		};

		// Create export directory
		const exportDir = path.join(os.homedir(), 'mermaid-export-pro-telemetry');
		if (!fs.existsSync(exportDir)) {
			fs.mkdirSync(exportDir, { recursive: true });
		}

		const exportPath = path.join(exportDir, `telemetry-export-${Date.now()}.json`);
		fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

		return exportPath;
	}

	/**
	 * Clear all telemetry data
	 */
	public async clearData(): Promise<void> {
		this.events = [];
		await this.saveEvents();
		vscode.window.showInformationMessage('Telemetry data cleared successfully.');
	}

	/**
	 * Show telemetry summary in a readable format
	 */
	public async showSummary(): Promise<void> {
		const summary = this.generateSummary();
		
		const markdown = `# Mermaid Export Pro - Usage Statistics

## Summary

- **Total Exports**: ${summary.totalExports}
- **Total Errors**: ${summary.totalErrors}
- **Sessions**: ${summary.sessionCount}
- **First Used**: ${summary.firstUsed}
- **Last Used**: ${summary.lastUsed}

## Export Statistics

### By Format
${Object.entries(summary.exportsByFormat).map(([format, count]) => `- ${format}: ${count}`).join('\n') || 'No data'}

### By Strategy
${Object.entries(summary.exportsByStrategy).map(([strategy, count]) => `- ${strategy}: ${count}`).join('\n') || 'No data'}

### By Diagram Type
${Object.entries(summary.exportsByDiagramType).map(([type, count]) => `- ${type}: ${count}`).join('\n') || 'No data'}

### Performance
- **Average Export Time**: ${summary.averageExportTime.toFixed(2)}ms
- **CLI Success Rate**: ${summary.cliSuccessRate.toFixed(1)}%
- **Web Success Rate**: ${summary.webSuccessRate.toFixed(1)}%

## Command Usage

${Object.entries(summary.commandUsage).map(([cmd, count]) => `- ${cmd}: ${count}`).join('\n') || 'No data'}

## Error Statistics

${Object.entries(summary.errorsByType).map(([type, count]) => `- ${type}: ${count}`).join('\n') || 'No errors recorded'}

---

**Telemetry Status**: ${this.enabled ? '✅ Enabled' : '❌ Disabled'}

${!this.enabled ? '\n*Enable telemetry in settings to help improve Mermaid Export Pro*' : ''}
`;

		const doc = await vscode.workspace.openTextDocument({
			content: markdown,
			language: 'markdown'
		});
		
		await vscode.window.showTextDocument(doc, { preview: true });
	}

	private sanitizeErrorMessage(message: string): string {
		// Remove potential personal information from error messages
		// Remove file paths
		message = message.replace(/[A-Z]:\\[\w\s\-\\\/\.]+/g, '[PATH]');
		message = message.replace(/\/[\w\s\-\/\.]+/g, '[PATH]');
		
		// Remove email addresses
		message = message.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL]');
		
		// Keep message under 500 characters
		return message.substring(0, 500);
	}

	/**
	 * Dispose and save remaining events
	 */
	public dispose(): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}
		this.saveEvents();
	}
}
