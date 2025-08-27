/**
 * Core types and interfaces for Mermaid Export Pro
 */

export type ExportFormat = 'svg' | 'png' | 'pdf' | 'webp' | 'jpg' | 'jpeg';
export type MermaidTheme = 'default' | 'dark' | 'forest' | 'neutral';
export type ExportStrategyType = 'cli' | 'web' | 'auto';

export interface ExportOptions {
  format: ExportFormat;
  theme: MermaidTheme;
  width?: number;
  height?: number;
  backgroundColor?: string;
  cssFile?: string;
  configFile?: string;
  outputPath?: string;
  mermaidConfig?: any; // Allow custom mermaid configuration
}

export interface ExportStrategy {
  name: string;
  export(content: string, options: ExportOptions): Promise<Buffer>;
  isAvailable(): Promise<boolean>;
  getRequiredDependencies(): string[];
}

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  format: ExportFormat;
  strategy: string;
  error?: Error;
  duration: number;
}

export interface MermaidFile {
  path: string;
  content: string;
  type: 'mmd' | 'markdown';
  diagrams: MermaidDiagram[];
}

export interface MermaidDiagram {
  content: string;
  startLine: number;
  endLine: number;
  type: string; // flowchart, sequence, class, etc.
}

export interface ProgressCallback {
  (message: string, increment?: number): void;
}

export interface ConfigurationManager {
  getDefaultFormat(): ExportFormat;
  getTheme(): MermaidTheme;
  getOutputDirectory(): string;
  isAutoExportEnabled(): boolean;
  getExportStrategy(): ExportStrategyType;
  getDefaultWidth(): number;
  getDefaultHeight(): number;
  getBackgroundColor(): string;
}

export interface FileProcessor {
  detectMermaidFiles(directory: string): Promise<MermaidFile[]>;
  extractMermaidFromMarkdown(content: string): MermaidDiagram[];
  validateMermaidSyntax(content: string): boolean;
  generateOutputPath(inputPath: string, format: ExportFormat, outputDir?: string): string;
}

export interface ExportManager {
  exportSingle(file: MermaidFile, options: ExportOptions, progress?: ProgressCallback): Promise<ExportResult>;
  exportBatch(files: MermaidFile[], options: ExportOptions, progress?: ProgressCallback): Promise<ExportResult[]>;
  getAvailableStrategies(): Promise<ExportStrategy[]>;
  selectStrategy(preference: ExportStrategyType): Promise<ExportStrategy>;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: string;
  recoveryAction?: string;
}

export class MermaidExportError extends Error {
  constructor(
    public errorInfo: ErrorInfo,
    public originalError?: Error
  ) {
    super(errorInfo.message);
    this.name = 'MermaidExportError';
  }
}
