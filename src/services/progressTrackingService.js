"use strict";
/**
 * Progress Tracking Service
 *
 * Comprehensive progress tracking and reporting system for batch operations with:
 * - Real-time progress updates with rich metadata
 * - Performance monitoring and analytics
 * - Cancellation support with cleanup
 * - Event-driven architecture for UI updates
 * - Memory efficient tracking with automatic cleanup
 *
 * @author Jorge Sequeira
 * @version 2.0.0
 * @date 2025-08-27
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
exports.progressTrackingService = exports.ProgressTrackingServiceImpl = void 0;
exports.createProgressTrackingService = createProgressTrackingService;
const events_1 = require("events");
const path = __importStar(require("path"));
const errorHandler_1 = require("../ui/errorHandler");
/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
    updateIntervalMs: 100, // Update UI every 100ms
    performanceHistorySize: 100, // Keep last 100 snapshots
    autoCleanupAfterMs: 300000, // Cleanup after 5 minutes
    memoryWarningThresholdMB: 256 // Warn if memory usage > 256MB
};
class ProgressTrackingServiceImpl extends events_1.EventEmitter {
    progressStates = new Map();
    config;
    updateTimer;
    cleanupTimer;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.startPeriodicCleanup();
    }
    /**
     * Create new progress reporter for a batch operation
     */
    createReporter(batchId) {
        errorHandler_1.ErrorHandler.logInfo(`Creating progress reporter for batch: ${batchId}`);
        const initialProgress = {
            batchId,
            overallProgress: 0,
            currentJob: undefined,
            completedJobs: 0,
            totalJobs: 0,
            jobCounts: {
                pending: 0,
                running: 0,
                completed: 0,
                failed: 0,
                skipped: 0
            },
            timing: {
                startedAt: new Date(),
                estimatedCompletion: new Date(),
                averageJobTime: 0,
                remainingTime: 0
            },
            currentOperation: {
                phase: 'discovery',
                message: 'Initializing...',
                subProgress: 0
            },
            performance: {
                jobsPerSecond: 0,
                totalThroughput: 0,
                memoryUsage: this.getCurrentMemoryUsage()
            }
        };
        const reporter = new ProgressReporterImpl(batchId, this);
        const state = {
            batchId,
            progress: initialProgress,
            reporter,
            subscribers: [],
            cancelled: false,
            lastUpdated: new Date(),
            performanceHistory: [],
            cleanupCallbacks: []
        };
        this.progressStates.set(batchId, state);
        this.startProgressUpdates();
        return reporter;
    }
    /**
     * Get current progress for a batch
     */
    getProgress(batchId) {
        const state = this.progressStates.get(batchId);
        return state ? { ...state.progress } : null;
    }
    /**
     * Subscribe to progress updates
     */
    onProgress(batchId, callback) {
        const state = this.progressStates.get(batchId);
        if (state) {
            state.subscribers.push(callback);
            // Immediately call with current progress
            callback({ ...state.progress });
        }
        else {
            errorHandler_1.ErrorHandler.logWarning(`No progress state found for batch: ${batchId}`);
        }
    }
    /**
     * Cancel operation and cleanup
     */
    cancel(batchId) {
        const state = this.progressStates.get(batchId);
        if (state) {
            errorHandler_1.ErrorHandler.logInfo(`Cancelling batch operation: ${batchId}`);
            state.cancelled = true;
            state.progress.currentOperation = {
                phase: 'failed',
                message: 'Operation cancelled by user',
                subProgress: 0
            };
            // Execute cleanup callbacks
            for (const cleanup of state.cleanupCallbacks) {
                try {
                    cleanup();
                }
                catch (error) {
                    errorHandler_1.ErrorHandler.logError(`Cleanup callback failed: ${error}`);
                }
            }
            this.notifySubscribers(batchId);
            // Schedule cleanup
            setTimeout(() => this.cleanup(batchId), 1000);
        }
    }
    /**
     * Manual cleanup of tracking data
     */
    cleanup(batchId) {
        const state = this.progressStates.get(batchId);
        if (state) {
            errorHandler_1.ErrorHandler.logInfo(`Cleaning up progress tracking for batch: ${batchId}`);
            // Clear subscribers
            state.subscribers.length = 0;
            // Remove from tracking
            this.progressStates.delete(batchId);
            // Emit cleanup event
            this.emit('batchCleanup', batchId);
            // Stop update timer if no active batches
            if (this.progressStates.size === 0) {
                this.stopProgressUpdates();
            }
        }
    }
    /**
     * Get performance analytics for a batch
     */
    getPerformanceAnalytics(batchId) {
        const state = this.progressStates.get(batchId);
        return state ? [...state.performanceHistory] : [];
    }
    /**
     * Get summary of all active batches
     */
    getActiveBatches() {
        return Array.from(this.progressStates.keys());
    }
    /**
     * Internal method to update progress state
     */
    updateProgress(batchId, updates) {
        const state = this.progressStates.get(batchId);
        if (!state)
            return;
        // Merge updates
        state.progress = { ...state.progress, ...updates };
        state.lastUpdated = new Date();
        // Update timing calculations
        this.updateTimingCalculations(state);
        // Update performance metrics
        this.updatePerformanceMetrics(state);
        // Check memory usage
        this.checkMemoryUsage(state);
        // Notify subscribers
        this.notifySubscribers(batchId);
    }
    /**
     * Private implementation methods
     */
    startProgressUpdates() {
        if (this.updateTimer)
            return;
        this.updateTimer = setInterval(() => {
            for (const [batchId, state] of this.progressStates) {
                if (!state.cancelled) {
                    this.updatePerformanceMetrics(state);
                    this.notifySubscribers(batchId);
                }
            }
        }, this.config.updateIntervalMs);
    }
    stopProgressUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = undefined;
        }
    }
    startPeriodicCleanup() {
        this.cleanupTimer = setInterval(() => {
            const cutoffTime = Date.now() - this.config.autoCleanupAfterMs;
            for (const [batchId, state] of this.progressStates) {
                if (state.lastUpdated.getTime() < cutoffTime) {
                    errorHandler_1.ErrorHandler.logInfo(`Auto-cleaning up stale batch: ${batchId}`);
                    this.cleanup(batchId);
                }
            }
        }, this.config.autoCleanupAfterMs / 2); // Check twice as often as cleanup interval
    }
    updateTimingCalculations(state) {
        const progress = state.progress;
        const now = new Date();
        const elapsed = now.getTime() - progress.timing.startedAt.getTime();
        if (progress.completedJobs > 0) {
            progress.timing.averageJobTime = elapsed / progress.completedJobs;
            if (progress.totalJobs > progress.completedJobs) {
                const remainingJobs = progress.totalJobs - progress.completedJobs;
                progress.timing.remainingTime = remainingJobs * progress.timing.averageJobTime;
                progress.timing.estimatedCompletion = new Date(now.getTime() + progress.timing.remainingTime);
            }
        }
    }
    updatePerformanceMetrics(state) {
        const progress = state.progress;
        const now = new Date();
        const elapsed = (now.getTime() - progress.timing.startedAt.getTime()) / 1000;
        // Calculate throughput
        if (elapsed > 0) {
            progress.performance.jobsPerSecond = progress.completedJobs / elapsed;
            progress.performance.totalThroughput = progress.completedJobs;
        }
        // Update memory usage
        progress.performance.memoryUsage = this.getCurrentMemoryUsage();
        // Add performance snapshot
        const snapshot = {
            timestamp: now,
            completedJobs: progress.completedJobs,
            jobsPerSecond: progress.performance.jobsPerSecond,
            memoryUsage: progress.performance.memoryUsage,
            activeJobs: progress.jobCounts.running
        };
        state.performanceHistory.push(snapshot);
        // Limit history size
        if (state.performanceHistory.length > this.config.performanceHistorySize) {
            state.performanceHistory.shift();
        }
    }
    checkMemoryUsage(state) {
        const memoryMB = state.progress.performance.memoryUsage / (1024 * 1024);
        if (memoryMB > this.config.memoryWarningThresholdMB) {
            errorHandler_1.ErrorHandler.logWarning(`High memory usage in batch ${state.batchId}: ${Math.round(memoryMB)}MB`);
            this.emit('memoryWarning', {
                batchId: state.batchId,
                memoryUsage: memoryMB,
                threshold: this.config.memoryWarningThresholdMB
            });
        }
    }
    getCurrentMemoryUsage() {
        return process.memoryUsage().heapUsed;
    }
    notifySubscribers(batchId) {
        const state = this.progressStates.get(batchId);
        if (!state)
            return;
        const progressCopy = { ...state.progress };
        for (const callback of state.subscribers) {
            try {
                callback(progressCopy);
            }
            catch (error) {
                errorHandler_1.ErrorHandler.logError(`Progress callback failed: ${error}`);
            }
        }
        // Emit global progress event
        this.emit('progress', progressCopy);
    }
    /**
     * Shutdown and cleanup all resources
     */
    shutdown() {
        errorHandler_1.ErrorHandler.logInfo('Shutting down progress tracking service');
        // Cancel all active batches
        for (const batchId of this.progressStates.keys()) {
            this.cancel(batchId);
        }
        // Clear timers
        this.stopProgressUpdates();
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        // Clear all states
        this.progressStates.clear();
        // Remove all listeners
        this.removeAllListeners();
    }
}
exports.ProgressTrackingServiceImpl = ProgressTrackingServiceImpl;
/**
 * Implementation of progress reporter
 */
