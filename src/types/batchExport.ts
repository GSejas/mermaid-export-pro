/**
 * Advanced Export Folder Types and Interfaces
 * 
 * This module provides comprehensive type definitions for the new export folder system
 * with support for multi-format exports, progress tracking, error handling, and testability.
 * 
 * @author Claude/Jorge
 * @version 2.0.0
 * @date 2025-08-27
 */

import { ExportFormat, ExportOptions, MermaidDiagram, MermaidTheme } from './index';

// =====================================================
// Core Export Folder Configuration Types
// =====================================================

/**
 * Comprehensive configuration for export folder operations
 */
export interface BatchExportConfig {
  /** Formats to export to (supports multiple formats) */
  formats: ExportFormat[];
  /** Theme to apply to all diagrams */
  theme: MermaidTheme;
  /** Custom background color (overrides theme default) */
  backgroundColor?: string;
  /** Output directory for exported files */
  outputDirectory: string;
  /** Maximum directory depth for file discovery */
  maxDepth: number;
  /** Naming strategy for output files */
  namingStrategy: FileNamingStrategy;
  /** Whether to organize outputs by format */
  organizeByFormat: boolean;
  /** Whether to overwrite existing files */
  overwriteExisting: boolean;
  /** Custom dimensions for raster formats */
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * File naming strategies for export folders
 */
export type FileNamingStrategy = 
  | 'sequential'    // file-1.svg, file-2.svg
  | 'descriptive'   // file-flowchart.svg, file-sequence.svg  
  | 'lineNumber'    // file-line-10.svg, file-line-25.svg
  | 'custom';       // User-defined naming pattern

/**
 * Pattern for custom file naming
 */
export interface CustomNamingPattern {
  /** Template pattern with placeholders */
  template: string; // e.g., "{baseName}-{diagramType}-{index}.{format}"
  /** Available placeholders and their meanings */
  placeholders: {
    baseName: string;      // Original filename without extension
    diagramType: string;   // flowchart, sequence, etc.
    index: number;         // 1-based diagram index
    lineNumber: number;    // Starting line number in source
    format: string;        // Output format
    timestamp: string;     // Export timestamp
  };
}

// =====================================================
// Discovery and Analysis Types
// =====================================================

/**
 * Enhanced file discovery options
 */
export interface DiscoveryOptions {
  /** Root directory to scan */
  rootDirectory: string;
  /** Maximum depth to scan */
  maxDepth: number;
  /** File patterns to include */
  includePatterns: string[];
  /** File patterns to exclude */
  excludePatterns: string[];
  /** Directories to skip */
  excludeDirectories: string[];
  /** Whether to follow symbolic links */
  followSymlinks: boolean;
  /** Case-sensitive pattern matching */
  caseSensitive: boolean;
}

/**
 * Enhanced mermaid file representation with metadata
 */
export interface EnhancedMermaidFile {
  /** Absolute file path */
  path: string;
  /** Relative path from root directory */
  relativePath: string;
  /** Original file content */
  content: string;
  /** File type indicator */
  type: 'mmd' | 'markdown';
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  lastModified: Date;
  /** All diagrams found in the file */
  diagrams: EnhancedMermaidDiagram[];
  /** File processing metadata */
  metadata: FileMetadata;
}

/**
 * Enhanced diagram representation with analysis
 */
export interface EnhancedMermaidDiagram extends MermaidDiagram {
  /** Unique identifier for this diagram */
  id: string;
  /** Detected diagram type with confidence */
  typeAnalysis: DiagramTypeAnalysis;
  /** Syntax validation result */
  validation: DiagramValidation;
  /** Complexity metrics */
  complexity: DiagramComplexity;
  /** Estimated render dimensions */
  estimatedDimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Diagram type analysis with confidence scoring
 */
export interface DiagramTypeAnalysis {
  /** Primary detected type */
  primaryType: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Alternative possible types with scores */
  alternatives: Array<{
    type: string;
    confidence: number;
  }>;
  /** Analysis method used */
  analysisMethod: 'keyword' | 'syntax' | 'heuristic';
}

/**
 * Diagram syntax validation results
 */
export interface DiagramValidation {
  /** Whether syntax is valid */
  isValid: boolean;
  /** Validation errors if any */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Parser used for validation */
  parser: string;
}

/**
 * Diagram complexity assessment
 */
export interface DiagramComplexity {
  /** Node/element count */
  nodeCount: number;
  /** Connection/edge count */
  connectionCount: number;
  /** Nesting depth */
  depth: number;
  /** Complexity score (0-10) */
  score: number;
  /** Complexity category */
  category: 'simple' | 'moderate' | 'complex' | 'very-complex';
  /** Estimated render time (ms) */
  estimatedRenderTime: number;
}

/**
 * File processing metadata
 */
export interface FileMetadata {
  /** When file was processed */
  processedAt: Date;
  /** Processing duration in milliseconds */
  processingTime: number;
  /** Number of diagrams found */
  diagramCount: number;
  /** File encoding detected */
  encoding: string;
  /** Line count */
  lineCount: number;
  /** Whether file has BOM */
  hasBOM: boolean;
}

// =====================================================
// Export Operation Types
// =====================================================

/**
 * Individual export job specification
 */
export interface ExportJob {
  /** Unique job identifier */
  id: string;
  /** Source diagram */
  diagram: EnhancedMermaidDiagram;
  /** Source file information */
  sourceFile: EnhancedMermaidFile;
  /** Target format */
  format: ExportFormat;
  /** Export options */
  options: ExportOptions;
  /** Output path */
  outputPath: string;
  /** Job priority (1-10, higher = more priority) */
  priority: number;
  /** Job dependencies (other job IDs that must complete first) */
  dependencies: string[];
  /** Retry configuration */
  retryConfig: RetryConfig;
}

/**
 * Retry configuration for failed exports
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Initial delay between retries (ms) */
  initialDelay: number;
  /** Backoff multiplier for delay */
  backoffMultiplier: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Types of errors to retry */
  retryableErrors: string[];
}

/**
 * Export batch specification
 */
export interface ExportBatch {
  /** Unique batch identifier */
  id: string;
  /** Batch name/description */
  name: string;
  /** All jobs in this batch */
  jobs: ExportJob[];
  /** Batch configuration */
  config: BatchExportConfig;
  /** Batch metadata */
  metadata: BatchMetadata;
  /** Execution strategy */
  executionStrategy: BatchExecutionStrategy;
}

/**
 * Batch execution strategies
 */
export type BatchExecutionStrategy = 
  | 'sequential'    // Execute jobs one after another
  | 'parallel'      // Execute all jobs simultaneously
  | 'mixed'         // Parallel execution with concurrency limits
  | 'prioritized';  // Execute by priority order

/**
 * Batch metadata and statistics
 */
export interface BatchMetadata {
  /** When batch was created */
  createdAt: Date;
  /** Total number of jobs */
  totalJobs: number;
  /** Total number of files */
  totalFiles: number;
  /** Total number of formats */
  totalFormats: number;
  /** Estimated total export time (ms) */
  estimatedDuration: number;
  /** Expected output file count */
  expectedOutputs: number;
  /** Total size of source files (bytes) */
  sourceSize: number;
  /** Estimated output size (bytes) */
  estimatedOutputSize: number;
}

// =====================================================
// Progress Tracking Types  
// =====================================================

/**
 * Comprehensive progress information
 */
export interface BatchProgress {
  /** Current batch being processed */
  batchId: string;
  /** Overall progress (0-1) */
  overallProgress: number;
  /** Current job being processed */
  currentJob?: ExportJob;
  /** Jobs completed */
  completedJobs: number;
  /** Total jobs */
  totalJobs: number;
  /** Jobs by status */
  jobCounts: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  /** Time statistics */
  timing: {
    startedAt: Date;
    estimatedCompletion: Date;
    averageJobTime: number;
    remainingTime: number;
  };
  /** Current operation details */
  currentOperation: {
    phase: BatchPhase;
    message: string;
    subProgress?: number;
  };
  /** Performance metrics */
  performance: {
    jobsPerSecond: number;
    totalThroughput: number;
    memoryUsage: number;
  };
}

/**
 * Batch execution phases
 */
export type BatchPhase = 
  | 'discovery'     // Finding and analyzing files
  | 'validation'    // Validating diagram syntax
  | 'planning'      // Creating export jobs
  | 'exporting'     // Running exports
  | 'verification'  // Verifying outputs
  | 'cleanup'       // Cleaning up temporary files
  | 'completed'     // All done
  | 'failed';       // Operation failed

/**
 * Progress callback with rich information
 */
export interface ProgressReporter {
  /** Initialize batch with total job count */
  initializeBatch(totalJobs: number): void;
  /** Update overall progress */
  updateProgress(progress: BatchProgress): void;
  /** Report phase change */
  setPhase(phase: BatchPhase, message: string): void;
  /** Update current job */
  setCurrentJob(job: ExportJob, subProgress?: number): void;
  /** Report job completion */
  completeJob(job: ExportJob, result: JobResult): void;
  /** Report error */
  reportError(error: BatchExportError): void;
  /** Check if operation was cancelled */
  isCancelled(): boolean;
}

// =====================================================
// Result and Error Types
// =====================================================

/**
 * Individual job execution result
 */
export interface JobResult {
  /** Job that was executed */
  job: ExportJob;
  /** Whether job succeeded */
  success: boolean;
  /** Output file path if successful */
  outputPath?: string;
  /** File size of output */
  outputSize?: number;
  /** Execution time in milliseconds */
  duration: number;
  /** Export strategy used */
  strategy: string;
  /** Error information if failed */
  error?: BatchExportError;
  /** Number of retry attempts */
  retryAttempts: number;
  /** Additional metadata */
  metadata: {
    memoryUsed: number;
    peakMemory: number;
    cpuTime: number;
  };
}

/**
 * Comprehensive export folder results
 */
export interface BatchResult {
  /** Batch that was executed */
  batch: ExportBatch;
  /** Overall success status */
  success: boolean;
  /** Individual job results */
  jobResults: JobResult[];
  /** Summary statistics */
  summary: {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    skippedJobs: number;
    totalOutputs: number;
    totalOutputSize: number;
    totalDuration: number;
  };
  /** Error summary */
  errors: BatchExportError[];
  /** Performance metrics */
  performance: {
    averageJobTime: number;
    peakMemoryUsage: number;
    totalCpuTime: number;
    throughput: number;
  };
  /** Output organization */
  outputs: {
    byFormat: Map<ExportFormat, string[]>;
    byFile: Map<string, string[]>;
    allPaths: string[];
  };
  /** Execution timeline */
  timeline: {
    startedAt: Date;
    completedAt: Date;
    phases: Array<{
      phase: BatchPhase;
      startedAt: Date;
      completedAt: Date;
      duration: number;
    }>;
  };
}

/**
 * Enhanced error information for batch operations
 */
export interface BatchExportError {
  /** Error code for categorization */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Error severity level */
  severity: 'warning' | 'error' | 'critical';
  /** Context where error occurred */
  context: {
    phase: BatchPhase;
    jobId?: string;
    filePath?: string;
    format?: ExportFormat;
  };
  /** Original error if available */
  originalError?: Error;
  /** Suggested recovery actions */
  recoveryActions: string[];
  /** Whether error is retryable */
  retryable: boolean;
  /** Additional error details */
  details?: {
    stackTrace?: string;
    systemInfo?: SystemInfo;
    reproductionSteps?: string[];
  };
}

/**
 * System information for error reporting
 */
export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  vsCodeVersion: string;
  extensionVersion: string;
  memoryUsage: NodeJS.MemoryUsage;
  availableStrategies: string[];
}

