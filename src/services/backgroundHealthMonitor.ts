/**
 * Background Health Monitor - Passive monitoring for hung operations
 * 
 * This service runs in the background and periodically checks for stuck operations
 * without being intrusive to the user experience.
 */

import * as vscode from 'vscode';
import { OperationTimeoutManager } from './operationTimeoutManager';
import { ErrorHandler } from '../ui/errorHandler';

export class BackgroundHealthMonitor {
  private static instance: BackgroundHealthMonitor;
  private monitorTimer: NodeJS.Timeout | undefined;
  private context: vscode.ExtensionContext;
  
  // Monitoring configuration
  private readonly CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds
  private readonly LONG_RUNNING_THRESHOLD = 90_000; // 90s = definitely stuck
  private readonly NOTIFICATION_COOLDOWN_MS = 300_000; // 5 minutes between notifications
  
  // State tracking
  private lastNotificationTime = 0;
  private notifiedOperations = new Set<string>();
  
  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }
  
  static getInstance(context: vscode.ExtensionContext): BackgroundHealthMonitor {
    if (!BackgroundHealthMonitor.instance) {
      BackgroundHealthMonitor.instance = new BackgroundHealthMonitor(context);
    }
    return BackgroundHealthMonitor.instance;
  }
  
  /**
   * Start background monitoring
   */
  start(): void {
    if (this.monitorTimer) {
      return; // Already running
    }
    
    ErrorHandler.logInfo('Starting background health monitor');
    
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
  stop(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = undefined;
      ErrorHandler.logInfo('Stopped background health monitor');
    }
  }
  
  /**
   * Perform silent health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const timeoutManager = OperationTimeoutManager.getInstance();
      const activeOperations = timeoutManager.getActiveOperations();
      
      if (activeOperations.length === 0) {
        // Clear notification state when all operations complete
        this.notifiedOperations.clear();
        return;
      }
      
      // Check for stuck operations
      const stuckOperations = activeOperations.filter(
        op => op.duration > this.LONG_RUNNING_THRESHOLD && !this.notifiedOperations.has(op.id)
      );
      
      if (stuckOperations.length > 0) {
        await this.handleStuckOperations(stuckOperations);
      }
      
      // Memory pressure check
      await this.checkMemoryPressure();
      
    } catch (error) {
      ErrorHandler.logError(`Background health check failed: ${error}`);
    }
  }
  
  /**
   * Handle detection of stuck operations
   */
  private async handleStuckOperations(stuckOperations: any[]): Promise<void> {
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
    
    ErrorHandler.logWarning(`Detected ${count} stuck operation(s), longest running: ${longestDurationSec}s`);
    
    // Show discreet notification with actions
    const message = count === 1 
      ? `Export operation appears stuck (${longestDurationSec}s)`
      : `${count} export operations appear stuck (up to ${longestDurationSec}s)`;
    
    const action = await vscode.window.showWarningMessage(
      message,
      { modal: false }, // Non-blocking
      'Show Details',
      'Emergency Cleanup',
      'Ignore for 10min'
    );
    
    if (action === 'Show Details') {
      await vscode.commands.executeCommand('mermaidExportPro.diagnostics');
    } else if (action === 'Emergency Cleanup') {
      const timeoutManager = OperationTimeoutManager.getInstance();
      await timeoutManager.emergencyCleanup();
      vscode.window.showInformationMessage('Emergency cleanup completed');
    } else if (action === 'Ignore for 10min') {
      // Extend cooldown
      this.lastNotificationTime = now + (10 * 60 * 1000) - this.NOTIFICATION_COOLDOWN_MS;
    }
  }
  
  /**
   * Check for memory pressure that might indicate issues
   */
  private async checkMemoryPressure(): Promise<void> {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / (1024 * 1024);
    const rssMB = memUsage.rss / (1024 * 1024);
    
    // Thresholds for VS Code extension (conservative)
    const HIGH_HEAP_MB = 150;
    const HIGH_RSS_MB = 250;
    
    if (heapUsedMB > HIGH_HEAP_MB || rssMB > HIGH_RSS_MB) {
      ErrorHandler.logWarning(`High memory usage detected: Heap=${Math.round(heapUsedMB)}MB, RSS=${Math.round(rssMB)}MB`);
      
      // Only notify if we haven't recently
      const now = Date.now();
      const memoryNotificationKey = 'memory-pressure';
      
      if (!this.notifiedOperations.has(memoryNotificationKey)) {
        this.notifiedOperations.add(memoryNotificationKey);
        
        // Remove from set after some time to allow re-notification
        setTimeout(() => {
          this.notifiedOperations.delete(memoryNotificationKey);
        }, this.NOTIFICATION_COOLDOWN_MS);
        
        const choice = await vscode.window.showWarningMessage(
          `High memory usage detected (${Math.round(heapUsedMB)}MB). This might slow down VS Code.`,
          { modal: false },
          'Show Diagnostics',
          'Emergency Cleanup',
          'Ignore'
        );
        
        if (choice === 'Show Diagnostics') {
          await vscode.commands.executeCommand('mermaidExportPro.diagnostics');
        } else if (choice === 'Emergency Cleanup') {
          const timeoutManager = OperationTimeoutManager.getInstance();
          await timeoutManager.emergencyCleanup();
          
          // Suggest garbage collection (Node.js)
          if (global.gc) {
            global.gc();
            vscode.window.showInformationMessage('Emergency cleanup and garbage collection completed');
          } else {
            vscode.window.showInformationMessage('Emergency cleanup completed');
          }
        }
      }
    }
  }
  
  /**
   * Get current health status for external queries
   */
  getHealthStatus(): {
    isHealthy: boolean;
    activeOperations: number;
    memoryUsageMB: number;
    issues: string[];
  } {
    const timeoutManager = OperationTimeoutManager.getInstance();
    const activeOperations = timeoutManager.getActiveOperations();
    const memUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memUsage.heapUsed / (1024 * 1024));
    
    const issues: string[] = [];
    
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
  async forceHealthCheck(): Promise<void> {
    await this.performHealthCheck();
  }
}