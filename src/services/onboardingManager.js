"use strict";
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
exports.OnboardingManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const errorHandler_1 = require("../ui/errorHandler");
const cliExportStrategy_1 = require("../strategies/cliExportStrategy");
/**
 * Manages the onboarding and setup experience for the Mermaid Export Pro extension.
 *
 * Responsibilities
 * - Detects system capabilities (Node.js, npm/yarn, Mermaid CLI, workspace package.json).
 * - Shows a welcome/onboarding flow for first-time users (Quick Setup, Custom Setup, Skip).
 * - Recommends and optionally executes an installation strategy (local, global, web-only).
 * - Persists onboarding completion and chosen setup preference to extension global state.
 * - Validates existing setup on subsequent activations and offers remediation if a previously
 *   selected CLI-based setup is no longer available.
 *
 * Key side effects
 * - Displays UI dialogs and notifications (vscode.window.showInformationMessage, showWarningMessage,
 *   showQuickPick).
 * - Opens a terminal and sends installation commands for local/global installation flows.
 * - Updates extension configuration (e.g. sets exportStrategy = 'web' in web-only mode).
 * - Persists state to the extension context globalState via keys:
 *     - mermaidExportPro.onboardingCompleted
 *     - mermaidExportPro.setupPreference
 *
 * Usage
 * - Instantiate with the active vscode.ExtensionContext and call maybeShowWelcome() during activation
 *   to trigger the onboarding flow if required.
 * - The runSetup() method is provided to re-run the setup flow from the command palette.
 *
 * Notes & behavior details
 * - Onboarding is skipped automatically while the extension is running in Development mode to avoid
 *   repetitive prompts during extension development.
 * - Quick Setup:
 *     - Runs a system analysis, recommends a method, and (if confirmed) drives install actions inside
 *       a progress notification.
 *     - The quick flow attempts to automatically detect and choose a reasonable default (local if a
 *       workspace package.json exists and Node/npm are present; global otherwise; web-only as a fallback).
 * - Custom Setup:
 *     - Shows a detailed capability summary then presents explicit installation options for the user
 *       to choose (e.g., Local / Global / Web-only / Skip).
 * - Installation actions:
 *     - Local installation opens a terminal in the workspace root and runs `npm install @mermaid-js/mermaid-cli`.
 *     - Global installation opens a terminal and runs `npm install -g @mermaid-js/mermaid-cli`.
 *     - Web-only configuration updates extension settings to prefer the web export strategy.
 *   Note: The implementation currently enqueues terminal commands and resolves shortly after showing
 *   the terminal; a full implementation could monitor completion and parse output.
 *
 * Error handling and resiliency
 * - System detection uses best-effort checks and logs warnings via ErrorHandler when detection fails.
 * - Command availability checks gate the recommendation logic and time out after ~3s.
 * - validateExistingSetup() performs a silent CLI availability check on subsequent runs and prompts
 *   the user to reinstall or switch to web-only if a CLI-based preference is no longer valid.
 *
 * Constructor
 * @param context - The extension context used to read/write global state and access workspace info.
 *
 * Public API (intended for extension activation / commands)
 * - maybeShowWelcome(): Promise<void>
 *     Checks whether onboarding should run (skipping in development), then either starts the welcome
 *     flow or validates existing setup.
 *
 * - runSetup(): Promise<void>
 *     Allows manual triggering of the Quick / Custom / Reset flows from the command palette.
 *
 * Persistence keys (globalState)
 * - mermaidExportPro.onboardingCompleted (boolean)
 * - mermaidExportPro.setupPreference (InstallMethod: 'local' | 'global' | 'web-only' | 'skip')
 *
 * Types used (referenced)
 * - SystemCapabilities: structure describing hasNodeJs, nodeVersion, hasNpm, hasYarn, hasMermaidCli,
 *   mermaidVersion, workspaceHasPackageJson, canInstallGlobally, etc.
 * - InstallMethod: union of allowed install choices ('local' | 'global' | 'web-only' | 'skip').
 *
 * Example
 * ```
 * // In extension activation
 * const onboarding = new OnboardingManager(context);
 * await onboarding.maybeShowWelcome();
 * ```
 *
 * Implementation detail reminder
 * - Many helper methods are implemented as private (detectSystemCapabilities, getRecommendedMethod,
 *   showAnalysisResults, installLocal/Global, configureWebOnly, completeOnboarding, resetOnboarding, etc.).
 * - The class interacts with a CLIExportStrategy abstraction for checking and querying the Mermaid CLI.
 */