// =====================================================
// Validation Types
// =====================================================

/**
 * Validation error details
 */
export interface ValidationError {
  /** Error message */
  message: string;
  /** Line number where error occurs */
  line?: number;
  /** Column number where error occurs */
  column?: number;
  /** Error severity */
  severity: 'error' | 'warning';
  /** Error code for categorization */
  code: string;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  /** Warning message */
  message: string;
  /** Line number where warning applies */
  line?: number;
  /** Warning category */
  category: 'syntax' | 'style' | 'performance' | 'compatibility';
  /** Recommended action */
  recommendation?: string;
}

// =====================================================
// Service Interface Definitions
// =====================================================

/**
 * File discovery and analysis service
 */
export interface DiagramDiscoveryService {
  /** Discover files with configurable options */
  discoverFiles(options: DiscoveryOptions): Promise<EnhancedMermaidFile[]>;
  /** Analyze a single file */
  analyzeFile(filePath: string): Promise<EnhancedMermaidFile>;
  /** Extract diagrams from content */
  extractDiagrams(content: string, filePath: string): EnhancedMermaidDiagram[];
  /** Validate diagram syntax */
  validateDiagram(diagram: EnhancedMermaidDiagram): Promise<DiagramValidation>;
  /** Calculate diagram complexity */
  calculateComplexity(diagram: EnhancedMermaidDiagram): DiagramComplexity;
}

