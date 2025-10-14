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

import { EventEmitter } from 'events';
import {
  ProgressTrackingService,
  ProgressReporter,
  BatchProgress,
  BatchPhase,
  ExportJob,
  JobResult
} from '../types/batchExport';
import * as path from 'path';
import { ErrorHandler } from '../ui/errorHandler';

/**
 * Internal progress state for tracking
 */
interface ProgressState {
  batchId: string;
  progress: BatchProgress;
  reporter: ProgressReporterImpl;
  subscribers: ((progress: BatchProgress) => void)[];
  cancelled: boolean;
  lastUpdated: Date;
  performanceHistory: PerformanceSnapshot[];
  cleanupCallbacks: (() => void)[];
}

/**
 * Performance snapshot for analytics
 */
interface PerformanceSnapshot {
  timestamp: Date;
  completedJobs: number;
  jobsPerSecond: number;
  memoryUsage: number;
  activeJobs: number;
}

/**
 * Configuration for progress tracking
 */
interface ProgressConfig {
  updateIntervalMs: number;
  performanceHistorySize: number;
  autoCleanupAfterMs: number;
  memoryWarningThresholdMB: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ProgressConfig = {
  updateIntervalMs: 100,        // Update UI every 100ms
  performanceHistorySize: 100,  // Keep last 100 snapshots
  autoCleanupAfterMs: 300000,   // Cleanup after 5 minutes
  memoryWarningThresholdMB: 256 // Warn if memory usage > 256MB
};


export class ProgressTrackingServiceImpl extends EventEmitter implements ProgressTrackingService {
  private progressStates = new Map<string, ProgressState>();
  private config: ProgressConfig;
  private updateTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<ProgressConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startPeriodicCleanup();
  }

