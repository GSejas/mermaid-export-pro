/**
 * Simple Tests for Export Folder Engine
 * 
 * Focus on core batch planning and job optimization without external dependencies.
 * 
 * @author Claude/Jorge
 * @version 2.0.0
 * @date 2025-08-27
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import { BatchExportEngineImpl } from '../../../services/batchExportEngine';
import { 
  BatchExportConfig,
  EnhancedMermaidFile,
  ExportJob
} from '../../../types/batchExport';
import { ExportFormat, MermaidTheme } from '../../../types';

// Mock VS Code extension context
const mockContext = {
  extensionPath: __dirname,
  globalState: {
    get: () => undefined,
    update: async () => {},
    keys: () => []
  },
  workspaceState: {
    get: () => undefined,
    update: async () => {},
    keys: () => []
  }
} as any;

describe('BatchExportEngine - Core Functionality', () => {
  let engine: BatchExportEngineImpl;
  
  beforeEach(() => {
    engine = new BatchExportEngineImpl(mockContext);
  });

  describe('Batch Creation', () => {
    it('should create batch with proper job distribution', async () => {
      const mockFiles = createMockFiles();
      const config: BatchExportConfig = {
        formats: ['svg', 'png'] as ExportFormat[],
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(os.tmpdir(), 'test-output'),
        maxDepth: 3,
        namingStrategy: 'sequential',
        organizeByFormat: false,
        overwriteExisting: false
      };
      
      const batch = await engine.createBatch(mockFiles, config);
      
      expect(batch.id).toBeDefined();
      expect(batch.config).toBe(config);
      
      // Should create jobs for each diagram/format combination
      const expectedJobCount = mockFiles.reduce((sum, file) => sum + file.diagrams.length, 0) * config.formats.length;
      expect(batch.jobs).toHaveLength(expectedJobCount);
      
      // All jobs should have unique IDs
      const jobIds = batch.jobs.map(job => job.id);
      const uniqueIds = new Set(jobIds);
      expect(uniqueIds.size).toBe(jobIds.length);
    });

    it('should handle single format export', async () => {
      const mockFiles = createMockFiles();
      const config: BatchExportConfig = {
        formats: ['svg'] as ExportFormat[],
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(os.tmpdir(), 'test-output'),
        maxDepth: 3,
        namingStrategy: 'sequential',
        organizeByFormat: false,
        overwriteExisting: false
      };
      
      const batch = await engine.createBatch(mockFiles, config);
      
      // Should create one job per diagram
      const expectedJobCount = mockFiles.reduce((sum, file) => sum + file.diagrams.length, 0);
      expect(batch.jobs).toHaveLength(expectedJobCount);
      
      // All jobs should be SVG format
      expect(batch.jobs.every(job => job.format === 'svg')).toBe(true);
    });

    it('should calculate batch metadata correctly', async () => {
      const mockFiles = createMockFiles();
      const config: BatchExportConfig = {
        formats: ['svg', 'png', 'pdf'] as ExportFormat[],
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(os.tmpdir(), 'test-output'),
        maxDepth: 3,
        namingStrategy: 'sequential',
        organizeByFormat: true,
        overwriteExisting: false
      };
      
      const batch = await engine.createBatch(mockFiles, config);
      
      expect(batch.metadata.totalFiles).toBe(mockFiles.length);
      expect(batch.metadata.totalFormats).toBe(config.formats.length);
      expect(batch.metadata.expectedOutputs).toBeGreaterThan(0);
      expect(batch.metadata.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Job Optimization', () => {
    it('should optimize job order by priority', () => {
      const jobs = createMockJobs();
      const optimized = engine.optimizeJobOrder(jobs);
      
      // Check that jobs are sorted by priority (higher first)
      for (let i = 1; i < optimized.length; i++) {
        const current = optimized[i];
        const previous = optimized[i - 1];
        expect(current.priority).toBeLessThanOrEqual(previous.priority);
      }
    });

    it('should maintain all jobs during optimization', () => {
      const jobs = createMockJobs();
      const originalCount = jobs.length;
      const optimized = engine.optimizeJobOrder(jobs);
      
      expect(optimized).toHaveLength(originalCount);
      
      // All original jobs should be present
      const originalIds = jobs.map(j => j.id).sort();
      const optimizedIds = optimized.map(j => j.id).sort();
      expect(optimizedIds).toEqual(originalIds);
    });
  });

  describe('Duration Estimation', () => {
    it('should provide duration estimates', async () => {
      const mockFiles = createMockFiles();
      const config: BatchExportConfig = {
        formats: ['svg'] as ExportFormat[],
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(os.tmpdir(), 'test-output'),
        maxDepth: 3,
        namingStrategy: 'sequential',
        organizeByFormat: false,
        overwriteExisting: false
      };
      
      const batch = await engine.createBatch(mockFiles, config);
      const estimation = await engine.estimateDuration(batch);
      
      expect(estimation).toBeGreaterThan(0);
      expect(estimation).toBeLessThan(300000); // Should be reasonable (< 5 minutes for simple batch)
    });

    it('should scale estimates with job count', async () => {
      const smallBatch = await engine.createBatch([createMockFiles()[0]], createBatchConfig(['svg']));
      const largeBatch = await engine.createBatch(createMockFiles(), createBatchConfig(['svg', 'png']));
      
      const smallEstimate = await engine.estimateDuration(smallBatch);
      const largeEstimate = await engine.estimateDuration(largeBatch);
      
      expect(largeEstimate).toBeGreaterThan(smallEstimate);
    });
  });

  describe('Batch Validation', () => {
    it('should validate valid batch configuration', async () => {
      const mockFiles = createMockFiles();
      const config = createBatchConfig(['svg']);
      
      const batch = await engine.createBatch(mockFiles, config);
      const validationErrors = await engine.validateBatch(batch);
      
      expect(Array.isArray(validationErrors)).toBe(true);
      // Valid batch should have minimal errors
      expect(validationErrors.length).toBeLessThan(5);
    });

    it('should handle empty job lists', async () => {
      const emptyFiles: EnhancedMermaidFile[] = [];
      const config = createBatchConfig(['svg']);
      
      const batch = await engine.createBatch(emptyFiles, config);
      
      expect(batch.jobs).toHaveLength(0);
      expect(batch.metadata.totalFiles).toBe(0);
      expect(batch.metadata.expectedOutputs).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      const mockFiles = createMockFiles();
      const invalidConfig: BatchExportConfig = {
        formats: [] as ExportFormat[], // Invalid - empty formats
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(os.tmpdir(), 'test-output'),
        maxDepth: 3,
        namingStrategy: 'sequential',
        organizeByFormat: false,
        overwriteExisting: false
      };
      
      await expect(engine.createBatch(mockFiles, invalidConfig)).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      const mockFiles = createMockFiles();
      const invalidConfig = {
        formats: [],
        theme: 'default',
        outputDirectory: '',
        maxDepth: -1,
        namingStrategy: 'sequential',
        organizeByFormat: false,
        overwriteExisting: false
      } as any;
      
      try {
        await engine.createBatch(mockFiles, invalidConfig);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('format');
      }
    });
  });
});

/**
 * Helper function to create mock files for testing
 */
