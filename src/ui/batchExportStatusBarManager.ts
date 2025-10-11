/**
 * Export Folder Status Bar Manager
 * 
 * Provides dedicated status bar items for export folder operations with:
 * - Separate animated CLI-style progress bar (=---- → ==--- → ===-- → ====)
 * - Real-time file counters (n/N completed)
 * - Color-coded phases (discovery, planning, exporting, complete)
 * - Click-to-cancel functionality
 * - Automatic lifecycle management (show/hide)
 * 
 * The status bar item appears only during export folder operations and provides
 * rich visual feedback without interrupting the user's workflow.
 * 
 * @author Claude/Jorge
 * @version 2.0.0
 * @date 2025-08-27
 */

import * as vscode from 'vscode';
import { ErrorHandler } from './errorHandler';

/**
 * Represents the current phase of export folder operation
 */
export type BatchExportPhase = 'discovery' | 'planning' | 'exporting' | 'completing' | 'success' | 'error' | 'cancelled';

/**
 * Progress information for status bar updates
 */
export interface BatchExportProgress {
  phase: BatchExportPhase;
  message: string;
  filesCompleted?: number;
  totalFiles?: number;
  jobsCompleted?: number;
  totalJobs?: number;
}

/**
 * Animation configuration for status bar item
 */
interface AnimationConfig {
  icons: string[];
  colors: { [key in BatchExportPhase]: string };
  frameInterval: number;
}

/**
 * Manages a VS Code status bar item that displays the progress and status of a batch
 * Mermaid export operation, including a simple worm-like icon animation, contextual
 * background colors, tooltips, and an interactive cancel command.
 *
 * Responsibilities
 * - Create and own a vscode.StatusBarItem with a high display priority.
 * - Provide lifecycle methods to start, update, complete, cancel, hide, and dispose the UI.
 * - Drive a frame-based animation timer for a visual activity indicator.
 * - Map logical export phases (discovery, planning, exporting, completing, success, error, cancelled)
 *   to icons, theme-aware background colors and descriptive tooltips.
 * - Invoke an optional cancellation callback when the status item is clicked.
 *
 * Behavior details
 * - startBatchExport(cancelCallback): shows the status bar item, begins animation, and stores
 *   the provided cancel callback which will be invoked if the user cancels via the status bar.
 * - updateProgress(progress): updates the text, background color and tooltip based on the supplied
 *   BatchExportProgress; supports file or job counting when provided by the progress object.
 * - completeBatchExport(success, finalMessage, duration?): stops animation and shows a final
 *   success or error message (with an optional duration shown), then auto-hides the item after
 *   a short delay.
 * - cancelBatchExport(): stops animation, shows a cancelled message, invokes the stored cancel
 *   callback (if any) and auto-hides after a short delay.
 * - hideBatchExport(): immediately hides the item and clears state/timer without invoking the
 *   cancel callback.
 * - dispose(): hides and disposes the status bar item and clears any timers/resources.
 *
 * Animation and visuals
 * - Uses a configurable set of icons to create a worm-like motion; animation speed varies by phase.
 * - Uses vscode.ThemeColor instances to select background colors appropriate to each phase.
 * - Keeps text color unset (undefined) to inherit theme-appropriate contrast when needed.
 *
 * Threading / timers
 * - Internally manages a NodeJS.Timeout interval for animation frames. Timers are cleared when
 *   animation is stopped, when the item is hidden, and when the manager is disposed.
 *
 * Logging and diagnostics
 * - Emits informational log entries at major lifecycle events (initialization, start, complete,
 *   cancel, hide, dispose) via an ErrorHandler logging facility.
 *
 * Usage notes
 * - The class expects external definitions for the types BatchExportPhase and BatchExportProgress.
 * - The status bar item's command is set to 'mermaidExportPro.cancelBatchExport' and should be
 *   registered elsewhere in the extension to call this manager's cancelBatchExport method.
 * - Auto-hide delays: complete => ~3s, cancelled => ~2s.
 *
 * @public
 * @see BatchExportPhase
 * @see BatchExportProgress
 */
