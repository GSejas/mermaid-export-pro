/**
 * Export Folder Engine
 * 
 * Core orchestration engine for multi-format export folders with:
 * - Intelligent job planning and optimization
 * - Multi-format export coordination
 * - Parallel execution with resource management
 * - Comprehensive error handling and recovery
 * - Performance optimization and monitoring
 * 
 * @author Claude/Jorge
 * @version 2.0.0
 * @date 2025-08-27
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import {
  BatchExportEngine,
  EnhancedMermaidFile,
  BatchExportConfig,
  ExportBatch,
  ExportJob,
  BatchResult,
  JobResult,
  ProgressReporter,
  BatchMetadata,
  BatchPhase,
  ValidationError,
  RetryConfig,
  CustomNamingPattern
} from '../types/batchExport';
import { ExportOptions, ExportStrategy, ExportFormat } from '../types';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { ErrorHandler } from '../ui/errorHandler';
import * as vscode from 'vscode';

/**
 * Default retry configuration for export jobs
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'TEMPORARY_FAILURE', 'RESOURCE_UNAVAILABLE']
};

/**
 * Default job execution limits
 */
const EXECUTION_LIMITS = {
  maxConcurrentJobs: 4,
  maxMemoryUsage: 1024 * 1024 * 512, // 512MB
  jobTimeoutMs: 30000,
  batchTimeoutMs: 300000 // 5 minutes
};

/**
 * Implementation of the export folder engine
 */
export class BatchExportEngineImpl implements BatchExportEngine {
  private strategies = new Map<string, ExportStrategy>();
  private runningJobs = new Map<string, Promise<JobResult>>();
  private jobQueue: ExportJob[] = [];
  
  constructor(private context: vscode.ExtensionContext) {
    this.initializeStrategies();
  }

  /**
   * Create optimized export batch from files and configuration
   */
  async createBatch(files: EnhancedMermaidFile[], config: BatchExportConfig): Promise<ExportBatch> {
    const startTime = Date.now();
    const batchId = this.generateBatchId();
    
    ErrorHandler.logInfo(`Creating export folder: ${files.length} files, ${config.formats.length} formats`);
    
    try {
      // Validate configuration
      this.validateConfig(config);
      
      // Create jobs for all file/format combinations
      const jobs = await this.createExportJobs(files, config);
      
      // Optimize job execution order
      const optimizedJobs = this.optimizeJobOrder(jobs);
      
      // Calculate batch metadata
      const metadata = this.calculateBatchMetadata(files, config, optimizedJobs);
      
      // Create output directory structure
      await this.createOutputStructure(config);
      
      const batch: ExportBatch = {
        id: batchId,
        name: `Export Folder - ${new Date().toISOString()}`,
        jobs: optimizedJobs,
        config,
        metadata,
        executionStrategy: this.selectExecutionStrategy(optimizedJobs.length, config)
      };
      
      const duration = Date.now() - startTime;
      ErrorHandler.logInfo(`Batch created: ${optimizedJobs.length} jobs, estimated ${Math.round(metadata.estimatedDuration / 1000)}s, planned in ${duration}ms`);
      
      return batch;
      
    } catch (error) {
      ErrorHandler.logError(`Failed to create batch: ${error}`);
      throw error;
    }
  }