  /**
   * Create new progress reporter for a batch operation
   */
  createReporter(batchId: string): ProgressReporter {
    ErrorHandler.logInfo(`Creating progress reporter for batch: ${batchId}`);

    const initialProgress: BatchProgress = {
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
    
    const state: ProgressState = {
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
  getProgress(batchId: string): BatchProgress | null {
    const state = this.progressStates.get(batchId);
    return state ? { ...state.progress } : null;
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(batchId: string, callback: (progress: BatchProgress) => void): void {
    const state = this.progressStates.get(batchId);
    if (state) {
      state.subscribers.push(callback);
      // Immediately call with current progress
      callback({ ...state.progress });
    } else {
      ErrorHandler.logWarning(`No progress state found for batch: ${batchId}`);
    }
  }

  /**
   * Cancel operation and cleanup
   */
  cancel(batchId: string): void {
    const state = this.progressStates.get(batchId);
    if (state) {
      ErrorHandler.logInfo(`Cancelling batch operation: ${batchId}`);
      
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
        } catch (error) {
          ErrorHandler.logError(`Cleanup callback failed: ${error}`);
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
  cleanup(batchId: string): void {
    const state = this.progressStates.get(batchId);
    if (state) {
      ErrorHandler.logInfo(`Cleaning up progress tracking for batch: ${batchId}`);
      
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
  getPerformanceAnalytics(batchId: string): PerformanceSnapshot[] {
    const state = this.progressStates.get(batchId);
    return state ? [...state.performanceHistory] : [];
  }

  /**
   * Get summary of all active batches
   */
  getActiveBatches(): string[] {
    return Array.from(this.progressStates.keys());
  }

  /**
   * Internal method to update progress state
   */
  updateProgress(batchId: string, updates: Partial<BatchProgress>): void {
    const state = this.progressStates.get(batchId);
    if (!state) {return;}

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

  private startProgressUpdates(): void {
    if (this.updateTimer) {return;}

    this.updateTimer = setInterval(() => {
      for (const [batchId, state] of this.progressStates) {
        if (!state.cancelled) {
          this.updatePerformanceMetrics(state);
          this.notifySubscribers(batchId);
        }
      }
    }, this.config.updateIntervalMs);
  }

  private stopProgressUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const cutoffTime = Date.now() - this.config.autoCleanupAfterMs;
      
      for (const [batchId, state] of this.progressStates) {
        if (state.lastUpdated.getTime() < cutoffTime) {
          ErrorHandler.logInfo(`Auto-cleaning up stale batch: ${batchId}`);
          this.cleanup(batchId);
        }
      }
    }, this.config.autoCleanupAfterMs / 2); // Check twice as often as cleanup interval
  }

  private updateTimingCalculations(state: ProgressState): void {
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

  private updatePerformanceMetrics(state: ProgressState): void {
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
    const snapshot: PerformanceSnapshot = {
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

  private checkMemoryUsage(state: ProgressState): void {
    const memoryMB = state.progress.performance.memoryUsage / (1024 * 1024);
    
    if (memoryMB > this.config.memoryWarningThresholdMB) {
      ErrorHandler.logWarning(`High memory usage in batch ${state.batchId}: ${Math.round(memoryMB)}MB`);
      
      this.emit('memoryWarning', {
        batchId: state.batchId,
        memoryUsage: memoryMB,
        threshold: this.config.memoryWarningThresholdMB
      });
    }
  }

  private getCurrentMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }

  private notifySubscribers(batchId: string): void {
    const state = this.progressStates.get(batchId);
    if (!state) {return;}

    const progressCopy = { ...state.progress };
    
    for (const callback of state.subscribers) {
      try {
        callback(progressCopy);
      } catch (error) {
        ErrorHandler.logError(`Progress callback failed: ${error}`);
      }
    }

    // Emit global progress event
    this.emit('progress', progressCopy);
  }

  /**
   * Shutdown and cleanup all resources
   */
  shutdown(): void {
    ErrorHandler.logInfo('Shutting down progress tracking service');
    
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

/**
 * Implementation of progress reporter
 */
class ProgressReporterImpl implements ProgressReporter {
  constructor(
    private batchId: string,
    private service: ProgressTrackingServiceImpl
  ) {}

  updateProgress(progress: BatchProgress): void {
    this.service.updateProgress(this.batchId, progress);
  }

  setPhase(phase: BatchPhase, message: string): void {
    this.service.updateProgress(this.batchId, {
      currentOperation: {
        phase,
        message,
        subProgress: 0
      }
    });
    
    ErrorHandler.logInfo(`Batch ${this.batchId} phase: ${phase} - ${message}`);
  }

  setCurrentJob(job: ExportJob, subProgress?: number): void {
    this.service.updateProgress(this.batchId, {
      currentJob: job,
      currentOperation: {
        phase: 'exporting',
        message: `Exporting ${path.basename(job.sourceFile.relativePath)} (${job.format.toUpperCase()})`,
        subProgress: subProgress || 0
      }
    });
  }

  completeJob(job: ExportJob, result: JobResult): void {
    const state = (this.service as any).progressStates.get(this.batchId);
    if (!state) {return;}

    const progress = state.progress;
    
    // Update job counts
    if (result.success) {
      progress.jobCounts.completed++;
    } else {
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
    ErrorHandler.logInfo(`Job completed: ${job.id} - ${status} (${result.duration}ms)`);
  }

  reportError(error: any): void {
    ErrorHandler.logError(`Batch ${this.batchId} error: ${error.message || error}`);
    
    this.service.emit('batchError', {
      batchId: this.batchId,
      error
    });
  }

  isCancelled(): boolean {
    const state = (this.service as any).progressStates.get(this.batchId);
    return state ? state.cancelled : false;
  }

  /**
   * Add cleanup callback to be executed when batch is cancelled or completed
   */
  addCleanupCallback(callback: () => void): void {
    const state = (this.service as any).progressStates.get(this.batchId);
    if (state) {
      state.cleanupCallbacks.push(callback);
    }
  }

  /**
   * Initialize batch with total job count
   */
  initializeBatch(totalJobs: number): void {
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
  startJob(job: ExportJob): void {
    const state = (this.service as any).progressStates.get(this.batchId);
    if (!state) {return;}

    const progress = state.progress;
    progress.jobCounts.pending = Math.max(0, progress.jobCounts.pending - 1);
    progress.jobCounts.running++;
    
    this.service.updateProgress(this.batchId, progress);
  }

  /**
   * Mark jobs as skipped
   */
  skipJob(job: ExportJob, reason: string): void {
    const state = (this.service as any).progressStates.get(this.batchId);
    if (!state) {return;}

    const progress = state.progress;
    progress.jobCounts.pending = Math.max(0, progress.jobCounts.pending - 1);
    progress.jobCounts.skipped++;
    progress.completedJobs++;
    
    if (progress.totalJobs > 0) {
      progress.overallProgress = progress.completedJobs / progress.totalJobs;
    }
    
    this.service.updateProgress(this.batchId, progress);
    
    ErrorHandler.logInfo(`Job skipped: ${job.id} - ${reason}`);
  }
}

/**
 * Singleton instance for easy access
 */
export const progressTrackingService = new ProgressTrackingServiceImpl();

/**
 * Factory function for creating progress tracking service with custom config
 */
export function createProgressTrackingService(config?: Partial<ProgressConfig>): ProgressTrackingService {
  return new ProgressTrackingServiceImpl(config);
}