export class BatchExportStatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private animationBarItem: vscode.StatusBarItem;
  private animationTimer?: NodeJS.Timeout;
  private currentPhase: BatchExportPhase = 'discovery';
  private animationFrame = 0;
  private isActive = false;
  private cancelCallback?: () => void;

  /**
   * Animation configuration with 5-frame CLI-style progress bar
   */
  private readonly animationConfig: AnimationConfig = {
    icons: [
      '$(chevron-right)$(chevron-right)$(chevron-right)$(chevron-right)$(chevron-right)',
      '$(chevron-right)$(play)$(chevron-right)$(play)$(chevron-right)',
      '$(play)$(chevron-right)$(play)$(chevron-right)$(play)',
      '$(chevron-right)$(arrow-right)$(chevron-right)$(arrow-right)$(chevron-right)', 
      '$(arrow-right)$(chevron-right)$(arrow-right)$(chevron-right)$(arrow-right)',
      '$(chevron-right)$(chevron-right)$(chevron-right)$(chevron-right)$(chevron-right)'
    ],
    colors: {
      discovery: 'statusBar.background',
      planning: 'statusBar.background',
      exporting: 'statusBar.background', 
      completing: 'statusBar.background',
      success: 'statusBar.background',
      error: 'statusBar.background',
      cancelled: 'statusBar.background'
    },
    frameInterval: 300 // 300ms for smooth CLI-style progress animation
  };

  constructor() {
    // Create main status bar item for text/progress info
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left, 
      1000 // High priority to appear near the left
    );

    // Create separate animated progress bar item (positioned to the right of main item)
    this.animationBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left, 
      999 // Slightly lower priority so it appears to the right
    );

    // Set up click handler for cancellation on main item
    this.statusBarItem.command = 'mermaidExportPro.cancelBatchExport';
    
    ErrorHandler.logInfo('BatchExportStatusBarManager initialized with separate animation bar');
  }

  /**
   * Start showing the status bar item and begin animation for a export folder operation
   */
  public startBatchExport(cancelCallback: () => void): void {
    this.cancelCallback = cancelCallback;
    this.isActive = true;
    this.currentPhase = 'discovery';
    this.animationFrame = 0;

    this.statusBarItem.show();
    this.animationBarItem.show();
    this.startAnimation();
    this.updateDisplay({
      phase: 'discovery',
      message: 'Starting export folder...'
    });

    ErrorHandler.logInfo('BatchExportStatusBarManager: Started export folder display');
  }

  /**
   * Update the status bar with current progress information
   */
  public updateProgress(progress: BatchExportProgress): void {
    if (!this.isActive) return;

    this.currentPhase = progress.phase;
    this.updateDisplay(progress);
  }

  /**
   * Complete the export folder and show final status briefly before hiding
   */
  public completeBatchExport(success: boolean, finalMessage: string, duration?: number): void {
    if (!this.isActive) return;

    this.currentPhase = success ? 'success' : 'error';
    this.stopAnimation();

    // Hide animation bar and show final status on main bar
    this.animationBarItem.hide();
    
    const icon = success ? '$(check)' : '$(error)';
    const durationText = duration ? ` (${Math.round(duration / 1000)}s)` : '';
    
    this.statusBarItem.text = `${icon} ${finalMessage}${durationText}`;
    this.statusBarItem.color = undefined; // Use default text color for better contrast
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.tooltip = success 
      ? 'Folder export completed successfully' 
      : 'Folder export completed with errors';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.hideBatchExport();
    }, 3000);

    ErrorHandler.logInfo(`BatchExportStatusBarManager: Completed export folder (success: ${success})`);
  }

  /**
   * Cancel the current export folder operation
   */
  public cancelBatchExport(): void {
    if (!this.isActive) return;

    this.currentPhase = 'cancelled';
    this.stopAnimation();

    // Hide animation bar and show cancelled status on main bar
    this.animationBarItem.hide();
    
    this.statusBarItem.text = '$(x) Folder export cancelled';
    this.statusBarItem.color = undefined; // Use default text color for better contrast
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.tooltip = 'Folder export was cancelled by user';

    // Call the cancel callback if provided
    if (this.cancelCallback) {
      this.cancelCallback();
    }

    // Auto-hide after 2 seconds
    setTimeout(() => {
      this.hideBatchExport();
    }, 2000);

    ErrorHandler.logInfo('BatchExportStatusBarManager: Cancelled export folder');
  }

  /**
   * Hide the status bar item and clean up resources
   */
  public hideBatchExport(): void {
    this.isActive = false;
    this.stopAnimation();
    this.statusBarItem.hide();
    this.animationBarItem.hide();
    this.cancelCallback = undefined;

    ErrorHandler.logInfo('BatchExportStatusBarManager: Hidden export folder display');
  }

  /**
   * Dispose of the status bar item and clean up resources
   */
  public dispose(): void {
    this.hideBatchExport();
    this.statusBarItem.dispose();
    this.animationBarItem.dispose();
    ErrorHandler.logInfo('BatchExportStatusBarManager disposed');
  }

  /**
   * Start the animation timer
   */
  private startAnimation(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
    }

    this.animationTimer = setInterval(() => {
      this.animateFrame();
    }, this.animationConfig.frameInterval);
  }

  /**
   * Stop the animation timer
   */
  private stopAnimation(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = undefined;
    }
  }

  /**
   * Advance to the next animation frame
   */
  private animateFrame(): void {
    if (!this.isActive) return;

    this.animationFrame = (this.animationFrame + 1) % this.animationConfig.icons.length;
    
    // Update the display with current progress but new animation frame
    this.refreshDisplay();
  }

  /**
   * Update the status bar display with progress information
   */
  private updateDisplay(progress: BatchExportProgress): void {
    if (!this.isActive) return;

    // Update separate animation bar
    const icon = this.getCurrentAnimationIcon();
    this.animationBarItem.text = icon;
    this.animationBarItem.color = undefined;
    this.animationBarItem.backgroundColor = undefined;
    
    // Build progress text for main status bar (no icon)
    let progressText = progress.message;
    
    // Add file counter if available
    if (progress.filesCompleted !== undefined && progress.totalFiles !== undefined) {
      progressText += ` (${progress.filesCompleted}/${progress.totalFiles} files)`;
    } else if (progress.jobsCompleted !== undefined && progress.totalJobs !== undefined) {
      progressText += ` (${progress.jobsCompleted}/${progress.totalJobs} jobs)`;
    }

    this.statusBarItem.text = progressText; // No icon prefix
    this.statusBarItem.color = undefined; // Use default text color for better contrast
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.tooltip = this.getTooltipForPhase(progress.phase, progress.message);
  }

  /**
   * Refresh the display with current animation frame (used during animation)
   */
  private refreshDisplay(): void {
    if (!this.isActive) return;

    // Only update the animation bar during animation
    const icon = this.getCurrentAnimationIcon();
    this.animationBarItem.text = icon;
  }

  /**
   * Get the current animation icon based on the animation frame - creates worm-like movement
   */
  private getCurrentAnimationIcon(): string {
    const iconCount = this.animationConfig.icons.length; // 5 icons
    
    // Create worm-like animation pattern that moves through the 5 icons smoothly
    switch (this.currentPhase) {
      case 'discovery':
      case 'planning':
        // Slower worm movement for setup phases
        return this.animationConfig.icons[Math.floor(this.animationFrame / 2) % iconCount];
      
      case 'exporting':
        // Faster worm movement to show active work
        return this.animationConfig.icons[this.animationFrame % iconCount];
      
      case 'completing':
        // Slower worm movement as we wind down
        return this.animationConfig.icons[Math.floor(this.animationFrame / 3) % iconCount];
      
      default:
        return this.animationConfig.icons[0];
    }
  }

  /**
   * Get appropriate background color for the current phase
   */
  private getBackgroundColorForPhase(phase: BatchExportPhase): vscode.ThemeColor | undefined {
    // Always use transparent background to avoid visual clutter
    return undefined;
  }

  /**
   * Get appropriate tooltip text for the current phase
   */
  private getTooltipForPhase(phase: BatchExportPhase, message: string): string {
    const baseTooltip = `Mermaid Export Folder - ${message}`;
    
    switch (phase) {
      case 'discovery':
        return `${baseTooltip}\n\nSearching for Mermaid files in the workspace...`;
      
      case 'planning':
        return `${baseTooltip}\n\nCreating export jobs and optimizing execution order...`;
      
      case 'exporting':
        return `${baseTooltip}\n\nExporting diagrams to selected formats...\n\nClick to cancel`;
      
      case 'completing':
        return `${baseTooltip}\n\nFinalizing exports and generating reports...`;
      
      case 'success':
        return `${baseTooltip}\n\nFolder export completed successfully!`;
      
      case 'error':
        return `${baseTooltip}\n\nFolder export completed with errors.`;
      
      case 'cancelled':
        return `${baseTooltip}\n\nFolder export was cancelled by user.`;
      
      default:
        return baseTooltip;
    }
  }
}

/**
 * Singleton instance for global access
 */
export const batchExportStatusBar = new BatchExportStatusBarManager();