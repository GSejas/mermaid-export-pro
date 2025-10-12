"use strict";
/**
 * BackgroundHealthMonitor
 *
 * Monitors long-running export operations and memory pressure in the background for the extension.
 * This class is implemented as a singleton and is intended to be started once (via start()) and
 * stopped when the extension is deactivated (stop()). When started it schedules periodic, silent
 * health checks and may surface non-blocking user notifications with actions when problems are
 * detected.
 *
 * Responsibilities
 * - Periodically poll an OperationTimeoutManager for active operations and detect "stuck" operations
 *   that exceed a configured duration threshold.
 * - Detect elevated memory usage (heap or RSS) and present an optional, discreet notification to the user.
 * - Provide actions on notifications such as showing diagnostics, triggering an emergency cleanup or
 *   suggesting/performing garbage collection when available.
 * - Track when it has already notified about a particular issue to avoid spamming the user (cooldown).
 * - Expose a lightweight synchronous health snapshot for external callers (getHealthStatus).
 *
 * Behavior and side-effects
 * - Uses a setInterval-based timer to run checks at CHECK_INTERVAL_MS intervals while started.
 * - Registers a disposable with the provided vscode.ExtensionContext to ensure stop() is called on disposal.
 * - Logs informational/warning/error messages via an ErrorHandler.
 * - Shows non-modal vscode warning messages for stuck operations and memory pressure. These messages
 *   can trigger commands: 'mermaidExportPro.diagnostics' and OperationTimeoutManager.emergencyCleanup().
 * - May call global.gc() if available after performing emergency cleanup.
 *
 * Threading / concurrency
 * - Designed for use on the Node.js single-threaded event loop used by VS Code extensions. All internal
 *   state mutations are performed synchronously inside the scheduled check or action handlers.
 *
 * Public API
 * - static getInstance(context): returns the singleton instance; the context is used to register disposal.
 * - start(): begins periodic monitoring. Safe to call multiple times; subsequent calls are no-ops while running.
 * - stop(): stops periodic monitoring and clears the interval timer.
 * - async forceHealthCheck(): immediately performs the health checks (same logic as the scheduled checks).
 * - getHealthStatus(): returns a synchronous snapshot object:
 *     - isHealthy: boolean indicating whether any issues were detected
 *     - activeOperations: number of currently tracked operations
 *     - memoryUsageMB: approximate heap usage in MB
 *     - issues: array of human-readable issue summaries (e.g. "1 stuck operation(s)", "High memory usage (120MB)")
 *
 * Configuration (see source constants)
 * - CHECK_INTERVAL_MS: how often checks run (default: 30s)
 * - LONG_RUNNING_THRESHOLD: duration after which an operation is considered stuck (default: 90s)
 * - NOTIFICATION_COOLDOWN_MS: cooldown between user notifications (default: 5 minutes)
 *
 * Notes
 * - The monitor intentionally keeps user-facing prompts non-modal to avoid interrupting workflows.
 * - The class relies on OperationTimeoutManager.getActiveOperations() for operation metadata; each operation
 *   is expected to contain at least { id: string, duration: number }.
 * - Memory thresholds are conservative for an extension host; adjust constants if different trade-offs are required.
 *
 * Example
 * const monitor = BackgroundHealthMonitor.getInstance(context);
 * monitor.start();
 *
 * @remarks This TSDoc block documents the externally visible behavior and public API. Implementation
 * details such as private helper methods are intentionally omitted from the public surface documentation.
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
exports.BackgroundHealthMonitor = void 0;
const vscode = __importStar(require("vscode"));
const operationTimeoutManager_1 = require("./operationTimeoutManager");
const errorHandler_1 = require("../ui/errorHandler");
class BackgroundHealthMonitor {
    static instance;
    monitorTimer;
    context;
    // Monitoring configuration
    CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds
    LONG_RUNNING_THRESHOLD = 90_000; // 90s = definitely stuck
    NOTIFICATION_COOLDOWN_MS = 300_000; // 5 minutes between notifications
    // State tracking
    lastNotificationTime = 0;
    notifiedOperations = new Set();
    constructor(context) {
        this.context = context;
    }
    static getInstance(context) {
        if (!BackgroundHealthMonitor.instance) {
            BackgroundHealthMonitor.instance = new BackgroundHealthMonitor(context);
        }
        return BackgroundHealthMonitor.instance;
    }
    /**
     * Start background monitoring
     */
    start() {
        if (this.monitorTimer) {
            return; // Already running
        }
        errorHandler_1.ErrorHandler.logInfo('Starting background health monitor');
        this.monitorTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.CHECK_INTERVAL_MS);
        // Register disposal
        this.context.subscriptions.push({
            dispose: () => this.stop()
        });
    }
    /**
     * Stop background monitoring
     */
    stop() {
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = undefined;
            errorHandler_1.ErrorHandler.logInfo('Stopped background health monitor');
        }
    }
    /**
     * Perform silent health check
     */
    async performHealthCheck() {
        try {
            const timeoutManager = operationTimeoutManager_1.OperationTimeoutManager.getInstance();
            const activeOperations = timeoutManager.getActiveOperations();
            if (activeOperations.length === 0) {
                // Clear notification state when all operations complete
                this.notifiedOperations.clear();
                return;
            }
            // Check for stuck operations
            const stuckOperations = activeOperations.filter(op => op.duration > this.LONG_RUNNING_THRESHOLD && !this.notifiedOperations.has(op.id));
            if (stuckOperations.length > 0) {
                await this.handleStuckOperations(stuckOperations);
            }
            // Memory pressure check
            await this.checkMemoryPressure();
        }
        catch (error) {
            errorHandler_1.ErrorHandler.logError(`Background health check failed: ${error}`);
        }
    }
    /**
     * Handle detection of stuck operations
     */
    async handleStuckOperations(stuckOperations) {
        const now = Date.now();
        // Check cooldown period
        if (now - this.lastNotificationTime < this.NOTIFICATION_COOLDOWN_MS) {
            return; // Too soon since last notification
        }
        // Mark operations as notified
        stuckOperations.forEach(op => this.notifiedOperations.add(op.id));
        this.lastNotificationTime = now;
        const count = stuckOperations.length;
        const longestDuration = Math.max(...stuckOperations.map(op => op.duration));
        const longestDurationSec = Math.round(longestDuration / 1000);
        errorHandler_1.ErrorHandler.logWarning(`Detected ${count} stuck operation(s), longest running: ${longestDurationSec}s`);
        // Show discreet notification with actions
        const message = count === 1
            ? `Export operation appears stuck (${longestDurationSec}s)`
            : `${count} export operations appear stuck (up to ${longestDurationSec}s)`;
        const action = await vscode.window.showWarningMessage(message, { modal: false }, // Non-blocking
        'Show Details', 'Emergency Cleanup', 'Ignore for 10min');
        if (action === 'Show Details') {
            await vscode.commands.executeCommand('mermaidExportPro.diagnostics');
        }
        else if (action === 'Emergency Cleanup') {
            const timeoutManager = operationTimeoutManager_1.OperationTimeoutManager.getInstance();
            await timeoutManager.emergencyCleanup();
            vscode.window.showInformationMessage('Emergency cleanup completed');
        }
        else if (action === 'Ignore for 10min') {
            // Extend cooldown
            this.lastNotificationTime = now + (10 * 60 * 1000) - this.NOTIFICATION_COOLDOWN_MS;
        }
    }
    /**
     * Check for memory pressure that might indicate issues
     */
    async checkMemoryPressure() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / (1024 * 1024);
        const rssMB = memUsage.rss / (1024 * 1024);
        // Thresholds for VS Code extension (conservative)
        const HIGH_HEAP_MB = 150;
        const HIGH_RSS_MB = 250;
        if (heapUsedMB > HIGH_HEAP_MB || rssMB > HIGH_RSS_MB) {
            errorHandler_1.ErrorHandler.logWarning(`High memory usage detected: Heap=${Math.round(heapUsedMB)}MB, RSS=${Math.round(rssMB)}MB`);
            // Only notify if we haven't recently
            const now = Date.now();
            const memoryNotificationKey = 'memory-pressure';
            if (!this.notifiedOperations.has(memoryNotificationKey)) {
                this.notifiedOperations.add(memoryNotificationKey);
                // Remove from set after some time to allow re-notification
                setTimeout(() => {
                    this.notifiedOperations.delete(memoryNotificationKey);
                }, this.NOTIFICATION_COOLDOWN_MS);
                const choice = await vscode.window.showWarningMessage(`High memory usage detected (${Math.round(heapUsedMB)}MB). This might slow down VS Code.`, { modal: false }, 'Show Diagnostics', 'Emergency Cleanup', 'Ignore');
                if (choice === 'Show Diagnostics') {
                    await vscode.commands.executeCommand('mermaidExportPro.diagnostics');
                }
                else if (choice === 'Emergency Cleanup') {
                    const timeoutManager = operationTimeoutManager_1.OperationTimeoutManager.getInstance();
                    await timeoutManager.emergencyCleanup();
                    // Suggest garbage collection (Node.js)
                    if (global.gc) {
                        global.gc();
                        vscode.window.showInformationMessage('Emergency cleanup and garbage collection completed');
                    }
                    else {
                        vscode.window.showInformationMessage('Emergency cleanup completed');
                    }
                }
            }
        }
    }
    /**
     * Get current health status for external queries
     */
    getHealthStatus() {
        const timeoutManager = operationTimeoutManager_1.OperationTimeoutManager.getInstance();
        const activeOperations = timeoutManager.getActiveOperations();
        const memUsage = process.memoryUsage();
        const memoryUsageMB = Math.round(memUsage.heapUsed / (1024 * 1024));
        const issues = [];
        // Check for stuck operations
        const stuckCount = activeOperations.filter(op => op.duration > this.LONG_RUNNING_THRESHOLD).length;
        if (stuckCount > 0) {
            issues.push(`${stuckCount} stuck operation(s)`);
        }
        // Check memory pressure
        if (memoryUsageMB > 100) {
            issues.push(`High memory usage (${memoryUsageMB}MB)`);
        }
        const isHealthy = issues.length === 0;
        return {
            isHealthy,
            activeOperations: activeOperations.length,
            memoryUsageMB,
            issues
        };
    }
    /**
     * Force a health check (for manual triggers)
     */
    async forceHealthCheck() {
        await this.performHealthCheck();
    }
}
exports.BackgroundHealthMonitor = BackgroundHealthMonitor;
//# sourceMappingURL=backgroundHealthMonitor.js.map