class ProgressReporterImpl {
    batchId;
    service;
    constructor(batchId, service) {
        this.batchId = batchId;
        this.service = service;
    }
    updateProgress(progress) {
        this.service.updateProgress(this.batchId, progress);
    }
    setPhase(phase, message) {
        this.service.updateProgress(this.batchId, {
            currentOperation: {
                phase,
                message,
                subProgress: 0
            }
        });
        errorHandler_1.ErrorHandler.logInfo(`Batch ${this.batchId} phase: ${phase} - ${message}`);
    }
    setCurrentJob(job, subProgress) {
        this.service.updateProgress(this.batchId, {
            currentJob: job,
            currentOperation: {
                phase: 'exporting',
                message: `Exporting ${path.basename(job.sourceFile.relativePath)} (${job.format.toUpperCase()})`,
                subProgress: subProgress || 0
            }
        });
    }
    completeJob(job, result) {
        const state = this.service.progressStates.get(this.batchId);
        if (!state)
            return;
        const progress = state.progress;
        // Update job counts
        if (result.success) {
            progress.jobCounts.completed++;
        }
        else {
            progress.jobCounts.failed++;
            // Report error to service
            if (result.error) {
                this.service.emit('jobError', {
                    batchId: this.batchId,
                    job,
                    error: result.error
                });
            }
        }
        progress.jobCounts.running = Math.max(0, progress.jobCounts.running - 1);
        progress.completedJobs = progress.jobCounts.completed + progress.jobCounts.failed;
        // Update overall progress
        if (progress.totalJobs > 0) {
            progress.overallProgress = progress.completedJobs / progress.totalJobs;
        }
        this.service.updateProgress(this.batchId, progress);
        const status = result.success ? 'SUCCESS' : 'FAILED';
        errorHandler_1.ErrorHandler.logInfo(`Job completed: ${job.id} - ${status} (${result.duration}ms)`);
    }
    reportError(error) {
        errorHandler_1.ErrorHandler.logError(`Batch ${this.batchId} error: ${error.message || error}`);
        this.service.emit('batchError', {
            batchId: this.batchId,
            error
        });
    }
    isCancelled() {
        const state = this.service.progressStates.get(this.batchId);
        return state ? state.cancelled : false;
    }
    /**
     * Add cleanup callback to be executed when batch is cancelled or completed
     */
    addCleanupCallback(callback) {
        const state = this.service.progressStates.get(this.batchId);
        if (state) {
            state.cleanupCallbacks.push(callback);
        }
    }
    /**
     * Initialize batch with total job count
     */
    initializeBatch(totalJobs) {
        this.service.updateProgress(this.batchId, {
            totalJobs,
            jobCounts: {
                pending: totalJobs,
                running: 0,
                completed: 0,
                failed: 0,
                skipped: 0
            }
        });
    }
    /**
     * Update job counts when jobs start
     */
    startJob(job) {
        const state = this.service.progressStates.get(this.batchId);
        if (!state)
            return;
        const progress = state.progress;
        progress.jobCounts.pending = Math.max(0, progress.jobCounts.pending - 1);
        progress.jobCounts.running++;
        this.service.updateProgress(this.batchId, progress);
    }
    /**
     * Mark jobs as skipped
     */
    skipJob(job, reason) {
        const state = this.service.progressStates.get(this.batchId);
        if (!state)
            return;
        const progress = state.progress;
        progress.jobCounts.pending = Math.max(0, progress.jobCounts.pending - 1);
        progress.jobCounts.skipped++;
        progress.completedJobs++;
        if (progress.totalJobs > 0) {
            progress.overallProgress = progress.completedJobs / progress.totalJobs;
        }
        this.service.updateProgress(this.batchId, progress);
        errorHandler_1.ErrorHandler.logInfo(`Job skipped: ${job.id} - ${reason}`);
    }
}
/**
 * Singleton instance for easy access
 */
exports.progressTrackingService = new ProgressTrackingServiceImpl();
/**
 * Factory function for creating progress tracking service with custom config
 */
function createProgressTrackingService(config) {
    return new ProgressTrackingServiceImpl(config);
}
//# sourceMappingURL=progressTrackingService.js.map