  /**
   * Execute export batch with comprehensive progress tracking
   */
  async executeBatch(batch: ExportBatch, reporter: ProgressReporter): Promise<BatchResult> {
    const startTime = Date.now();
    const jobResults: JobResult[] = [];
    let currentPhase: BatchPhase = 'planning';
    
    ErrorHandler.logInfo(`Executing batch: ${batch.jobs.length} jobs using ${batch.executionStrategy} strategy`);
    
    try {
      // Phase 1: Planning and Validation
      reporter.setPhase('planning', 'Validating batch configuration...');
      const validationErrors = await this.validateBatch(batch);
      if (validationErrors.length > 0) {
        throw new Error(`Batch validation failed: ${validationErrors[0].message}`);
      }
      
      // Phase 2: Export execution
      reporter.setPhase('exporting', 'Starting export operations...');
      
      switch (batch.executionStrategy) {
        case 'sequential':
          await this.executeSequential(batch, reporter, jobResults);
          break;
        case 'parallel':
          await this.executeParallel(batch, reporter, jobResults);
          break;
        case 'mixed':
          await this.executeMixed(batch, reporter, jobResults);
          break;
        case 'prioritized':
          await this.executePrioritized(batch, reporter, jobResults);
          break;
      }
      
      // Phase 3: Verification
      reporter.setPhase('verification', 'Verifying export outputs...');
      await this.verifyOutputs(jobResults);
      
      // Phase 4: Cleanup
      reporter.setPhase('cleanup', 'Cleaning up temporary files...');
      await this.cleanupTemporaryFiles(batch);
      
      // Phase 5: Complete
      reporter.setPhase('completed', 'Folder export completed successfully');
      
      const result = this.createBatchResult(batch, jobResults, startTime);
      
      ErrorHandler.logInfo(`Batch completed: ${result.summary.successfulJobs}/${result.summary.totalJobs} jobs successful in ${Math.round(result.summary.totalDuration / 1000)}s`);
      
      return result;
      
    } catch (error) {
      reporter.setPhase('failed', `Folder export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      ErrorHandler.logError(`Batch execution failed: ${error}`);
      
      return this.createBatchResult(batch, jobResults, startTime, error);
    }
  }

  /**
   * Estimate batch execution duration
   */
  async estimateDuration(batch: ExportBatch): Promise<number> {
    let totalEstimate = 0;
    
    // Base time per job type
    const baseJobTime: Record<string, number> = {
      'svg': 2000,   // 2s for SVG
      'png': 3000,   // 3s for PNG  
      'pdf': 4000,   // 4s for PDF
      'jpg': 3000,   // 3s for JPG
      'jpeg': 3000,  // 3s for JPEG
      'webp': 3000   // 3s for WebP
    };
    
    // Complexity multipliers
    const complexityMultipliers: Record<string, number> = {
      'simple': 1.0,
      'moderate': 1.5,
      'complex': 2.0,
      'very-complex': 3.0
    };
    
    for (const job of batch.jobs) {
      const baseTime = baseJobTime[job.format] || 3000;
      const complexityMultiplier = complexityMultipliers[job.diagram.complexity.category] || 1.5;
      const jobEstimate = baseTime * complexityMultiplier;
      
      totalEstimate += jobEstimate;
    }
    
    // Adjust for execution strategy
    switch (batch.executionStrategy) {
      case 'parallel':
        // Assume optimal parallelization with max concurrent jobs
        totalEstimate = totalEstimate / Math.min(EXECUTION_LIMITS.maxConcurrentJobs, batch.jobs.length);
        break;
      case 'mixed':
        // Partial parallelization
        totalEstimate = totalEstimate * 0.6;
        break;
      case 'sequential':
        // No reduction for sequential
        break;
    }
    
    // Add overhead for planning, verification, cleanup
    const overhead = Math.min(5000, totalEstimate * 0.1);
    
    return Math.round(totalEstimate + overhead);
  }

  /**
   * Optimize job execution order for maximum efficiency
   */
  optimizeJobOrder(jobs: ExportJob[]): ExportJob[] {
    // Sort by multiple criteria for optimal execution
    return jobs.sort((a, b) => {
      // 1. Priority (higher first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // 2. Complexity (simpler first for faster feedback)
      if (a.diagram.complexity.score !== b.diagram.complexity.score) {
        return a.diagram.complexity.score - b.diagram.complexity.score;
      }
      
      // 3. Format (faster formats first)
      const formatPriority: Record<string, number> = { svg: 1, png: 2, jpg: 3, jpeg: 3, webp: 4, pdf: 5 };
      const aPriority = formatPriority[a.format] || 10;
      const bPriority = formatPriority[b.format] || 10;
      
      return aPriority - bPriority;
    });
  }

  /**
   * Validate batch configuration before execution
   */
  async validateBatch(batch: ExportBatch): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    try {
      // Validate output directory
      await fs.access(batch.config.outputDirectory);
      
      // Check available strategies
      const availableStrategies = await this.getAvailableStrategies();
      if (availableStrategies.length === 0) {
        errors.push({
          message: 'No export strategies available',
          severity: 'error',
          code: 'NO_STRATEGIES'
        });
      }
      
      // Validate job dependencies
      for (const job of batch.jobs) {
        for (const depId of job.dependencies) {
          if (!batch.jobs.find(j => j.id === depId)) {
            errors.push({
              message: `Job ${job.id} has invalid dependency: ${depId}`,
              severity: 'error',
              code: 'INVALID_DEPENDENCY'
            });
          }
        }
      }
      
      // Check for circular dependencies
      if (this.hasCircularDependencies(batch.jobs)) {
        errors.push({
          message: 'Circular dependencies detected in job graph',
          severity: 'error',
          code: 'CIRCULAR_DEPENDENCIES'
        });
      }
      
    } catch (error) {
      errors.push({
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        code: 'VALIDATION_ERROR'
      });
    }
    
    return errors;
  }

  /**
   * Private implementation methods
   */
  
  private async initializeStrategies(): Promise<void> {
    const cliStrategy = new CLIExportStrategy();
    const webStrategy = new WebExportStrategy(this.context);
    
    this.strategies.set('cli', cliStrategy);
    this.strategies.set('web', webStrategy);
  }

  private async getAvailableStrategies(): Promise<ExportStrategy[]> {
    const available: ExportStrategy[] = [];
    
    for (const strategy of this.strategies.values()) {
      if (await strategy.isAvailable()) {
        available.push(strategy);
      }
    }
    
    return available;
  }

  private async selectBestStrategy(): Promise<ExportStrategy> {
    const available = await this.getAvailableStrategies();
    if (available.length === 0) {
      throw new Error('No export strategies available');
    }
    
    // Prefer CLI strategy for better performance
    const cliStrategy = available.find(s => s.name.includes('CLI'));
    return cliStrategy || available[0];
  }

  private validateConfig(config: BatchExportConfig): void {
    if (!config.formats || config.formats.length === 0) {
      throw new Error('No export formats specified');
    }
    
    if (!config.outputDirectory) {
      throw new Error('Output directory not specified');
    }
    
    if (config.maxDepth < 1) {
      throw new Error('Maximum depth must be at least 1');
    }
  }

  private async createExportJobs(files: EnhancedMermaidFile[], config: BatchExportConfig): Promise<ExportJob[]> {
    const jobs: ExportJob[] = [];
    let jobIndex = 0;
    
    for (const file of files) {
      for (const diagram of file.diagrams) {
        for (const format of config.formats) {
          const job = await this.createSingleExportJob(
            file,
            diagram,
            format,
            config,
            jobIndex++
          );
          jobs.push(job);
        }
      }
    }
    
    return jobs;
  }

  private async createSingleExportJob(
    file: EnhancedMermaidFile,
    diagram: any,
    format: ExportFormat,
    config: BatchExportConfig,
    index: number
  ): Promise<ExportJob> {
    const outputPath = await this.generateOutputPath(file, diagram, format, config, index);
    
    const exportOptions: ExportOptions = {
      format,
      theme: config.theme,
      backgroundColor: config.backgroundColor,
      width: config.dimensions?.width || 1200,
      height: config.dimensions?.height || 800
    };
    
    ErrorHandler.logInfo(`Export Folder Engine: Created job with backgroundColor: "${config.backgroundColor}" for ${file.relativePath} (${format})`);
    
    const job: ExportJob = {
      id: `job_${this.generateJobId(file.path, diagram.id, format)}`,
      diagram,
      sourceFile: file,
      format,
      options: exportOptions,
      outputPath,
      priority: this.calculateJobPriority(diagram, format),
      dependencies: [],
      retryConfig: { ...DEFAULT_RETRY_CONFIG }
    };
    
    return job;
  }

  private async generateOutputPath(
    file: EnhancedMermaidFile,
    diagram: any,
    format: ExportFormat,
    config: BatchExportConfig,
    index: number
  ): Promise<string> {
    const baseName = path.basename(file.path, path.extname(file.path));
    const outputDir = config.organizeByFormat 
      ? path.join(config.outputDirectory, format)
      : config.outputDirectory;
    
    let fileName: string;
    
    switch (config.namingStrategy) {
      case 'sequential':
        fileName = file.diagrams.length > 1 
          ? `${baseName}-${index + 1}.${format}`
          : `${baseName}.${format}`;
        break;
        
      case 'descriptive':
        const type = diagram.typeAnalysis?.primaryType || 'diagram';
        fileName = file.diagrams.length > 1
          ? `${baseName}-${type}-${index + 1}.${format}`
          : `${baseName}-${type}.${format}`;
        break;
        
      case 'lineNumber':
        fileName = file.diagrams.length > 1
          ? `${baseName}-line-${diagram.startLine + 1}.${format}`
          : `${baseName}.${format}`;
        break;
        
      case 'custom':
        fileName = this.applyCustomNamingPattern(file, diagram, format, config);
        break;
        
      default:
        fileName = `${baseName}.${format}`;
    }
    
    return path.join(outputDir, fileName);
  }

  private applyCustomNamingPattern(
    file: EnhancedMermaidFile,
    diagram: any,
    format: ExportFormat,
    config: BatchExportConfig
  ): string {
    // This would be implemented based on custom pattern configuration
    const baseName = path.basename(file.path, path.extname(file.path));
    return `${baseName}-custom.${format}`;
  }

  private calculateJobPriority(diagram: any, format: ExportFormat): number {
    let priority = 5; // Base priority
    
    // Adjust for complexity (simpler diagrams get higher priority)
    switch (diagram.complexity.category) {
      case 'simple': priority += 2; break;
      case 'moderate': priority += 1; break;
      case 'complex': priority -= 1; break;
      case 'very-complex': priority -= 2; break;
    }
    
    // Adjust for format (faster formats get higher priority)
    const formatPriority: Record<string, number> = { svg: 2, png: 1, jpg: 1, jpeg: 1, webp: 0, pdf: -1 };
    priority += formatPriority[format] || 0;
    
    return Math.max(1, Math.min(10, priority));
  }

  private calculateBatchMetadata(
    files: EnhancedMermaidFile[],
    config: BatchExportConfig,
    jobs: ExportJob[]
  ): BatchMetadata {
    const totalFiles = files.length;
    const totalFormats = config.formats.length;
    const totalJobs = jobs.length;
    
    const sourceSize = files.reduce((sum, file) => sum + file.size, 0);
    const estimatedOutputSize = this.estimateOutputSize(jobs);
    
    return {
      createdAt: new Date(),
      totalJobs,
      totalFiles,
      totalFormats,
      estimatedDuration: 0, // Will be calculated by estimateDuration
      expectedOutputs: totalJobs,
      sourceSize,
      estimatedOutputSize
    };
  }

  private estimateOutputSize(jobs: ExportJob[]): number {
    // Rough estimates based on format and complexity
    const formatSizes: Record<string, number> = {
      svg: 50 * 1024,    // ~50KB
      png: 200 * 1024,   // ~200KB
      jpg: 150 * 1024,   // ~150KB
      jpeg: 150 * 1024,  // ~150KB
      webp: 100 * 1024,  // ~100KB
      pdf: 300 * 1024    // ~300KB
    };
    
    return jobs.reduce((sum, job) => {
      const baseSize = formatSizes[job.format] || 100 * 1024;
      const complexityMultiplier = job.diagram.complexity.score / 5;
      return sum + (baseSize * complexityMultiplier);
    }, 0);
  }

  private selectExecutionStrategy(jobCount: number, config: BatchExportConfig): any {
    if (jobCount <= 5) return 'sequential';
    if (jobCount <= 20) return 'mixed';
    return 'parallel';
  }

  private async createOutputStructure(config: BatchExportConfig): Promise<void> {
    await fs.mkdir(config.outputDirectory, { recursive: true });
    
    if (config.organizeByFormat) {
      for (const format of config.formats) {
        await fs.mkdir(path.join(config.outputDirectory, format), { recursive: true });
      }
    }
  }

  /**
   * Execution strategy implementations
   */
  
  private async executeSequential(
    batch: ExportBatch,
    reporter: ProgressReporter,
    results: JobResult[]
  ): Promise<void> {
    const strategy = await this.selectBestStrategy();
    let completed = 0;
    
    for (const job of batch.jobs) {
      if (reporter.isCancelled()) break;
      
      reporter.setCurrentJob(job, 0);
      const result = await this.executeJob(job, strategy);
      results.push(result);
      
      completed++;
      reporter.setCurrentJob(job, 100);
      reporter.completeJob(job, result);
      
      const progress = completed / batch.jobs.length;
      // Update overall progress would be handled by the reporter
    }
  }

  private async executeParallel(
    batch: ExportBatch,
    reporter: ProgressReporter,
    results: JobResult[]
  ): Promise<void> {
    const strategy = await this.selectBestStrategy();
    const concurrentJobs = Math.min(EXECUTION_LIMITS.maxConcurrentJobs, batch.jobs.length);
    
    const executeJobWithProgress = async (job: ExportJob) => {
      if (reporter.isCancelled()) return null;
      
      reporter.setCurrentJob(job, 0);
      const result = await this.executeJob(job, strategy);
      reporter.completeJob(job, result);
      return result;
    };
    
    // Execute jobs in batches to limit concurrency
    const jobBatches = this.chunkArray(batch.jobs, concurrentJobs);
    
    for (const jobBatch of jobBatches) {
      if (reporter.isCancelled()) break;
      
      const batchPromises = jobBatch.map(executeJobWithProgress);
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults.filter(r => r !== null) as JobResult[]);
    }
  }

  private async executeMixed(
    batch: ExportBatch,
    reporter: ProgressReporter,
    results: JobResult[]
  ): Promise<void> {
    // Group jobs by file for mixed execution
    const jobsByFile = this.groupJobsByFile(batch.jobs);
    const strategy = await this.selectBestStrategy();
    
    for (const [filePath, fileJobs] of jobsByFile) {
      if (reporter.isCancelled()) break;
      
      // Execute all formats for a file in parallel
      const filePromises = fileJobs.map(async (job) => {
        if (reporter.isCancelled()) return null;
        
        reporter.setCurrentJob(job, 0);
        const result = await this.executeJob(job, strategy);
        reporter.completeJob(job, result);
        return result;
      });
      
      const fileResults = await Promise.all(filePromises);
      results.push(...fileResults.filter(r => r !== null) as JobResult[]);
    }
  }

  private async executePrioritized(
    batch: ExportBatch,
    reporter: ProgressReporter,
    results: JobResult[]
  ): Promise<void> {
    // Jobs are already sorted by priority in optimizeJobOrder
    return this.executeSequential(batch, reporter, results);
  }

  private async executeJob(job: ExportJob, strategy: ExportStrategy): Promise<JobResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | undefined;
    
    while (retryCount <= job.retryConfig.maxAttempts) {
      try {
        const memoryBefore = process.memoryUsage();
        
        // Execute the actual export
        const buffer = await strategy.export(job.diagram.content, job.options);
        
        // Write output file
        await fs.mkdir(path.dirname(job.outputPath), { recursive: true });
        await fs.writeFile(job.outputPath, buffer);
        
        const stats = await fs.stat(job.outputPath);
        const memoryAfter = process.memoryUsage();
        
        return {
          job,
          success: true,
          outputPath: job.outputPath,
          outputSize: stats.size,
          duration: Date.now() - startTime,
          strategy: strategy.name,
          retryAttempts: retryCount,
          metadata: {
            memoryUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
            peakMemory: Math.max(memoryBefore.heapUsed, memoryAfter.heapUsed),
            cpuTime: Date.now() - startTime // Approximation
          }
        };
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;
        
        if (retryCount <= job.retryConfig.maxAttempts && this.isRetryableError(lastError)) {
          const delay = Math.min(
            job.retryConfig.initialDelay * Math.pow(job.retryConfig.backoffMultiplier, retryCount - 1),
            job.retryConfig.maxDelay
          );
          
          ErrorHandler.logWarning(`Job ${job.id} failed, retrying in ${delay}ms (attempt ${retryCount}/${job.retryConfig.maxAttempts}): ${lastError.message}`);
          await this.delay(delay);
        } else {
          break;
        }
      }
    }
    
    // Job failed after all retries
    return {
      job,
      success: false,
      duration: Date.now() - startTime,
      strategy: strategy.name,
      error: {
        code: 'EXPORT_FAILED',
        message: lastError?.message || 'Unknown error',
        severity: 'error',
        context: {
          phase: 'exporting',
          jobId: job.id,
          filePath: job.sourceFile.path,
          format: job.format
        },
        originalError: lastError,
        recoveryActions: ['Check diagram syntax', 'Verify export strategy availability', 'Try different format'],
        retryable: this.isRetryableError(lastError || new Error())
      },
      retryAttempts: retryCount,
      metadata: {
        memoryUsed: 0,
        peakMemory: 0,
        cpuTime: Date.now() - startTime
      }
    };
  }

  private isRetryableError(error: Error): boolean {
    const retryableMessages = [
      'timeout',
      'network',
      'temporary',
      'resource unavailable',
      'too many requests'
    ];
    
    const message = error.message.toLowerCase();
    return retryableMessages.some(keyword => message.includes(keyword));
  }

  private async verifyOutputs(results: JobResult[]): Promise<void> {
    for (const result of results) {
      if (result.success && result.outputPath) {
        try {
          await fs.access(result.outputPath);
        } catch {
          ErrorHandler.logWarning(`Output file not found: ${result.outputPath}`);
          result.success = false;
        }
      }
    }
  }

  private async cleanupTemporaryFiles(batch: ExportBatch): Promise<void> {
    // Implementation for cleaning up temporary files created during export
    ErrorHandler.logInfo(`Cleanup completed for batch ${batch.id}`);
  }

  private createBatchResult(
    batch: ExportBatch,
    jobResults: JobResult[],
    startTime: number,
    error?: any
  ): BatchResult {
    const endTime = Date.now();
    const successful = jobResults.filter(r => r.success);
    const failed = jobResults.filter(r => !r.success);
    
    const outputs = {
      byFormat: new Map<ExportFormat, string[]>(),
      byFile: new Map<string, string[]>(),
      allPaths: [] as string[]
    };
    
    // Organize outputs
    for (const result of successful) {
      if (result.outputPath) {
        outputs.allPaths.push(result.outputPath);
        
        // By format
        const formatPaths = outputs.byFormat.get(result.job.format) || [];
        formatPaths.push(result.outputPath);
        outputs.byFormat.set(result.job.format, formatPaths);
        
        // By file
        const filePaths = outputs.byFile.get(result.job.sourceFile.path) || [];
        filePaths.push(result.outputPath);
        outputs.byFile.set(result.job.sourceFile.path, filePaths);
      }
    }
    
    return {
      batch,
      success: error === undefined && failed.length === 0,
      jobResults,
      summary: {
        totalJobs: jobResults.length,
        successfulJobs: successful.length,
        failedJobs: failed.length,
        skippedJobs: 0,
        totalOutputs: outputs.allPaths.length,
        totalOutputSize: successful.reduce((sum, r) => sum + (r.outputSize || 0), 0),
        totalDuration: endTime - startTime
      },
      errors: failed.map(r => r.error!).filter(Boolean),
      performance: {
        averageJobTime: jobResults.length > 0 ? (endTime - startTime) / jobResults.length : 0,
        peakMemoryUsage: Math.max(...jobResults.map(r => r.metadata.peakMemory)),
        totalCpuTime: jobResults.reduce((sum, r) => sum + r.metadata.cpuTime, 0),
        throughput: jobResults.length / ((endTime - startTime) / 1000)
      },
      outputs,
      timeline: {
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        phases: [] // Would be populated during execution
      }
    };
  }

  /**
   * Utility methods
   */
  
  private generateBatchId(): string {
    return `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateJobId(filePath: string, diagramId: string, format: string): string {
    return crypto.createHash('sha256')
      .update(`${filePath}:${diagramId}:${format}`)
      .digest('hex')
      .substring(0, 16);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private groupJobsByFile(jobs: ExportJob[]): Map<string, ExportJob[]> {
    const grouped = new Map<string, ExportJob[]>();
    
    for (const job of jobs) {
      const filePath = job.sourceFile.path;
      const fileJobs = grouped.get(filePath) || [];
      fileJobs.push(job);
      grouped.set(filePath, fileJobs);
    }
    
    return grouped;
  }

  private hasCircularDependencies(jobs: ExportJob[]): boolean {
    // Simple cycle detection using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (jobId: string): boolean => {
      if (recursionStack.has(jobId)) return true;
      if (visited.has(jobId)) return false;
      
      visited.add(jobId);
      recursionStack.add(jobId);
      
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        for (const depId of job.dependencies) {
          if (hasCycle(depId)) return true;
        }
      }
      
      recursionStack.delete(jobId);
      return false;
    };
    
    for (const job of jobs) {
      if (!visited.has(job.id)) {
        if (hasCycle(job.id)) return true;
      }
    }
    
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function for creating export folder engine
 */
export function createBatchExportEngine(context: vscode.ExtensionContext): BatchExportEngine {
  return new BatchExportEngineImpl(context);
}