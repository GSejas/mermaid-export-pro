/**
 * Operation Timeout Manager - Progressive timeout detection and recovery
 * 
 * Architecture: Multi-layered timeout system with escalating warnings
 * - Soft Warning: 10s (still processing, but user awareness)
 * - Medium Alert: 30s (likely stuck, offer cancellation)
 * - Hard Timeout: 60s (force cleanup and recovery)
 * - Nuclear Option: 120s (kill all processes, reset state)
 */

import * as vscode from 'vscode';

/**
 * Configuration for progressive timeout thresholds of an operation
 */
export interface OperationConfig {
  /** Unique identifier for the operation */
  id: string;
  /** Human-readable name for the operation */
  name: string;
  /** First warning threshold (milliseconds) - gentle notification */
  softTimeoutMs: number;
  /** Medium alert threshold (milliseconds) - offer user cancellation */
  mediumTimeoutMs: number;
  /** Hard timeout threshold (milliseconds) - force cleanup */
  hardTimeoutMs: number;
  /** Nuclear timeout threshold (milliseconds) - emergency reset */
  nuclearTimeoutMs: number;
}

/**
 * Callback functions for different timeout escalation levels
 */
export interface TimeoutCallbacks {
  /** Called on soft timeout - gentle warning */
  onSoftTimeout?: () => void;
  /** Called on medium timeout - return true to continue, false to cancel */
  onMediumTimeout?: () => Promise<boolean>;
  /** Called on hard timeout - forced cleanup */
  onHardTimeout?: () => Promise<void>;
  /** Called on nuclear timeout - emergency measures */
  onNuclearTimeout?: () => Promise<void>;
  /** Called when operation is cancelled or completed - general cleanup */
  onCleanup?: () => Promise<void>;
}

/**
 * Internal state of an active operation being monitored
 */
interface ActiveOperation {
  /** Operation identifier */
  id: string;
  /** Timeout configuration */
  config: OperationConfig;
  /** User-defined callbacks */
  callbacks: TimeoutCallbacks;
  /** When the operation started (timestamp) */
  startTime: number;
  /** VS Code progress reporter */
  progress: vscode.Progress<{ message?: string; increment?: number }>;
  
  // Timeout handles for cleanup
  /** Handle for soft timeout timer */
  softTimeoutHandle?: NodeJS.Timeout;
  /** Handle for medium timeout timer */
  mediumTimeoutHandle?: NodeJS.Timeout;
  /** Handle for hard timeout timer */
  hardTimeoutHandle?: NodeJS.Timeout;
  /** Handle for nuclear timeout timer */
  nuclearTimeoutHandle?: NodeJS.Timeout;
  
  // Operation state flags
  /** Has soft timeout warning been shown */
  isWarned: boolean;
  /** Has operation been cancelled */
  isCancelled: boolean;
  /** Has operation completed successfully */
  isCompleted: boolean;
}

export class OperationTimeoutManager {
  private static instance: OperationTimeoutManager;
  private activeOperations = new Map<string, ActiveOperation>();
  private lastExportTime = 0;
  private readonly EXPORT_COOLDOWN_MS = 1000; // 1 second between exports
  
  // Default configurations for different operation types
  private static readonly DEFAULT_CONFIGS = {
    export: {
      softTimeoutMs: 10_000,    // 10s - "Still working..."
      mediumTimeoutMs: 30_000,  // 30s - "Taking longer than expected"
      hardTimeoutMs: 60_000,    // 60s - Force cleanup
      nuclearTimeoutMs: 120_000 // 2m - Emergency reset
    },
    batchExport: {
      softTimeoutMs: 30_000,    // 30s - Batch operations take longer
      mediumTimeoutMs: 90_000,  // 1.5m
      hardTimeoutMs: 180_000,   // 3m
      nuclearTimeoutMs: 300_000 // 5m
    },
    debug: {
      softTimeoutMs: 45_000,    // 45s - Debug operations are complex
      mediumTimeoutMs: 120_000, // 2m
      hardTimeoutMs: 300_000,   // 5m
      nuclearTimeoutMs: 600_000 // 10m
    }
  };

  private constructor() {}

  static getInstance(): OperationTimeoutManager {
    if (!OperationTimeoutManager.instance) {
      OperationTimeoutManager.instance = new OperationTimeoutManager();
    }
    return OperationTimeoutManager.instance;
  }

