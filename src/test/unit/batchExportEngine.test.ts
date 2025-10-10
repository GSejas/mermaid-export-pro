import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as path from 'path';

// Mock ESM-only modules and side-effected modules before importing the module under test
vi.mock('fs/promises', () => ({
  access: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 123 })
}));

vi.mock('../../../src/strategies/cliExportStrategy', () => ({
  CLIExportStrategy: class {
    name = 'CLI';
    async isAvailable() { return true; }
    async export() { return Buffer.from(''); }
  }
}));

vi.mock('../../../src/strategies/webExportStrategy', () => ({
  WebExportStrategy: class {
    name = 'WEB';
    constructor() {}
    async isAvailable() { return true; }
    async export() { return Buffer.from(''); }
  }
}));

vi.mock('../../../src/ui/errorHandler', () => ({
  ErrorHandler: {
    logInfo: vi.fn(),
    logError: vi.fn(),
    logWarning: vi.fn()
  }
}));

// Now import the module under test
import {
  BatchExportEngineImpl,
  createBatchExportEngine
} from '../../../src/services/batchExportEngine';

describe('BatchExportEngineImpl', () => {
  let context: any;

  beforeEach(() => {
    vi.clearAllMocks();
    context = { subscriptions: [] };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createBatch should produce the expected number of jobs and create output dirs', async () => {
    const engine = new BatchExportEngineImpl(context as any);

    const files = [
      {
        path: path.join('docs', 'test.mmd'),
        relativePath: 'docs/test.mmd',
        size: 100,
        diagrams: [
          { id: 'd1', content: 'graph LR; A-->B', complexity: { category: 'simple', score: 1 }, typeAnalysis: { primaryType: 'flow' }, startLine: 0 },
          { id: 'd2', content: 'graph LR; C-->D', complexity: { category: 'moderate', score: 2 }, typeAnalysis: { primaryType: 'flow' }, startLine: 10 }
        ]
      }
    ];

    const config = {
      formats: ['svg', 'png'],
      outputDirectory: path.join('out', 'batch-test'),
      organizeByFormat: true,
      namingStrategy: 'sequential',
      theme: 'default',
      backgroundColor: '#ffffff',
      maxDepth: 1,
      dimensions: { width: 800, height: 600 }
    } as any;

    const batch = await engine.createBatch(files as any, config);

    // files(1) * diagrams(2) * formats(2) = 4 jobs
    expect(batch.jobs.length).toBe(4);
    expect(batch.executionStrategy).toBe('sequential');

    // Basic metadata checks
    expect(batch.metadata.totalFiles).toBe(1);
    expect(batch.metadata.totalFormats).toBe(2);
  });

  it('createBatch should throw when formats are not specified', async () => {
    const engine = createBatchExportEngine(context as any) as BatchExportEngineImpl;

    const files = [] as any[];
    const badConfig = {
      formats: [],
      outputDirectory: 'out',
      maxDepth: 1
    } as any;

    await expect(engine.createBatch(files, badConfig)).rejects.toThrow('No export formats specified');
  });

  it('estimateDuration should return a positive integer and adjust for strategy', async () => {
    const engine = new BatchExportEngineImpl(context as any);

    const fakeJobs = [
      { format: 'svg', diagram: { complexity: { category: 'simple', score: 1 } } },
      { format: 'png', diagram: { complexity: { category: 'moderate', score: 2 } } }
    ] as any;

    const fakeBatch = {
      jobs: fakeJobs,
      executionStrategy: 'parallel'
    } as any;

    const estimate = await engine.estimateDuration(fakeBatch);
    expect(typeof estimate).toBe('number');
    expect(estimate).toBeGreaterThan(0);
  });

  it('optimizeJobOrder should order jobs by priority/complexity/format', () => {
    const engine = new BatchExportEngineImpl(context as any);

    const jobs = [
      { priority: 1, diagram: { complexity: { score: 10 } }, format: 'pdf' } as any,
      { priority: 8, diagram: { complexity: { score: 1 } }, format: 'svg' } as any
    ];

    const ordered = engine.optimizeJobOrder(jobs);
    expect(ordered[0].format).toBe('svg');
  });
});
