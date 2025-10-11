import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OperationTimeoutManager } from '../../../services/operationTimeoutManager';

// Mock vscode
vi.mock('vscode', () => ({
  window: {
    showErrorMessage: vi.fn(() => Promise.resolve(undefined)),
    showWarningMessage: vi.fn(() => Promise.resolve(undefined)),
    showInformationMessage: vi.fn(() => Promise.resolve(undefined))
  }
}));

describe('OperationTimeoutManager', () => {
  let manager: OperationTimeoutManager;
  let mockProgress: any;
  let mockCallbacks: any;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = OperationTimeoutManager.getInstance();
    
    mockProgress = {
      report: vi.fn()
    };

    mockCallbacks = {
      onSoftTimeout: vi.fn(),
      onMediumTimeout: vi.fn(() => Promise.resolve(true)),
      onHardTimeout: vi.fn(() => Promise.resolve()),
      onNuclearTimeout: vi.fn(() => Promise.resolve()),
      onCleanup: vi.fn(() => Promise.resolve())
    };

    // Clear any existing operations
    (manager as any).activeOperations.clear();
    (manager as any).lastExportTime = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = OperationTimeoutManager.getInstance();
      const instance2 = OperationTimeoutManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Export Throttling', () => {
    it('should allow export when cooldown period has passed', () => {
      expect(manager.canStartExport()).toBe(true);
    });

    it('should prevent exports during cooldown period', () => {
      manager.startOperation('test-op', 'Test', 'export', mockProgress, {});
      
      expect(manager.canStartExport()).toBe(false);
    });

    it('should allow exports after cooldown expires', () => {
      manager.startOperation('test-op', 'Test', 'export', mockProgress, {});
      
      // Fast-forward past cooldown (1000ms)
      vi.advanceTimersByTime(1001);
      
      expect(manager.canStartExport()).toBe(true);
    });

    it('should return correct cooldown remaining time', () => {
      manager.startOperation('test-op', 'Test', 'export', mockProgress, {});
      
      // Advance 500ms
      vi.advanceTimersByTime(500);
      
      const remaining = manager.getExportCooldownRemaining();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(500);
    });

    it('should return 0 when no cooldown is active', () => {
      expect(manager.getExportCooldownRemaining()).toBe(0);
    });
  });

  describe('Operation Lifecycle', () => {
    it('should start operation successfully', () => {
      expect(() => {
        manager.startOperation('op-1', 'Operation 1', 'export', mockProgress, mockCallbacks);
      }).not.toThrow();
    });

    it('should complete operation successfully', () => {
      manager.startOperation('op-1', 'Operation 1', 'export', mockProgress, mockCallbacks);
      
      manager.completeOperation('op-1');
      
      // completeOperation is synchronous, so check state immediately
      expect((manager as any).activeOperations.has('op-1')).toBe(false);
    });

    it('should cancel operation successfully', async () => {
      manager.startOperation('op-1', 'Operation 1', 'export', mockProgress, mockCallbacks);
      
      await manager.cancelOperation('op-1', 'user');
      
      expect(mockCallbacks.onCleanup).toHaveBeenCalled();
    });

    it('should handle completing non-existent operation gracefully', () => {
      expect(() => manager.completeOperation('non-existent')).not.toThrow();
    });

    it('should handle cancelling non-existent operation gracefully', async () => {
      await expect(manager.cancelOperation('non-existent', 'user')).resolves.not.toThrow();
    });

    it('should replace existing operation with same ID', () => {
      manager.startOperation('op-1', 'Operation 1', 'export', mockProgress, mockCallbacks);
      
      // Start another operation with same ID
      expect(() => {
        manager.startOperation('op-1', 'Operation 1 v2', 'export', mockProgress, {});
      }).not.toThrow();
    });
  });

  describe('Timeout Escalation', () => {
    it('should trigger soft timeout callback', async () => {
      manager.startOperation('op-1', 'Test Operation', 'export', mockProgress, mockCallbacks);
      
      // Fast-forward to soft timeout (10s for export)
      await vi.advanceTimersByTimeAsync(10_000);
      
      expect(mockCallbacks.onSoftTimeout).toHaveBeenCalled();
    });

    it('should trigger medium timeout callback', async () => {
      manager.startOperation('op-1', 'Test Operation', 'export', mockProgress, mockCallbacks);
      
      // Fast-forward to medium timeout (30s for export)
      await vi.advanceTimersByTimeAsync(30_000);
      
      expect(mockCallbacks.onMediumTimeout).toHaveBeenCalled();
    });

    it('should trigger hard timeout callback', async () => {
      manager.startOperation('op-1', 'Test Operation', 'export', mockProgress, mockCallbacks);
      
      // Fast-forward to hard timeout (60s for export)
      await vi.advanceTimersByTimeAsync(60_000);
      
      expect(mockCallbacks.onHardTimeout).toHaveBeenCalled();
    });

    it('should not trigger nuclear timeout because hard timeout cancels operation first', async () => {
      // In the actual implementation, hard timeout ALWAYS cancels the operation,
      // so nuclear timeout will never fire. This test verifies that behavior.
      const callbacks = {
        onMediumTimeout: vi.fn(() => Promise.resolve(true)), // Keep waiting past medium timeout
        onHardTimeout: vi.fn(() => Promise.resolve()),
        onNuclearTimeout: vi.fn(() => Promise.resolve())
      };
      
      manager.startOperation('op-1', 'Test Operation', 'export', mockProgress, callbacks);
      
      // Advance to hard timeout (60s for export)
      await vi.advanceTimersByTimeAsync(60_000);
      
      // Medium timeout should fire but operation continues
      expect(callbacks.onMediumTimeout).toHaveBeenCalledTimes(1);
      
      // Hard timeout should fire and cancel the operation
      expect(callbacks.onHardTimeout).toHaveBeenCalledTimes(1);
      
      // Advance to nuclear timeout (120s total)
      await vi.advanceTimersByTimeAsync(60_000);
      
      // Nuclear timeout callback should NOT fire because operation was cancelled at hard timeout
      expect(callbacks.onNuclearTimeout).not.toHaveBeenCalled();
      
      // Operation should no longer be active
      const activeOps = manager.getActiveOperations();
      expect(activeOps).toHaveLength(0);
    });

    it('should use different timeouts for batch operations', async () => {
      manager.startOperation('batch-1', 'Export Folder', 'batchExport', mockProgress, mockCallbacks);
      
      // Batch operations have longer soft timeout (30s)
      await vi.advanceTimersByTimeAsync(29_000);
      expect(mockCallbacks.onSoftTimeout).not.toHaveBeenCalled();
      
      await vi.advanceTimersByTimeAsync(1_000);
      expect(mockCallbacks.onSoftTimeout).toHaveBeenCalled();
    });

    it('should use different timeouts for debug operations', async () => {
      manager.startOperation('debug-1', 'Debug Export', 'debug', mockProgress, mockCallbacks);
      
      // Debug operations have longer soft timeout (45s)
      await vi.advanceTimersByTimeAsync(44_000);
      expect(mockCallbacks.onSoftTimeout).not.toHaveBeenCalled();
      
      await vi.advanceTimersByTimeAsync(1_000);
      expect(mockCallbacks.onSoftTimeout).toHaveBeenCalled();
    });

    it('should stop escalation when operation completes', async () => {
      manager.startOperation('op-1', 'Test Operation', 'export', mockProgress, mockCallbacks);
      
      // Fast-forward 5 seconds
      await vi.advanceTimersByTimeAsync(5_000);
      
      // Complete the operation
      await manager.completeOperation('op-1');
      
      // Fast-forward past all timeouts
      await vi.advanceTimersByTimeAsync(150_000);
      
      // No timeout callbacks should fire
      expect(mockCallbacks.onSoftTimeout).not.toHaveBeenCalled();
      expect(mockCallbacks.onMediumTimeout).not.toHaveBeenCalled();
      expect(mockCallbacks.onHardTimeout).not.toHaveBeenCalled();
    });

    it('should stop escalation when operation is cancelled', async () => {
      manager.startOperation('op-1', 'Test Operation', 'export', mockProgress, mockCallbacks);
      
      // Cancel immediately
      await manager.cancelOperation('op-1', 'user');
      
      // Fast-forward past all timeouts
      await vi.advanceTimersByTimeAsync(150_000);
      
      // No timeout callbacks should fire
      expect(mockCallbacks.onSoftTimeout).not.toHaveBeenCalled();
      expect(mockCallbacks.onMediumTimeout).not.toHaveBeenCalled();
      expect(mockCallbacks.onHardTimeout).not.toHaveBeenCalled();
    });
  });

  describe('Progress Reporting', () => {
    it('should update progress for active operation', () => {
      manager.startOperation('op-1', 'Test Operation', 'export', mockProgress, mockCallbacks);
      
      manager.updateProgress('op-1', 'Processing...', 50);
      
      expect(mockProgress.report).toHaveBeenCalledWith({
        message: 'Processing...',
        increment: 50
      });
    });

    it('should handle progress update for non-existent operation gracefully', () => {
      expect(() => {
        manager.updateProgress('non-existent', 'Test', 50);
      }).not.toThrow();
    });
  });

  describe('Multiple Operations', () => {
    it('should handle multiple concurrent operations', () => {
      manager.startOperation('op-1', 'Operation 1', 'export', mockProgress, {});
      manager.startOperation('op-2', 'Operation 2', 'export', mockProgress, {});
      manager.startOperation('op-3', 'Operation 3', 'batchExport', mockProgress, {});
      
      expect((manager as any).activeOperations.size).toBe(3);
    });

    it('should cancel specific operation without affecting others', async () => {
      const callbacks1 = { onCleanup: vi.fn(() => Promise.resolve()) };
      const callbacks2 = { onCleanup: vi.fn(() => Promise.resolve()) };
      
      manager.startOperation('op-1', 'Operation 1', 'export', mockProgress, callbacks1);
      manager.startOperation('op-2', 'Operation 2', 'export', mockProgress, callbacks2);
      
      await manager.cancelOperation('op-1', 'user');
      
      expect(callbacks1.onCleanup).toHaveBeenCalled();
      expect(callbacks2.onCleanup).not.toHaveBeenCalled();
      expect((manager as any).activeOperations.size).toBe(1);
    });

    it('should complete specific operation without affecting others', () => {
      const callbacks1 = { onCleanup: vi.fn(() => Promise.resolve()) };
      const callbacks2 = { onCleanup: vi.fn(() => Promise.resolve()) };
      
      manager.startOperation('op-1', 'Operation 1', 'export', mockProgress, callbacks1);
      manager.startOperation('op-2', 'Operation 2', 'export', mockProgress, callbacks2);
      
      manager.completeOperation('op-1');
      
      // completeOperation is sync, check immediately
      expect((manager as any).activeOperations.has('op-1')).toBe(false);
      expect((manager as any).activeOperations.has('op-2')).toBe(true);
      expect((manager as any).activeOperations.size).toBe(1);
    });
  });

  describe('Emergency Cleanup', () => {
    it('should clean up all active operations', async () => {
      const callbacks1 = { onCleanup: vi.fn(() => Promise.resolve()) };
      const callbacks2 = { onCleanup: vi.fn(() => Promise.resolve()) };
      const callbacks3 = { onCleanup: vi.fn(() => Promise.resolve()) };
      
      manager.startOperation('op-1', 'Operation 1', 'export', mockProgress, callbacks1);
      manager.startOperation('op-2', 'Operation 2', 'export', mockProgress, callbacks2);
      manager.startOperation('op-3', 'Operation 3', 'batchExport', mockProgress, callbacks3);
      
      await manager.emergencyCleanup();
      
      expect(callbacks1.onCleanup).toHaveBeenCalled();
      expect(callbacks2.onCleanup).toHaveBeenCalled();
      expect(callbacks3.onCleanup).toHaveBeenCalled();
      expect((manager as any).activeOperations.size).toBe(0);
    });

    it('should handle emergency cleanup with no active operations', async () => {
      await expect(manager.emergencyCleanup()).resolves.not.toThrow();
    });
  });

  describe('Operation Status', () => {
    it('should return all active operations', () => {
      manager.startOperation('op-1', 'Operation 1', 'export', mockProgress, {});
      manager.startOperation('op-2', 'Operation 2', 'batchExport', mockProgress, {});
      
      const operations = manager.getActiveOperations();
      
      expect(operations).toHaveLength(2);
      expect(operations.find(op => op.id === 'op-1')).toBeDefined();
      expect(operations.find(op => op.id === 'op-2')).toBeDefined();
    });

    it('should return empty array when no operations active', () => {
      const operations = manager.getActiveOperations();
      expect(operations).toHaveLength(0);
    });

    it('should return operation info with correct structure', () => {
      manager.startOperation('op-1', 'Test Operation', 'export', mockProgress, {});
      
      const operations = manager.getActiveOperations();
      const op = operations[0];
      
      expect(op).toHaveProperty('id');
      expect(op).toHaveProperty('name');
      expect(op).toHaveProperty('duration');
      expect(op).toHaveProperty('isWarned');
    });
  });

  describe('Callback Error Handling', () => {
    it('should propagate errors from soft timeout callback', async () => {
      const errorCallback = {
        onSoftTimeout: vi.fn(() => {
          throw new Error('Soft timeout error');
        })
      };
      
      manager.startOperation('op-1', 'Test', 'export', mockProgress, errorCallback);
      
      // The error will be thrown when the timeout fires
      await expect(vi.advanceTimersByTimeAsync(10_000)).rejects.toThrow('Soft timeout error');
    });

    it('should handle completing operation with no callbacks', () => {
      manager.startOperation('op-1', 'Test', 'export', mockProgress, {});
      
      expect(() => manager.completeOperation('op-1')).not.toThrow();
    });
  });
});