  /**
   * Check if exports are allowed (prevent rapid-fire exports)
   */
  canStartExport(): boolean {
    const now = Date.now();
    return (now - this.lastExportTime) >= this.EXPORT_COOLDOWN_MS;
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  getExportCooldownRemaining(): number {
    const now = Date.now();
    const elapsed = now - this.lastExportTime;
    return Math.max(0, this.EXPORT_COOLDOWN_MS - elapsed);
  }

  /**
   * Start monitoring an operation with progressive timeouts
   */
  startOperation(
    id: string,
    name: string,
    type: keyof typeof OperationTimeoutManager.DEFAULT_CONFIGS,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    callbacks: TimeoutCallbacks
  ): void {
    // Record export start time for throttling
    if (type === 'export' || type === 'batchExport') {
      this.lastExportTime = Date.now();
    }

    // Clean up any existing operation with same ID
    this.completeOperation(id);

    const defaultConfig = OperationTimeoutManager.DEFAULT_CONFIGS[type];
    const config: OperationConfig = {
      id,
      name,
      ...defaultConfig
    };

    const operation: ActiveOperation = {
      id,
      config,
      callbacks,
      startTime: Date.now(),
      progress,
      isWarned: false,
      isCancelled: false,
      isCompleted: false
    };

    // Set up progressive timeout chain
    this.setupTimeouts(operation);
    
    this.activeOperations.set(id, operation);
  }

  /**
   * Update operation progress (resets soft timeout)
   */
  updateProgress(id: string, message?: string, increment?: number): void {
    const operation = this.activeOperations.get(id);
    if (!operation || operation.isCompleted || operation.isCancelled) {
      return;
    }

    // Update progress display
    operation.progress.report({ message, increment });

    // Reset soft timeout when we get progress updates
    if (operation.softTimeoutHandle) {
      clearTimeout(operation.softTimeoutHandle);
      operation.softTimeoutHandle = this.createSoftTimeout(operation);
    }
    
    // Reset warning state on progress
    operation.isWarned = false;
  }

  /**
   * Mark operation as completed successfully
   */
  completeOperation(id: string): void {
    const operation = this.activeOperations.get(id);
    if (!operation) {return;}

    operation.isCompleted = true;
    this.clearAllTimeouts(operation);
    this.activeOperations.delete(id);
  }

  /**
   * Cancel operation (user-initiated or timeout-triggered)
   */
  async cancelOperation(id: string, reason: 'user' | 'timeout' = 'user'): Promise<void> {
    const operation = this.activeOperations.get(id);
    if (!operation) {return;}

    operation.isCancelled = true;
    this.clearAllTimeouts(operation);

    // Perform cleanup
    if (operation.callbacks.onCleanup) {
      try {
        await operation.callbacks.onCleanup();
      } catch (error) {
        console.error(`Cleanup failed for operation ${id}:`, error);
      }
    }

    this.activeOperations.delete(id);

    // Show cancellation message
    const reasonText = reason === 'user' ? 'cancelled by user' : 'timed out';
    vscode.window.showWarningMessage(`Operation "${operation.config.name}" was ${reasonText}`);
  }

  /**
   * Get status of all active operations (for debugging)
   */
  getActiveOperations(): { id: string; name: string; duration: number; isWarned: boolean }[] {
    const now = Date.now();
    return Array.from(this.activeOperations.values())
      .filter(op => !op.isCompleted && !op.isCancelled)
      .map(op => ({
        id: op.id,
        name: op.config.name,
        duration: now - op.startTime,
        isWarned: op.isWarned
      }));
  }

  /**
   * Emergency cleanup - cancel all operations
   */
  async emergencyCleanup(): Promise<void> {
    const operations = Array.from(this.activeOperations.keys());
    
    for (const operationId of operations) {
      await this.cancelOperation(operationId, 'timeout');
    }
    
    // Clear the map to be absolutely sure
    this.activeOperations.clear();
    
    vscode.window.showWarningMessage('All hanging operations have been cancelled');
  }

  private setupTimeouts(operation: ActiveOperation): void {
    // Soft timeout - gentle warning
    operation.softTimeoutHandle = this.createSoftTimeout(operation);
    
    // Medium timeout - offer cancellation
    operation.mediumTimeoutHandle = setTimeout(async () => {
      await this.handleMediumTimeout(operation);
    }, operation.config.mediumTimeoutMs);
    
    // Hard timeout - force cleanup
    operation.hardTimeoutHandle = setTimeout(async () => {
      await this.handleHardTimeout(operation);
    }, operation.config.hardTimeoutMs);
    
    // Nuclear timeout - emergency measures
    operation.nuclearTimeoutHandle = setTimeout(async () => {
      await this.handleNuclearTimeout(operation);
    }, operation.config.nuclearTimeoutMs);
  }

  private createSoftTimeout(operation: ActiveOperation): NodeJS.Timeout {
    return setTimeout(() => {
      this.handleSoftTimeout(operation);
    }, operation.config.softTimeoutMs);
  }

  private handleSoftTimeout(operation: ActiveOperation): void {
    if (operation.isCompleted || operation.isCancelled) {return;}
    
    operation.isWarned = true;
    
    // Silent progress update with gentle warning
    operation.progress.report({ 
      message: `${operation.config.name} is taking longer than usual...` 
    });
    
    // Call custom callback
    if (operation.callbacks.onSoftTimeout) {
      operation.callbacks.onSoftTimeout();
    }
  }

  private async handleMediumTimeout(operation: ActiveOperation): Promise<void> {
    if (operation.isCompleted || operation.isCancelled) {return;}
    
    operation.progress.report({ 
      message: `${operation.config.name} seems stuck - checking for issues...` 
    });
    
    // Offer user choice
    let shouldContinue = false;
    
    if (operation.callbacks.onMediumTimeout) {
      shouldContinue = await operation.callbacks.onMediumTimeout();
    } else {
      // Default behavior: ask user
      const choice = await vscode.window.showWarningMessage(
        `Export operation "${operation.config.name}" is taking unusually long (${Math.round((Date.now() - operation.startTime) / 1000)}s). This might indicate a problem.`,
        { modal: false },
        'Keep Waiting',
        'Cancel Operation',
        'Force Restart'
      );
      
      if (choice === 'Keep Waiting') {
        shouldContinue = true;
      } else if (choice === 'Cancel Operation') {
        shouldContinue = false;
      } else if (choice === 'Force Restart') {
        // Try to restart the operation
        await this.restartOperation(operation);
        return;
      }
    }
    
    if (!shouldContinue) {
      await this.cancelOperation(operation.id, 'timeout');
    }
  }

  private async handleHardTimeout(operation: ActiveOperation): Promise<void> {
    if (operation.isCompleted || operation.isCancelled) {return;}
    
    operation.progress.report({ 
      message: `Force cleaning up stuck operation...` 
    });
    
    // Custom hard timeout handler
    if (operation.callbacks.onHardTimeout) {
      try {
        await operation.callbacks.onHardTimeout();
      } catch (error) {
        console.error(`Hard timeout handler failed for ${operation.id}:`, error);
      }
    }
    
    // Force cancel
    await this.cancelOperation(operation.id, 'timeout');
    
    vscode.window.showErrorMessage(
      `Operation "${operation.config.name}" was forcefully cancelled due to timeout. This may indicate a system issue.`,
      'Show Diagnostics'
    ).then(choice => {
      if (choice === 'Show Diagnostics') {
        this.showDiagnostics();
      }
    });
  }

  private async handleNuclearTimeout(operation: ActiveOperation): Promise<void> {
    if (operation.isCompleted || operation.isCancelled) {return;}
    
    // Nuclear option - something is seriously wrong
    if (operation.callbacks.onNuclearTimeout) {
      try {
        await operation.callbacks.onNuclearTimeout();
      } catch (error) {
        console.error(`Nuclear timeout handler failed for ${operation.id}:`, error);
      }
    }
    
    // Emergency cleanup of this operation and potentially all others
    await this.emergencyCleanup();
    
    vscode.window.showErrorMessage(
      `Critical: Operation "${operation.config.name}" required emergency cleanup. All operations have been reset.`,
      'Report Issue',
      'Restart Extension'
    ).then(choice => {
      if (choice === 'Report Issue') {
        vscode.commands.executeCommand('workbench.action.openIssueReporter');
      } else if (choice === 'Restart Extension') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    });
  }

  private async restartOperation(operation: ActiveOperation): Promise<void> {
    // This would need to be implemented based on the specific operation type
    // For now, just cancel and let the user retry
    await this.cancelOperation(operation.id, 'timeout');
    
    vscode.window.showInformationMessage(
      `Operation "${operation.config.name}" was cancelled. Please try again.`,
      'Retry Now'
    ).then(choice => {
      if (choice === 'Retry Now') {
        // Trigger the last executed command
        vscode.commands.executeCommand('workbench.action.acceptSelectedSuggestion');
      }
    });
  }

  private clearAllTimeouts(operation: ActiveOperation): void {
    if (operation.softTimeoutHandle) {
      clearTimeout(operation.softTimeoutHandle);
    }
    if (operation.mediumTimeoutHandle) {
      clearTimeout(operation.mediumTimeoutHandle);
    }
    if (operation.hardTimeoutHandle) {
      clearTimeout(operation.hardTimeoutHandle);
    }
    if (operation.nuclearTimeoutHandle) {
      clearTimeout(operation.nuclearTimeoutHandle);
    }
  }

  private showDiagnostics(): void {
    const activeOps = this.getActiveOperations();
    const diagnostics = {
      activeOperations: activeOps.length,
      operations: activeOps,
      systemInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage()
      }
    };
    
    const channel = vscode.window.createOutputChannel('Mermaid Export Pro - Diagnostics');
    channel.clear();
    channel.appendLine('=== OPERATION TIMEOUT DIAGNOSTICS ===');
    channel.appendLine(JSON.stringify(diagnostics, null, 2));
    channel.show();
  }
}