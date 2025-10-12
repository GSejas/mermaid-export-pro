"use strict";
/**
 * Manages the Mermaid Export Pro status bar item and coordinates UI feedback,
 * availability probing and user interactions related to exporting Mermaid diagrams.
 *
 * Responsibilities:
 * - Creates and controls a single VS Code StatusBarItem that reflects the current
 *   export strategy state (CLI available, web-only, not-configured, or checking).
 * - Inspects the active editor to detect Mermaid diagrams (both .mmd files and
 *   fenced "```mermaid" blocks in Markdown) and exposes the diagram count and
 *   file information in the status bar text and tooltip.
 * - Probes available export strategies using CLIExportStrategy and updates the
 *   displayed status accordingly; respects explicit user configuration (web-only).
 * - Reacts to editor and document change events to update visibility and content.
 * - Handles user interactions on the status bar:
 *     - When configured (CLI or web) triggers an export of the active file.
 *     - When unconfigured offers a setup/onboarding flow or refresh options.
 * - Delegates onboarding/setup flows to the provided OnboardingManager.
 * - Exposes lifecycle helpers for external callers (refresh, onConfigurationChanged,
 *   show/hide and dispose).
 *
 * Behavior and lifecycle notes:
 * - Intended to be instantiated once during extension activation and disposed with
 *   the extension context. The created StatusBarItem is pushed into the provided
 *   ExtensionContext.subscriptions for automatic disposal.
 * - Listens to vscode.window.onDidChangeActiveTextEditor and
 *   vscode.workspace.onDidChangeTextDocument to keep the status display in sync
 *   with the active editor and file contents.
 * - The status bar display format is configurable via the
 *   'mermaidExportPro.statusBarDisplayFormat' setting (e.g. 'icon-only', 'icon-count',
 *   'text-count'). Other presentation aspects (colors, tooltip content) adapt to the
 *   current state and detected diagram count.
 * - The status bar item exposes a click command id ('mermaidExportPro.statusBarClick')
 *   which should be wired to call the instance.handleClick() action by the extension's
 *   command registration (or the extension can register the same command to call into
 *   this instance).
 *
 * Usage example:
 * - Instantiate during activation:
 *   const statusBarManager = new StatusBarManager(context, onboardingManager);
 *   // Optionally register a command that delegates to statusBarManager.handleClick
 *   context.subscriptions.push(
 *     vscode.commands.registerCommand('mermaidExportPro.statusBarClick', () => statusBarManager.handleClick())
 *   );
 *
 * Public API:
 * - constructor(context, onboardingManager)
 * - checkStrategyStatus(): Promise<void> — probe available export strategies and update UI
 * - handleClick(): Promise<void> — invoked when the user clicks the status item; starts
 *   export or setup flows depending on current state
 * - refresh(): Promise<void> — public method to force a status re-check
 * - onConfigurationChanged(): Promise<void> — call when extension settings change
 * - show(): void — show the status bar item
 * - hide(): void — hide the status bar item
 * - dispose(): void — dispose of internal resources and the status bar item
 *
 * @public
 * @param context - The VS Code extension context used for resource lifecycle and subscriptions.
 * @param onboardingManager - Manager responsible for running onboarding / setup flows
 *                            (e.g. CLI installation, configuration).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarManager = void 0;
const vscode = __importStar(require("vscode"));
const cliExportStrategy_1 = require("../strategies/cliExportStrategy");
const errorHandler_1 = require("./errorHandler");
/**
 * Manages the VS Code status bar item for the Mermaid Export Pro extension.
 *
 * Responsibilities:
 * - Create, show/hide and dispose a StatusBarItem.
 * - Inspect the active editor for Mermaid diagrams and compute diagram counts.
 * - Probe available export strategies (CLI or web) and maintain the current state.
 * - Update the status bar text, tooltip and styling based on state, file content and user preferences.
 * - Handle user interactions on the status bar to trigger exports or onboarding/setup flows.
 *
 * Remarks:
 * - Listens to active editor and document change events; intended to be instantiated once during extension activation.
 * - Delegates onboarding/setup flows to the provided OnboardingManager instance.
 * - Uses CLIExportStrategy to probe the availability/version of native export tools.
 * - The status bar display format can be configured via 'mermaidExportPro.statusBarDisplayFormat'.
 *
 * @public
 */