function createMockFiles(): EnhancedMermaidFile[] {
  return [
    {
      path: path.join(os.tmpdir(), 'test', 'file1.md'),
      relativePath: 'file1.md',
      content: 'test content 1',
      type: 'markdown',
      size: 1000,
      lastModified: new Date(),
      diagrams: [
        {
          id: 'diagram1',
          content: 'flowchart TD\n    A --> B',
          startLine: 0,
          endLine: 2,
          type: 'flowchart',
          typeAnalysis: {
            primaryType: 'flowchart',
            confidence: 0.9,
            alternatives: [],
            analysisMethod: 'keyword'
          },
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            parser: 'test'
          },
          complexity: {
            nodeCount: 2,
            connectionCount: 1,
            depth: 1,
            score: 2.0,
            category: 'simple',
            estimatedRenderTime: 1000
          }
        }
      ],
      metadata: {
        processedAt: new Date(),
        processingTime: 100,
        diagramCount: 1,
        encoding: 'utf8',
        lineCount: 10,
        hasBOM: false
      }
    },
    {
      path: path.join(os.tmpdir(), 'test', 'file2.mmd'),
      relativePath: 'file2.mmd',
      content: 'test content 2',
      type: 'mmd',
      size: 2000,
      lastModified: new Date(),
      diagrams: [
        {
          id: 'diagram2',
          content: 'sequenceDiagram\n    A->>B: message',
          startLine: 0,
          endLine: 2,
          type: 'sequence',
          typeAnalysis: {
            primaryType: 'sequence',
            confidence: 0.95,
            alternatives: [],
            analysisMethod: 'keyword'
          },
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            parser: 'test'
          },
          complexity: {
            nodeCount: 2,
            connectionCount: 1,
            depth: 1,
            score: 3.0,
            category: 'moderate',
            estimatedRenderTime: 1500
          }
        }
      ],
      metadata: {
        processedAt: new Date(),
        processingTime: 150,
        diagramCount: 1,
        encoding: 'utf8',
        lineCount: 5,
        hasBOM: false
      }
    }
  ];
}

/**
 * Helper function to create mock jobs
 */
function createMockJobs(): ExportJob[] {
  const mockFiles = createMockFiles();
  
  return [
    {
      id: 'job1',
      diagram: mockFiles[0].diagrams[0],
      sourceFile: mockFiles[0],
      format: 'svg' as ExportFormat,
      options: { format: 'svg', theme: 'default' } as any,
      outputPath: path.join(os.tmpdir(), 'output', 'test1.svg'),
      priority: 8,
      dependencies: [],
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        retryableErrors: []
      }
    },
    {
      id: 'job2',
      diagram: mockFiles[1].diagrams[0],
      sourceFile: mockFiles[1],
      format: 'png' as ExportFormat,
      options: { format: 'png', theme: 'default' } as any,
      outputPath: path.join(os.tmpdir(), 'output', 'test2.png'),
      priority: 5,
      dependencies: [],
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        retryableErrors: []
      }
    },
    {
      id: 'job3',
      diagram: mockFiles[0].diagrams[0],
      sourceFile: mockFiles[0],
      format: 'pdf' as ExportFormat,
      options: { format: 'pdf', theme: 'default' } as any,
      outputPath: path.join(os.tmpdir(), 'output', 'test3.pdf'),
      priority: 3,
      dependencies: [],
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        retryableErrors: []
      }
    }
  ];
}

/**
 * Helper function to create batch config
 */
function createBatchConfig(formats: ExportFormat[]): BatchExportConfig {
  return {
    formats,
    theme: 'default' as MermaidTheme,
    outputDirectory: path.join(os.tmpdir(), 'test-output'),
    maxDepth: 3,
    namingStrategy: 'sequential',
    organizeByFormat: false,
    overwriteExisting: false
  };
}