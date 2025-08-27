/**
 * Unit tests for ProgressTrackingService
 * 
 * Tests the progress tracking functionality including file path truncation
 * to ensure status bar displays clean, short file names instead of long paths.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProgressTrackingServiceImpl } from '../../../services/progressTrackingService';
import { ExportJob, EnhancedMermaidFile, BatchProgress } from '../../../types/batchExport';
import { ExportFormat, MermaidTheme } from '../../../types';

describe('ProgressTrackingService', () => {
  let service: ProgressTrackingServiceImpl;
  let batchId: string;

  beforeEach(() => {
    service = new ProgressTrackingServiceImpl();
    batchId = 'test-batch-' + Date.now();
  });

  afterEach(() => {
    service.cleanup(batchId);
  });

  describe('File Path Truncation', () => {
    it('should truncate long file paths in progress messages', () => {
      // Create a mock export job with a long relative path
      const longPath = 'deeply/nested/folder/structure/with/many/levels/test-diagram.md';
      const mockFile: EnhancedMermaidFile = {
        path: '/full/path/to/' + longPath,
        relativePath: longPath,
        content: 'graph TD\n  A --> B',
        type: 'markdown',
        diagrams: [{
          id: 'test-diagram',
          content: 'graph TD\n  A --> B',
          type: 'graph',
          startLine: 1,
          endLine: 2,
          complexity: 'simple'
        }],
        metadata: {
          lastModified: new Date(),
          fileSize: 100,
          diagramCount: 1,
          averageComplexity: 'simple' as const,
          hasUnsupportedFeatures: false
        }
      };

      const mockJob: ExportJob = {
        id: 'job-1',
        sourceFile: mockFile,
        diagramId: 'test-diagram',
        format: 'svg' as ExportFormat,
        outputPath: '/output/test.svg',
        priority: 1,
        dependencies: [],
        metadata: {
          estimatedDuration: 1000,
          complexity: 'simple' as const,
          retryCount: 0
        }
      };

      // Create reporter and set current job
      const reporter = service.createReporter(batchId);
      reporter.setCurrentJob(mockJob);

      // Get the current progress
      const progress = service.getProgress(batchId);

      // Verify that the message contains only the filename, not the full path
      expect(progress).toBeDefined();
      expect(progress!.currentOperation.message).toBe('Exporting test-diagram.md (SVG)');
      expect(progress!.currentOperation.message).not.toContain('deeply/nested/folder');
      expect(progress!.currentOperation.message).not.toContain('structure/with/many');
    });

    it('should handle simple filenames without modification', () => {
      const simplePath = 'diagram.md';
      const mockFile: EnhancedMermaidFile = {
        path: '/path/to/' + simplePath,
        relativePath: simplePath,
        content: 'graph TD\n  A --> B',
        type: 'markdown',
        diagrams: [{
          id: 'simple-diagram',
          content: 'graph TD\n  A --> B',
          type: 'graph',
          startLine: 1,
          endLine: 2,
          complexity: 'simple'
        }],
        metadata: {
          lastModified: new Date(),
          fileSize: 100,
          diagramCount: 1,
          averageComplexity: 'simple' as const,
          hasUnsupportedFeatures: false
        }
      };

      const mockJob: ExportJob = {
        id: 'job-2',
        sourceFile: mockFile,
        diagramId: 'simple-diagram',
        format: 'png' as ExportFormat,
        outputPath: '/output/diagram.png',
        priority: 1,
        dependencies: [],
        metadata: {
          estimatedDuration: 1000,
          complexity: 'simple' as const,
          retryCount: 0
        }
      };

      const reporter = service.createReporter(batchId);
      reporter.setCurrentJob(mockJob);

      const progress = service.getProgress(batchId);

      expect(progress).toBeDefined();
      expect(progress!.currentOperation.message).toBe('Exporting diagram.md (PNG)');
    });

    it('should format different export formats correctly', () => {
      const mockFile: EnhancedMermaidFile = {
        path: '/path/flowchart.mmd',
        relativePath: 'flowchart.mmd',
        content: 'graph TD\n  A --> B',
        type: 'mermaid',
        diagrams: [{
          id: 'flowchart',
          content: 'graph TD\n  A --> B',
          type: 'graph',
          startLine: 1,
          endLine: 2,
          complexity: 'simple'
        }],
        metadata: {
          lastModified: new Date(),
          fileSize: 100,
          diagramCount: 1,
          averageComplexity: 'simple' as const,
          hasUnsupportedFeatures: false
        }
      };

      const testCases = [
        { format: 'svg' as ExportFormat, expected: 'Exporting flowchart.mmd (SVG)' },
        { format: 'png' as ExportFormat, expected: 'Exporting flowchart.mmd (PNG)' },
        { format: 'jpg' as ExportFormat, expected: 'Exporting flowchart.mmd (JPG)' },
        { format: 'jpeg' as ExportFormat, expected: 'Exporting flowchart.mmd (JPEG)' }
      ];

      testCases.forEach(({ format, expected }, index) => {
        const mockJob: ExportJob = {
          id: `job-${index}`,
          sourceFile: mockFile,
          diagramId: 'flowchart',
          format,
          outputPath: `/output/flowchart.${format}`,
          priority: 1,
          dependencies: [],
          metadata: {
            estimatedDuration: 1000,
            complexity: 'simple' as const,
            retryCount: 0
          }
        };

        const testBatchId = `${batchId}-${index}`;
        const reporter = service.createReporter(testBatchId);
        reporter.setCurrentJob(mockJob);

        const progress = service.getProgress(testBatchId);
        expect(progress!.currentOperation.message).toBe(expected);
        
        // Cleanup
        service.cleanup(testBatchId);
      });
    });
  });

  describe('Progress State Management', () => {
    it('should create and manage progress reporters', () => {
      const reporter = service.createReporter(batchId);
      
      expect(reporter).toBeDefined();
      expect(reporter.isCancelled()).toBe(false);
      
      const progress = service.getProgress(batchId);
      expect(progress).toBeDefined();
      expect(progress!.overallProgress).toBe(0);
    });

    it('should handle phase updates correctly', () => {
      const reporter = service.createReporter(batchId);
      
      reporter.setPhase('planning', 'Creating export plan...');
      
      const progress = service.getProgress(batchId);
      expect(progress!.currentOperation.phase).toBe('planning');
      expect(progress!.currentOperation.message).toBe('Creating export plan...');
    });

    it('should handle cancellation correctly', () => {
      const reporter = service.createReporter(batchId);
      
      expect(reporter.isCancelled()).toBe(false);
      
      service.cancel(batchId);
      
      expect(reporter.isCancelled()).toBe(true);
      
      const progress = service.getProgress(batchId);
      expect(progress!.currentOperation.message).toBe('Operation cancelled by user');
    });
  });
});