class StatusBarManager {
    statusBarItem;
    currentState;
    onboardingManager;
    context;
    constructor(context, onboardingManager) {
        this.context = context;
        this.onboardingManager = onboardingManager;
        console.log('[mermaidExportPro] StatusBarManager constructed');
        // Create status bar item (right side, before language mode)
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 200 // Priority - main status bar (left of theme, higher priority for grouping)
        );
        this.currentState = { status: 'checking' };
        // Register click command
        this.statusBarItem.command = 'mermaidExportPro.statusBarClick';
        // Add to disposal
        context.subscriptions.push(this.statusBarItem);
        // Listen for active editor changes to show/hide status bar
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
            this.updateVisibility();
        }), vscode.workspace.onDidChangeTextDocument((e) => {
            // Update diagram count when document content changes
            if (e.document === vscode.window.activeTextEditor?.document) {
                this.updateVisibility();
            }
        }));
        // Initial setup
        console.log('[mermaidExportPro] StatusBarManager initial checkStrategyStatus()');
        this.checkStrategyStatus();
        console.log('[mermaidExportPro] StatusBarManager initial updateVisibility()');
        this.updateVisibility();
    }
    /**
     * Check current export strategy availability and update status
     */
    async checkStrategyStatus() {
        this.currentState.status = 'checking';
        this.updateStatusBar();
        try {
            const cliStrategy = new cliExportStrategy_1.CLIExportStrategy();
            const isCliAvailable = await cliStrategy.isAvailable();
            if (isCliAvailable) {
                try {
                    const version = await cliStrategy.getVersion();
                    this.currentState = {
                        status: 'cli-available',
                        details: `CLI v${version}`,
                        lastCheck: new Date()
                    };
                }
                catch (error) {
                    this.currentState = {
                        status: 'cli-available',
                        details: 'CLI available',
                        lastCheck: new Date()
                    };
                }
            }
            else {
                // Check if user has explicitly chosen web-only mode
                const config = vscode.workspace.getConfiguration('mermaidExportPro');
                const strategy = config.get('exportStrategy');
                if (strategy === 'web') {
                    this.currentState = {
                        status: 'web-only',
                        details: 'Web strategy configured',
                        lastCheck: new Date()
                    };
                }
                else {
                    this.currentState = {
                        status: 'not-configured',
                        details: 'CLI not found, needs setup',
                        lastCheck: new Date()
                    };
                }
            }
        }
        catch (error) {
            this.currentState = {
                status: 'not-configured',
                details: 'Error checking status',
                lastCheck: new Date()
            };
            errorHandler_1.ErrorHandler.logWarning(`Status check failed: ${error}`);
        }
        this.updateStatusBar();
    }
    /**
     * Update the visual appearance of the status bar item
     */
    updateStatusBar() {
        // Get current diagram count and file info
        const { diagramCount, fileName } = this.getMermaidDiagramInfo();
        this.currentState.diagramCount = diagramCount;
        this.currentState.fileName = fileName;
        // If there's no active editor at all, hide the status item
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.statusBarItem.hide();
            return;
        }
        // Get display format setting
        const config = vscode.workspace.getConfiguration('mermaidExportPro');
        const displayFormat = config.get('statusBarDisplayFormat', 'icon-count');
        // Build status text based on configuration status and diagram count
        const { statusText, tooltip, backgroundColor, color } = this.buildStatusBarContent(diagramCount, fileName, displayFormat);
        this.statusBarItem.text = statusText;
        this.statusBarItem.tooltip = tooltip;
        this.statusBarItem.backgroundColor = backgroundColor;
        this.statusBarItem.color = color;
        this.statusBarItem.show();
    }
    /**
     * Build status bar content based on state and display format
     */
    buildStatusBarContent(diagramCount, fileName, displayFormat) {
        const getStatusIcon = (status) => {
            switch (status) {
                case 'not-configured': return '$(alert)';
                case 'cli-available': return '$(file-media)';
                case 'web-only': return '$(globe)';
                case 'checking': return '$(loading~spin)';
                default: return '$(file-media)';
            }
        };
        const getCountText = (count, format) => {
            if (format === 'icon-only') {
                return '';
            }
            if (format === 'icon-count') {
                return count > 0 ? ` ${count}` : '';
            }
            if (format === 'text-count') {
                if (count === 0) {
                    return '';
                }
                return count === 1 ? ` 1 Mermaid` : ` ${count} Mermaids`;
            }
            return '';
        };
        const icon = getStatusIcon(this.currentState.status);
        const countText = getCountText(diagramCount, displayFormat);
        let statusText = '';
        let tooltip = '';
        let backgroundColor;
        let color;
        switch (this.currentState.status) {
            case 'not-configured':
                statusText = diagramCount > 0
                    ? `${icon}${countText} - Setup`
                    : `${icon} Mermaid Export Pro - Setup`;
                tooltip = diagramCount > 0
                    ? `Mermaid Export Pro: ${diagramCount} diagram${diagramCount > 1 ? 's' : ''} found in ${fileName}\nClick to set up export tools`
                    : `Mermaid Export Pro: No diagrams found in the active file. Click to set up export tools.`;
                backgroundColor = undefined;
                color = new vscode.ThemeColor('statusBarItem.warningForeground');
                break;
            case 'cli-available':
            case 'web-only':
                const strategyName = this.currentState.status === 'cli-available' ? 'CLI' : 'Web';
                statusText = diagramCount > 0
                    ? `${icon}${countText}`
                    : `${icon} Mermaid Export Pro`;
                tooltip = diagramCount > 0
                    ? `Mermaid Export Pro: ${diagramCount} diagram${diagramCount > 1 ? 's' : ''} in ${fileName}\nClick to export all diagrams (${strategyName})`
                    : `Mermaid Export Pro: ${strategyName} export available. Open a file with mermaid diagrams to export.`;
                backgroundColor = undefined;
                color = new vscode.ThemeColor('statusBarItem.prominentForeground');
                break;
            case 'checking':
                statusText = diagramCount > 0
                    ? `${icon}${countText}`
                    : `${icon} Mermaid Export Pro`;
                tooltip = diagramCount > 0
                    ? `Mermaid Export Pro: ${diagramCount} diagram${diagramCount > 1 ? 's' : ''} in ${fileName}\nChecking export tools...`
                    : `Mermaid Export Pro: Checking export tools...`;
                backgroundColor = undefined;
                color = undefined;
                break;
        }
        return { statusText, tooltip, backgroundColor, color };
    }
    /**
     * Get mermaid diagram information from current file
     */
    getMermaidDiagramInfo() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return { diagramCount: 0, fileName: '' };
        }
        const document = editor.document;
        const fileName = document.fileName;
        const baseName = fileName.split(/[\\/]/).pop() || '';
        const content = document.getText();
        // Check file extension
        if (fileName.endsWith('.mmd')) {
            // Pure mermaid file - count as 1 diagram if not empty
            return {
                diagramCount: content.trim() ? 1 : 0,
                fileName: baseName
            };
        }
        // Check for markdown files with mermaid content
        if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
            const diagramCount = this.countMermaidBlocksInMarkdown(content);
            return { diagramCount, fileName: baseName };
        }
        return { diagramCount: 0, fileName: baseName };
    }
    /**
     * Count mermaid blocks in markdown content
     */
    countMermaidBlocksInMarkdown(content) {
        // Use regex to find all mermaid code blocks more reliably
        const mermaidBlockRegex = /```\s*mermaid[\s\S]*?```/gi;
        const matches = content.match(mermaidBlockRegex);
        return matches ? matches.length : 0;
    }
    /**
     * Check if current editor has mermaid content
     */
    hasMermaidContent() {
        const { diagramCount } = this.getMermaidDiagramInfo();
        return diagramCount > 0;
    }
    /**
     * Update visibility based on current editor
     */
    updateVisibility() {
        if (this.hasMermaidContent()) {
            this.updateStatusBar(); // This calls show()
        }
        else {
            this.statusBarItem.hide();
        }
    }
    /**
     * Handle status bar item clicks
     */
    async handleClick() {
        // If configured properly, directly export current file
        if (this.currentState.status === 'cli-available' || this.currentState.status === 'web-only') {
            await this.exportCurrentFile();
            return;
        }
        // Otherwise show setup options
        switch (this.currentState.status) {
            case 'not-configured':
                await this.showSetupOptions();
                break;
            case 'checking':
                vscode.window.showInformationMessage('Still checking export strategy status...');
                break;
        }
    }
    /**
     * Export current file directly
     */
    async exportCurrentFile() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        try {
            // Use export all command - it will handle single diagrams gracefully too
            // Pass the active document URI so the export command knows which file to process
            await vscode.commands.executeCommand('mermaidExportPro.exportAll', editor.document.uri);
        }
        catch (error) {
            // If main export fails, show options
            await this.showConfiguredOptions();
        }
    }
    /**
     * Show setup options for unconfigured state
     */
    async showSetupOptions() {
        const selection = await vscode.window.showQuickPick([
            {
                label: '⚡ Quick Setup',
                description: 'Auto-detect and configure',
                detail: 'Recommended - Let us configure the best option for you'
            },
            {
                label: '🎯 Custom Setup',
                description: 'Choose installation method',
                detail: 'Select between CLI, web-only, or other options'
            },
            {
                label: '🔄 Refresh Status',
                description: 'Check current state',
                detail: 'Re-scan for available export tools'
            }
        ], {
            placeHolder: 'Mermaid Export Pro is not configured. Choose an option:'
        });
        if (!selection) {
            return;
        }
        if (selection.label.includes('Quick Setup')) {
            // Delegate to onboarding manager
            const onboarding = this.onboardingManager;
            await onboarding.runSetup();
            // Refresh status after setup
            await this.checkStrategyStatus();
        }
        else if (selection.label.includes('Custom Setup')) {
            const onboarding = this.onboardingManager;
            await onboarding.runSetup();
            await this.checkStrategyStatus();
        }
        else if (selection.label.includes('Refresh')) {
            await this.checkStrategyStatus();
        }
    }
    /**
     * Show options when CLI is available and working
     */
    async showConfiguredOptions() {
        const selection = await vscode.window.showQuickPick([
            {
                label: '📊 Test Export',
                description: 'Run debug export test',
                detail: 'Test both CLI and web export strategies'
            },
            {
                label: '⚙️ Settings',
                description: 'Open extension settings',
                detail: 'Configure export preferences'
            },
            {
                label: '🔄 Refresh Status',
                description: 'Check current state',
                detail: 'Re-scan export tool availability'
            },
            {
                label: '🛠️ Reconfigure',
                description: 'Change setup',
                detail: 'Run setup wizard again'
            }
        ], {
            placeHolder: `Mermaid CLI is ready (${this.currentState.details}). Choose an option:`
        });
        if (!selection) {
            return;
        }
        if (selection.label.includes('Test Export')) {
            await vscode.commands.executeCommand('mermaidExportPro.debugExport');
        }
        else if (selection.label.includes('Settings')) {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
        }
        else if (selection.label.includes('Refresh')) {
            await this.checkStrategyStatus();
        }
        else if (selection.label.includes('Reconfigure')) {
            await this.onboardingManager.runSetup();
            await this.checkStrategyStatus();
        }
    }
    /**
     * Show options for web-only mode
     */
    async showWebOnlyOptions() {
        const selection = await vscode.window.showQuickPick([
            {
                label: '📊 Test Export',
                description: 'Test web export',
                detail: 'Run debug export to test web strategy'
            },
            {
                label: '⬆️ Upgrade to CLI',
                description: 'Install CLI tools',
                detail: 'Get better export quality with CLI strategy'
            },
            {
                label: '⚙️ Settings',
                description: 'Open extension settings',
                detail: 'Configure export preferences'
            },
            {
                label: '🔄 Refresh Status',
                description: 'Check for CLI',
                detail: 'See if CLI tools have been installed'
            }
        ], {
            placeHolder: 'Mermaid is in web-only mode. Choose an option:'
        });
        if (!selection) {
            return;
        }
        if (selection.label.includes('Test Export')) {
            await vscode.commands.executeCommand('mermaidExportPro.debugExport');
        }
        else if (selection.label.includes('Upgrade')) {
            await this.onboardingManager.runSetup();
            await this.checkStrategyStatus();
        }
        else if (selection.label.includes('Settings')) {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
        }
        else if (selection.label.includes('Refresh')) {
            await this.checkStrategyStatus();
        }
    }
    /**
     * Refresh status (public method for external calls)
     */
    async refresh() {
        await this.checkStrategyStatus();
    }
    /**
     * Update status based on configuration changes
     */
    async onConfigurationChanged() {
        await this.checkStrategyStatus();
    }
    /**
     * Hide the status bar item
     */
    hide() {
        this.statusBarItem.hide();
    }
    /**
     * Show the status bar item
     */
    show() {
        this.statusBarItem.show();
    }
    /**
     * Dispose of the status bar item
     */
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.StatusBarManager = StatusBarManager;
//# sourceMappingURL=statusBarManager.js.map