class OnboardingManager {
    context;
    static ONBOARDING_KEY = 'mermaidExportPro.onboardingCompleted';
    static SETUP_PREFERENCE_KEY = 'mermaidExportPro.setupPreference';
    constructor(context) {
        this.context = context;
    }
    /**
     * Check if user needs onboarding and show welcome if needed
     */
    async maybeShowWelcome() {
        // During development (Extension Development Host) global state may be reset between runs.
        // Skip showing onboarding in dev mode to avoid repeated prompts while debugging.
        if (this.context.extensionMode === vscode.ExtensionMode.Development) {
            errorHandler_1.ErrorHandler.logInfo('Skipping onboarding in development mode');
            return;
        }
        const hasCompletedOnboarding = this.context.globalState.get(OnboardingManager.ONBOARDING_KEY, false);
        if (!hasCompletedOnboarding) {
            await this.showWelcomeFlow();
        }
        else {
            // Check if setup is still valid
            await this.validateExistingSetup();
        }
    }
    /**
     * Show welcome notification and start onboarding
     */
    async showWelcomeFlow() {
        errorHandler_1.ErrorHandler.logInfo('Starting onboarding flow for new user');
        const selection = await vscode.window.showInformationMessage('🎉 Welcome to Mermaid Export Pro! Let\'s set up the best export experience for your system.', 'Quick Setup', 'Custom Setup', 'Skip Setup');
        switch (selection) {
            case 'Quick Setup':
                await this.runQuickSetup();
                break;
            case 'Custom Setup':
                await this.runCustomSetup();
                break;
            case 'Skip Setup':
                await this.completeOnboarding('skip');
                break;
            default:
                // User dismissed - show again next time
                break;
        }
    }
    /**
     * Quick setup - auto-detect and install with minimal user input
     */
    async runQuickSetup() {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Setting up Mermaid Export Pro...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Analyzing system...' });
            // Detect system capabilities
            const capabilities = await this.detectSystemCapabilities();
            progress.report({ increment: 30, message: 'System analysis complete' });
            // Determine best setup method
            const recommendedMethod = this.getRecommendedMethod(capabilities);
            progress.report({ increment: 50, message: `Recommended: ${recommendedMethod}` });
            // Show results and get user confirmation
            const shouldProceed = await this.showAnalysisResults(capabilities, recommendedMethod);
            if (shouldProceed) {
                progress.report({ increment: 70, message: 'Installing dependencies...' });
                await this.executeInstallation(recommendedMethod);
                progress.report({ increment: 100, message: 'Setup complete!' });
                await this.showSetupComplete(recommendedMethod);
                await this.completeOnboarding(recommendedMethod);
            }
        });
    }
    /**
     * Custom setup - let user choose installation method
     */
    async runCustomSetup() {
        const capabilities = await this.detectSystemCapabilities();
        // Show capabilities first
        await this.showDetailedCapabilities(capabilities);
        // Let user choose method
        const method = await this.showInstallationOptions(capabilities);
        if (method && method !== 'skip') {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Installing with ${method} method...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                await this.executeInstallation(method);
                progress.report({ increment: 100 });
            });
            await this.showSetupComplete(method);
        }
        await this.completeOnboarding(method || 'skip');
    }
    /**
     * Detect what's available on the system
     */
    async detectSystemCapabilities() {
        const capabilities = {
            hasNodeJs: false,
            hasMermaidCli: false,
            hasNpm: false,
            hasYarn: false,
            workspaceHasPackageJson: false,
            canInstallGlobally: true // Assume true, will be tested during install
        };
        try {
            // Check Node.js
            const nodeVersion = process.version;
            if (nodeVersion) {
                capabilities.hasNodeJs = true;
                capabilities.nodeVersion = nodeVersion;
            }
        }
        catch (error) {
            errorHandler_1.ErrorHandler.logWarning('Could not detect Node.js version');
        }
        try {
            // Check npm
            capabilities.hasNpm = await this.commandExists('npm');
            capabilities.hasYarn = await this.commandExists('yarn');
        }
        catch (error) {
            errorHandler_1.ErrorHandler.logWarning('Could not detect package managers');
        }
        try {
            // Check Mermaid CLI
            const cliStrategy = new cliExportStrategy_1.CLIExportStrategy();
            capabilities.hasMermaidCli = await cliStrategy.isAvailable();
            if (capabilities.hasMermaidCli) {
                capabilities.mermaidVersion = await cliStrategy.getVersion();
            }
        }
        catch (error) {
            errorHandler_1.ErrorHandler.logWarning('Could not detect Mermaid CLI');
        }
        // Check workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const packageJsonPath = path.join(workspaceFolders[0].uri.fsPath, 'package.json');
            capabilities.workspaceHasPackageJson = await fs.promises.access(packageJsonPath).then(() => true).catch(() => false);
        }
        return capabilities;
    }
    async commandExists(command) {
        return new Promise((resolve) => {
            const child = (0, child_process_1.spawn)(command, ['--version'], { stdio: 'pipe' });
            child.on('error', () => resolve(false));
            child.on('close', (code) => resolve(code === 0));
            // Timeout after 3 seconds
            setTimeout(() => {
                child.kill();
                resolve(false);
            }, 3000);
        });
    }
    getRecommendedMethod(capabilities) {
        if (capabilities.hasMermaidCli) {
            return 'skip'; // Already installed
        }
        if (capabilities.hasNodeJs && capabilities.hasNpm) {
            if (capabilities.workspaceHasPackageJson) {
                return 'local'; // Workspace-based install
            }
            else {
                return 'global'; // System-wide install
            }
        }
        return 'web-only'; // Fallback to web-only mode
    }
    async showAnalysisResults(capabilities, recommended) {
        let message = '🔍 System Analysis Complete!\n\n';
        message += `✅ Node.js: ${capabilities.hasNodeJs ? `Found (${capabilities.nodeVersion})` : 'Not found'}\n`;
        message += `✅ Package Manager: ${capabilities.hasNpm ? 'npm' : capabilities.hasYarn ? 'yarn' : 'Not found'}\n`;
        message += `✅ Mermaid CLI: ${capabilities.hasMermaidCli ? `Installed (${capabilities.mermaidVersion})` : 'Not installed'}\n`;
        message += `✅ VS Code Webview: Available\n\n`;
        if (recommended === 'skip') {
            message += '🎉 Great! Mermaid CLI is already installed and ready to use.';
            const selection = await vscode.window.showInformationMessage(message, 'Test Export', 'View Settings', 'Continue');
            if (selection === 'Test Export') {
                await vscode.commands.executeCommand('mermaidExportPro.debugExport');
            }
            else if (selection === 'View Settings') {
                await vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
            }
            return false; // No installation needed
        }
        const methodNames = {
            'local': 'Local Installation (workspace)',
            'global': 'Global Installation (system-wide)',
            'web-only': 'Web-only Mode (SVG, PNG, JPG exports - no CLI needed)'
        };
        message += `💡 Recommendation: ${methodNames[recommended]}\n\n`;
        message += 'Proceed with recommended setup?';
        const selection = await vscode.window.showInformationMessage(message, 'Yes, Install', 'Choose Different Method', 'Cancel');
        return selection === 'Yes, Install';
    }
    async showDetailedCapabilities(capabilities) {
        let message = '🔍 Detailed System Information:\n\n';
        message += `Node.js: ${capabilities.hasNodeJs ? `✅ ${capabilities.nodeVersion}` : '❌ Not found'}\n`;
        message += `NPM: ${capabilities.hasNpm ? '✅ Available' : '❌ Not found'}\n`;
        message += `Yarn: ${capabilities.hasYarn ? '✅ Available' : '❌ Not found'}\n`;
        message += `Mermaid CLI: ${capabilities.hasMermaidCli ? `✅ ${capabilities.mermaidVersion}` : '❌ Not installed'}\n`;
        message += `Package.json: ${capabilities.workspaceHasPackageJson ? '✅ Found in workspace' : '❌ Not found'}\n`;
        message += `VS Code Webview: ✅ Available (fallback option)\n`;
        await vscode.window.showInformationMessage(message, 'Continue');
    }
    async showInstallationOptions(capabilities) {
        const options = [];
        if (capabilities.hasMermaidCli) {
            options.push({
                label: '✅ Already Installed',
                description: 'Mermaid CLI is ready to use',
                detail: `Version: ${capabilities.mermaidVersion}`,
                picked: true
            });
        }
        if (capabilities.hasNodeJs && capabilities.hasNpm) {
            if (capabilities.workspaceHasPackageJson) {
                options.push({
                    label: '🏠 Local Installation',
                    description: 'Install in current workspace',
                    detail: 'Recommended - Works with this project only'
                });
            }
            options.push({
                label: '🌍 Global Installation',
                description: 'Install system-wide',
                detail: 'Available for all projects'
            });
        }
        options.push({
            label: '🌐 Web-Only Mode',
            description: 'No Node.js/CLI installation needed',
            detail: 'Instant exports: SVG, PNG, JPG supported. PDF requires CLI installation.'
        });
        options.push({
            label: '⏭️ Skip Setup',
            description: 'Configure later',
            detail: 'You can run setup anytime from Command Palette'
        });
        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: 'Choose installation method',
            ignoreFocusOut: true
        });
        if (!selection) {
            return undefined;
        }
        if (selection.label.includes('Already Installed')) {
            return 'skip';
        }
        if (selection.label.includes('Local')) {
            return 'local';
        }
        if (selection.label.includes('Global')) {
            return 'global';
        }
        if (selection.label.includes('Web-Only')) {
            return 'web-only';
        }
        if (selection.label.includes('Skip')) {
            return 'skip';
        }
        return undefined;
    }
    async executeInstallation(method) {
        switch (method) {
            case 'local':
                await this.installLocal();
                break;
            case 'global':
                await this.installGlobal();
                break;
            case 'web-only':
                await this.configureWebOnly();
                break;
            case 'skip':
                // No installation needed
                break;
        }
    }
    async installLocal() {
        return new Promise((resolve, reject) => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                reject(new Error('No workspace folder found for local installation'));
                return;
            }
            const terminal = vscode.window.createTerminal({
                name: 'Mermaid Setup',
                cwd: workspaceRoot
            });
            terminal.sendText('npm install @mermaid-js/mermaid-cli');
            terminal.show();
            // Note: In a full implementation, you'd monitor the terminal output
            // For now, we'll just resolve after showing the terminal
            setTimeout(() => {
                errorHandler_1.ErrorHandler.logInfo('Local installation command sent to terminal');
                resolve();
            }, 1000);
        });
    }
    async installGlobal() {
        return new Promise((resolve) => {
            const terminal = vscode.window.createTerminal({
                name: 'Mermaid Setup (Global)'
            });
            terminal.sendText('npm install -g @mermaid-js/mermaid-cli');
            terminal.show();
            setTimeout(() => {
                errorHandler_1.ErrorHandler.logInfo('Global installation command sent to terminal');
                resolve();
            }, 1000);
        });
    }
    async configureWebOnly() {
        // Configure extension to prefer web strategy
        const config = vscode.workspace.getConfiguration('mermaidExportPro');
        await config.update('exportStrategy', 'web', vscode.ConfigurationTarget.Global);
        errorHandler_1.ErrorHandler.logInfo('Configured extension for web-only mode');
    }
    async showSetupComplete(method) {
        const messages = {
            'local': 'Local installation completed! Mermaid CLI is ready for this workspace.',
            'global': 'Global installation completed! Mermaid CLI is now available system-wide.',
            'web-only': 'Web-only mode configured! ✨ Instant exports to SVG, PNG, JPG formats. For PDF exports, install Mermaid CLI later.',
            'skip': 'Setup completed! Your existing Mermaid CLI installation is ready to use.'
        };
        const selection = await vscode.window.showInformationMessage(`🎉 ${messages[method]}`, 'Test Export', 'Open Settings', 'Done');
        if (selection === 'Test Export') {
            await vscode.commands.executeCommand('mermaidExportPro.debugExport');
        }
        else if (selection === 'Open Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'mermaidExportPro');
        }
    }
    async completeOnboarding(method) {
        await this.context.globalState.update(OnboardingManager.ONBOARDING_KEY, true);
        await this.context.globalState.update(OnboardingManager.SETUP_PREFERENCE_KEY, method);
        errorHandler_1.ErrorHandler.logInfo(`Onboarding completed with method: ${method}`);
    }
    async validateExistingSetup() {
        // Silently check if CLI is still available
        try {
            const cliStrategy = new cliExportStrategy_1.CLIExportStrategy();
            const isAvailable = await cliStrategy.isAvailable();
            if (!isAvailable) {
                const preference = this.context.globalState.get(OnboardingManager.SETUP_PREFERENCE_KEY);
                if (preference === 'local' || preference === 'global') {
                    // CLI was expected but not found - offer to reinstall
                    const selection = await vscode.window.showWarningMessage('Mermaid CLI is no longer available. Would you like to reinstall it?', 'Reinstall', 'Switch to Web-Only', 'Later');
                    if (selection === 'Reinstall') {
                        await this.runCustomSetup();
                    }
                    else if (selection === 'Switch to Web-Only') {
                        await this.configureWebOnly();
                        await this.context.globalState.update(OnboardingManager.SETUP_PREFERENCE_KEY, 'web-only');
                    }
                }
            }
            // If CLI is available, do nothing - no need to show "ready" messages after initial setup
        }
        catch (error) {
            errorHandler_1.ErrorHandler.logWarning(`Setup validation failed: ${error}`);
        }
    }
    /**
     * Manually trigger setup (for command palette)
     */
    async runSetup() {
        const selection = await vscode.window.showQuickPick([
            { label: '⚡ Quick Setup', description: 'Auto-detect and install' },
            { label: '🎯 Custom Setup', description: 'Choose installation method' },
            { label: '🔄 Reset Setup', description: 'Clear preferences and start over' }
        ], {
            placeHolder: 'Choose setup option'
        });
        if (!selection) {
            return;
        }
        if (selection.label.includes('Quick')) {
            await this.runQuickSetup();
        }
        else if (selection.label.includes('Custom')) {
            await this.runCustomSetup();
        }
        else if (selection.label.includes('Reset')) {
            await this.resetOnboarding();
            await this.showWelcomeFlow();
        }
    }
    async resetOnboarding() {
        await this.context.globalState.update(OnboardingManager.ONBOARDING_KEY, false);
        await this.context.globalState.update(OnboardingManager.SETUP_PREFERENCE_KEY, undefined);
        errorHandler_1.ErrorHandler.logInfo('Onboarding state reset');
    }
}
exports.OnboardingManager = OnboardingManager;
//# sourceMappingURL=onboardingManager.js.map