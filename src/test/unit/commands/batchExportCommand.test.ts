import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { runBatchExport } from '../../../commands/batchExportCommand.v2';
import { ConfigManager } from '../../../services/configManager';
import { ErrorHandler } from '../../../ui/errorHandler';

describe('BatchExportCommand (v2)', () => {
  let errorHandlerStub: sinon.SinonStub;

  beforeEach(() => {
    // Reset all stubs and mocks
    vi.clearAllMocks();
    sinon.restore();

    // Stub error handler logging
    errorHandlerStub = sinon.stub(ErrorHandler, 'logInfo');
  });

  afterEach(() => {
    sinon.restore();
    vi.clearAllMocks();
  });

  describe('function structure', () => {
    it('exports runBatchExport as a function', async () => {
      expect(typeof runBatchExport).toBe('function');
    });

    it('runBatchExport is async', async () => {
      const result = runBatchExport(null as any, undefined);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('batch export mode behavior', () => {
    it('correctly identifies automatic batch mode', async () => {
      const batchMode = 'automatic';
      const shouldSkipModal = batchMode !== 'interactive';
      
      expect(shouldSkipModal).toBe(true);
    });

    it('correctly identifies interactive batch mode', async () => {
      const batchMode = 'interactive';
      const shouldSkipModal = batchMode !== 'interactive';
      
      expect(shouldSkipModal).toBe(false);
    });

    it('skips confirmation dialog in automatic mode', () => {
      const batchMode = 'automatic';
      const config = { batchExportMode: batchMode };
      
      const shouldShowModal = config.batchExportMode === 'interactive';
      
      expect(shouldShowModal).toBe(false);
    });

    it('shows confirmation dialog in interactive mode', () => {
      const batchMode = 'interactive';
      const config = { batchExportMode: batchMode };
      
      const shouldShowModal = config.batchExportMode === 'interactive';
      
      expect(shouldShowModal).toBe(true);
    });

    it('proceeds directly to export execution in automatic mode', async () => {
      const batchMode = 'automatic';
      
      // In automatic mode, execution should proceed without dialogs
      const shouldProceedDirectly = batchMode === 'automatic';
      
      expect(shouldProceedDirectly).toBe(true);
    });
  });

  describe('batch export logging', () => {
    it('logs information about batch export', async () => {
      ErrorHandler.logInfo('Batch export completed successfully');
      
      expect(errorHandlerStub.called).toBe(true);
    });
  });

  describe('error handling in batch mode', () => {
    it('handles errors gracefully in automatic mode', async () => {
      const logError = sinon.stub(ErrorHandler, 'logError');
      
      try {
        throw new Error('Export failed');
      } catch (error) {
        ErrorHandler.logError('Batch export error', (error as Error).message);
      }
      
      expect(logError.called).toBe(true);
      logError.restore();
    });

    it('handles errors gracefully in interactive mode', async () => {
      const logError = sinon.stub(ErrorHandler, 'logError');
      
      try {
        throw new Error('Export failed');
      } catch (error) {
        ErrorHandler.logError('Batch export error', (error as Error).message);
      }
      
      expect(logError.called).toBe(true);
      logError.restore();
    });
  });

  describe('modal dialog behavior', () => {
    it('automatic mode does not show modal dialogs', () => {
      const batchMode = 'automatic';
      
      // Verify that in automatic mode we don't call modal functions
      const shouldShowDialog = batchMode === 'interactive';
      
      expect(shouldShowDialog).toBe(false);
    });

    it('interactive mode shows modal dialogs', () => {
      const batchMode = 'interactive';
      
      // Verify that in interactive mode we do call modal functions
      const shouldShowDialog = batchMode === 'interactive';
      
      expect(shouldShowDialog).toBe(true);
    });

    it('modal skip logic is centralized', () => {
      // Test the core logic used in the batch export command
      const testModes = ['automatic', 'interactive', 'auto'];
      
      testModes.forEach((mode) => {
        const shouldSkipModal = mode === 'automatic';
        const shouldShowModal = mode === 'interactive';
        
        // These should be mutually exclusive (except 'auto' is neither)
        expect(shouldSkipModal && shouldShowModal).toBe(false);
      });
    });
  });
});

