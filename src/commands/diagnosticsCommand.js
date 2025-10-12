"use strict";
/**
 * Diagnostics Command - Show operation status and system health
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
exports.runDiagnosticsCommand = runDiagnosticsCommand;
exports.runQuickHealthCheck = runQuickHealthCheck;
const vscode = __importStar(require("vscode"));
const operationTimeoutManager_1 = require("../services/operationTimeoutManager");
async function runDiagnosticsCommand() {
    const timeoutManager = operationTimeoutManager_1.OperationTimeoutManager.getInstance();
    const activeOperations = timeoutManager.getActiveOperations();
    const channel = vscode.window.createOutputChannel('Mermaid Export Pro - Diagnostics');
    channel.clear();
    // Header
    channel.appendLine('='.repeat(60));
    channel.appendLine('MERMAID EXPORT PRO - DIAGNOSTICS REPORT');
    channel.appendLine('='.repeat(60));
    channel.appendLine(`Generated: ${new Date().toISOString()}`);
    channel.appendLine('');
    // Active Operations
    channel.appendLine('📊 ACTIVE OPERATIONS');
    channel.appendLine('-'.repeat(30));
    if (activeOperations.length === 0) {
        channel.appendLine('✅ No active operations (all clear)');
    }
    else {
        activeOperations.forEach((op, index) => {
            const durationSec = Math.round(op.duration / 1000);
            const status = op.isWarned ? '⚠️ WARNED' : '🔄 RUNNING';
            channel.appendLine(`${index + 1}. ${status} ${op.name}`);
            channel.appendLine(`   ID: ${op.id}`);
            channel.appendLine(`   Duration: ${durationSec}s`);
            channel.appendLine('');
        });
        // Show emergency cleanup option
        if (activeOperations.some(op => op.duration > 30000)) {
            const choice = await vscode.window.showWarningMessage(`Found ${activeOperations.length} long-running operation(s). Some may be stuck.`, 'Emergency Cleanup', 'Keep Monitoring', 'Show Details');
            if (choice === 'Emergency Cleanup') {
                await timeoutManager.emergencyCleanup();
                channel.appendLine('🧹 EMERGENCY CLEANUP PERFORMED');
                vscode.window.showInformationMessage('All hanging operations have been cleaned up');
            }
            else if (choice === 'Show Details') {
                channel.show();
            }
        }
    }
    channel.appendLine('');
    // System Information
    channel.appendLine('💻 SYSTEM INFORMATION');
    channel.appendLine('-'.repeat(30));
    channel.appendLine(`Platform: ${process.platform} ${process.arch}`);
    channel.appendLine(`Node.js Version: ${process.version}`);
    channel.appendLine(`VS Code Version: ${vscode.version}`);
    channel.appendLine('');
    // Memory Usage
    const memory = process.memoryUsage();
    channel.appendLine('🧠 MEMORY USAGE');
    channel.appendLine('-'.repeat(30));
    channel.appendLine(`RSS (Resident Set Size): ${Math.round(memory.rss / 1024 / 1024)}MB`);
    channel.appendLine(`Heap Used: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
    channel.appendLine(`Heap Total: ${Math.round(memory.heapTotal / 1024 / 1024)}MB`);
    channel.appendLine(`External: ${Math.round(memory.external / 1024 / 1024)}MB`);
    channel.appendLine('');
    // Extension Health
    channel.appendLine('🏥 EXTENSION HEALTH');
    channel.appendLine('-'.repeat(30));
    // Check CLI availability
    try {
        const { CLIExportStrategy } = require('../strategies/cliExportStrategy');
        const cliStrategy = new CLIExportStrategy();
        const cliAvailable = await cliStrategy.isAvailable();
        channel.appendLine(`CLI Export Strategy: ${cliAvailable ? '✅ Available' : '❌ Not Available'}`);
        if (cliAvailable) {
            const dependencies = cliStrategy.getRequiredDependencies();
            channel.appendLine(`  Dependencies: ${dependencies.join(', ')}`);
        }
    }
    catch (error) {
        channel.appendLine(`CLI Export Strategy: ❌ Error checking (${error})`);
    }
    // Check Web availability
    try {
        const webAvailable = true; // Web strategy is always available
        channel.appendLine(`Web Export Strategy: ${webAvailable ? '✅ Available' : '❌ Not Available'}`);
    }
    catch (error) {
        channel.appendLine(`Web Export Strategy: ❌ Error checking (${error})`);
    }
    channel.appendLine('');
    // Configuration
    channel.appendLine('⚙️ CONFIGURATION');
    channel.appendLine('-'.repeat(30));
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    channel.appendLine(`Default Format: ${config.get('defaultFormat', 'svg')}`);
    channel.appendLine(`Theme: ${config.get('theme', 'default')}`);
    channel.appendLine(`Export Strategy: ${config.get('exportStrategy', 'auto')}`);
    channel.appendLine(`Auto Export: ${config.get('autoExport', false)}`);
    channel.appendLine(`Background Color: ${config.get('backgroundColor', 'transparent')}`);
    channel.appendLine('');
    // Recommendations
    channel.appendLine('💡 RECOMMENDATIONS');
    channel.appendLine('-'.repeat(30));
    if (activeOperations.length > 0) {
        channel.appendLine('• Consider canceling stuck operations if they exceed 2+ minutes');
        channel.appendLine('• Large diagrams may take longer - this is normal');
        channel.appendLine('• Try switching export strategies if one consistently fails');
    }
    if (memory.heapUsed > 100 * 1024 * 1024) { // >100MB
        channel.appendLine('• High memory usage detected - consider restarting VS Code');
    }
    channel.appendLine('• Report persistent issues at: https://github.com/anthropics/claude-code/issues');
    channel.appendLine('');
    // Footer
    channel.appendLine('='.repeat(60));
    channel.appendLine('END OF DIAGNOSTICS REPORT');
    channel.appendLine('='.repeat(60));
    // Show the channel
    channel.show();
    // Also show summary in status bar
    const summary = activeOperations.length === 0
        ? '✅ All systems normal'
        : `⚠️ ${activeOperations.length} active operation(s)`;
    vscode.window.showInformationMessage(`Diagnostics: ${summary}`, 'Show Full Report', 'Emergency Cleanup').then(choice => {
        if (choice === 'Show Full Report') {
            channel.show();
        }
        else if (choice === 'Emergency Cleanup') {
            timeoutManager.emergencyCleanup();
        }
    });
}
async function runQuickHealthCheck() {
    const timeoutManager = operationTimeoutManager_1.OperationTimeoutManager.getInstance();
    const activeOperations = timeoutManager.getActiveOperations();
    if (activeOperations.length === 0) {
        vscode.window.showInformationMessage('✅ No hanging operations detected');
        return;
    }
    const longRunning = activeOperations.filter(op => op.duration > 30000);
    const warned = activeOperations.filter(op => op.isWarned);
    let message = `Found ${activeOperations.length} active operation(s)`;
    if (longRunning.length > 0) {
        message += `, ${longRunning.length} running >30s`;
    }
    if (warned.length > 0) {
        message += `, ${warned.length} with warnings`;
    }
    const action = await vscode.window.showWarningMessage(message, 'Show Details', 'Emergency Cleanup', 'Monitor');
    if (action === 'Show Details') {
        await runDiagnosticsCommand();
    }
    else if (action === 'Emergency Cleanup') {
        await timeoutManager.emergencyCleanup();
        vscode.window.showInformationMessage('Emergency cleanup completed');
    }
    else if (action === 'Monitor') {
        // Show active operations in status bar for 10 seconds
        const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
        statusItem.text = `$(sync~spin) ${activeOperations.length} active exports`;
        statusItem.tooltip = 'Click for details';
        statusItem.command = 'mermaidExportPro.diagnostics';
        statusItem.show();
        setTimeout(() => {
            statusItem.dispose();
        }, 10000);
    }
}
//# sourceMappingURL=diagnosticsCommand.js.map