/**
 * Export job planning and execution service
 */
export interface BatchExportEngine {
  /** Create export batch from files and config */
  createBatch(files: EnhancedMermaidFile[], config: BatchExportConfig): Promise<ExportBatch>;
  /** Execute export batch */
  executeBatch(batch: ExportBatch, reporter: ProgressReporter): Promise<BatchResult>;
  /** Estimate batch execution time */
  estimateDuration(batch: ExportBatch): Promise<number>;
  /** Optimize job execution order */
  optimizeJobOrder(jobs: ExportJob[]): ExportJob[];
  /** Validate batch before execution */
  validateBatch(batch: ExportBatch): Promise<ValidationError[]>;
}

/**
 * Progress tracking and reporting service
 */
export interface ProgressTrackingService {
  /** Create new progress reporter */
  createReporter(batchId: string): ProgressReporter;
  /** Get current progress */
  getProgress(batchId: string): BatchProgress | null;
  /** Subscribe to progress updates */
  onProgress(batchId: string, callback: (progress: BatchProgress) => void): void;
  /** Cancel operation */
  cancel(batchId: string): void;
  /** Cleanup tracking data */
  cleanup(batchId: string): void;
}

/**
 * Error handling and recovery service
 */
export interface ErrorHandlingService {
  /** Handle and categorize errors */
  handleError(error: unknown, context: any): BatchExportError;
  /** Determine if error is retryable */
  isRetryable(error: BatchExportError): boolean;
  /** Get recovery suggestions */
  getRecoveryActions(error: BatchExportError): string[];
  /** Log error for debugging */
  logError(error: BatchExportError): void;
  /** Generate error report */
  generateErrorReport(errors: BatchExportError[]): string;
}