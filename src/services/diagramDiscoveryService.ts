/**
 * Diagram Discovery Service
 * 
 * Provides comprehensive file discovery and diagram analysis capabilities with:
 * - Robust pattern matching for mermaid blocks
 * - Deep syntax analysis and validation  
 * - Performance optimized scanning
 * - Comprehensive error handling
 * - Detailed metadata extraction
 * 
 * @author Claude Code Assistant
 * @version 2.0.0
 * @date 2025-08-27
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { 
  DiscoveryOptions, 
  EnhancedMermaidFile, 
  EnhancedMermaidDiagram, 
  DiagramDiscoveryService,
  DiagramTypeAnalysis,
  DiagramValidation,
  DiagramComplexity,
  FileMetadata,
  ValidationError,
  ValidationWarning
} from '../types/batchExport';
import { ErrorHandler } from '../ui/errorHandler';

/**
 * Default discovery options for common use cases
 */
export const DEFAULT_DISCOVERY_OPTIONS: Partial<DiscoveryOptions> = {
  maxDepth: 5,
  includePatterns: ['*.md', '*.mmd', '*.markdown'],
  excludePatterns: ['node_modules/**', '.git/**', '*.min.*', '*.lock'],
  excludeDirectories: ['node_modules', '.git', '.vscode', 'dist', 'build', '.next', '.nuxt'],
  followSymlinks: false,
  caseSensitive: false
};

/**
 * Comprehensive diagram type detection patterns
 */
const DIAGRAM_TYPE_PATTERNS = {
  flowchart: [/^flowchart\s+(TD|TB|BT|RL|LR)/i, /^graph\s+(TD|TB|BT|RL|LR)/i],
  sequence: [/^sequenceDiagram/i, /participant\s+\w+/i, /\w+\s*->>?\s*\w+/],
  class: [/^classDiagram/i, /class\s+\w+/i, /\w+\s*:\s*\w+/i],
  state: [/^stateDiagram(-v2)?/i, /\[\*\]\s*-->/i, /state\s+\w+/i],
  er: [/^erDiagram/i, /\w+\s*\|\|--\|\|\s*\w+/i, /\w+\s*\{\s*\w+/i],
  journey: [/^journey/i, /title\s+.+/i, /section\s+.+/i],
  gantt: [/^gantt/i, /dateFormat\s+/i, /section\s+.+/i],
  pie: [/^pie\s+title/i, /^pie/i, /"\w+"\s*:\s*\d+/i],
  gitgraph: [/^gitgraph/i, /commit\s+id/i, /branch\s+\w+/i],
  mindmap: [/^mindmap/i, /root\s*\(/i, /^\s*\w+/i],
  timeline: [/^timeline/i, /title\s+Timeline/i],
  sankey: [/^sankey-beta/i],
  quadrant: [/^quadrant/i, /x-axis\s+/i, /y-axis\s+/i],
  requirement: [/^requirementDiagram/i, /requirement\s+\w+/i],
  c4context: [/^C4Context/i, /Person\(/i, /System\(/i],
  c4container: [/^C4Container/i, /Container\(/i],
  c4component: [/^C4Component/i, /Component\(/i],
  c4dynamic: [/^C4Dynamic/i, /Rel\(/i]
};

/**
 * Complexity scoring weights
 */
const COMPLEXITY_WEIGHTS = {
  nodeBase: 1,
  connectionBase: 1.5,
  depthMultiplier: 2,
  specialKeywords: {
    'subgraph': 3,
    'class': 2,
    'style': 1,
    'click': 1,
    'participant': 2
  }
};

/**
 * Implementation of comprehensive diagram discovery service
 */
export class DiagramDiscoveryServiceImpl implements DiagramDiscoveryService {
  private fileCache = new Map<string, EnhancedMermaidFile>();
  private analysisCache = new Map<string, DiagramComplexity>();

  /**
   * Discover all mermaid files in directory tree with advanced filtering
   */
  async discoverFiles(options: DiscoveryOptions): Promise<EnhancedMermaidFile[]> {
    const startTime = Date.now();
    const fullOptions = { ...DEFAULT_DISCOVERY_OPTIONS, ...options };
    const discoveredFiles: EnhancedMermaidFile[] = [];

    ErrorHandler.logInfo(`Starting file discovery in: ${options.rootDirectory}`);
    ErrorHandler.logInfo(`Discovery options: depth=${fullOptions.maxDepth}, patterns=${fullOptions.includePatterns?.join(',')}`);

    try {
      await this.scanDirectory(
        options.rootDirectory,
        fullOptions,
        0,
        discoveredFiles
      );

      const duration = Date.now() - startTime;
      ErrorHandler.logInfo(`Discovery completed: ${discoveredFiles.length} files found in ${duration}ms`);

      return discoveredFiles;
    } catch (error) {
      ErrorHandler.logError(`File discovery failed: ${error}`);
      throw error;
    }
  }

  /**
   * Analyze a single file comprehensively
   */
  async analyzeFile(filePath: string): Promise<EnhancedMermaidFile> {
    const startTime = Date.now();
    
    // Check cache first
    const cached = this.fileCache.get(filePath);
    if (cached) {
      return cached;
    }

    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      const diagrams = this.extractDiagrams(content, filePath);
      
      const metadata: FileMetadata = {
        processedAt: new Date(),
        processingTime: Date.now() - startTime,
        diagramCount: diagrams.length,
        encoding: this.detectEncoding(content),
        lineCount: content.split('\n').length,
        hasBOM: content.charCodeAt(0) === 0xFEFF
      };

      const enhancedFile: EnhancedMermaidFile = {
        path: path.resolve(filePath),
        relativePath,
        content,
        type: this.getFileType(filePath),
        size: stats.size,
        lastModified: stats.mtime,
        diagrams,
        metadata
      };

      // Cache the result
      this.fileCache.set(filePath, enhancedFile);
      
      ErrorHandler.logInfo(`Analyzed file: ${path.basename(filePath)} (${diagrams.length} diagrams, ${Date.now() - startTime}ms)`);
      return enhancedFile;

    } catch (error) {
      ErrorHandler.logError(`Failed to analyze file ${filePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Extract all mermaid diagrams from content with enhanced pattern matching
   */
  extractDiagrams(content: string, filePath: string): EnhancedMermaidDiagram[] {
    const diagrams: EnhancedMermaidDiagram[] = [];
    const fileType = this.getFileType(filePath);

    if (fileType === 'mmd') {
      // Pure mermaid file - entire content is one diagram
      const diagram = this.createEnhancedDiagram(
        content.trim(),
        0,
        content.split('\n').length - 1,
        filePath,
        0
      );
      diagrams.push(diagram);
    } else {
      // Markdown file - extract all mermaid code blocks
      const extractedDiagrams = this.extractMermaidFromMarkdown(content, filePath);
      diagrams.push(...extractedDiagrams);
    }

    return diagrams;
  }

  /**
   * Validate diagram syntax with comprehensive error reporting
   */
  async validateDiagram(diagram: EnhancedMermaidDiagram): Promise<DiagramValidation> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic syntax validation
      this.validateBasicSyntax(diagram.content, errors, warnings);
      
      // Type-specific validation
      this.validateTypeSpecificSyntax(diagram, errors, warnings);
      
      // Performance and best practices validation
      this.validateBestPractices(diagram, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        parser: 'mermaid-syntax-validator'
      };

    } catch (error) {
      errors.push({
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        code: 'VALIDATION_FAILED',
        suggestion: 'Check diagram syntax for common errors'
      });

      return {
        isValid: false,
        errors,
        warnings,
        parser: 'fallback-validator'
      };
    }
  }

  /**
   * Calculate diagram complexity metrics
   */
  calculateComplexity(diagram: EnhancedMermaidDiagram): DiagramComplexity {
    const cacheKey = this.generateCacheKey(diagram.content);
    const cached = this.analysisCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const content = diagram.content;
    const lines = content.split('\n');
    
    // Count nodes (approximate)
    const nodePatterns = [
      /\b\w+\[.*?\]/g,  // [text] nodes
      /\b\w+\(.*?\)/g,  // (text) nodes  
      /\b\w+\{.*?\}/g,  // {text} nodes
      /\b\w+>.*?]/g,    // >text] nodes
      /participant\s+\w+/gi, // sequence participants
      /class\s+\w+/gi   // class definitions
    ];
    
    let nodeCount = 0;
    for (const pattern of nodePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        nodeCount += matches.length;
      }
    }

    // Count connections
    const connectionPatterns = [
      /-->|---|==>/g,        // flowchart arrows
      /->>|->>/g,            // sequence arrows
      /\|\|--\|\||o\|--\|\|/g, // ER relationships
      /:\s*:/g               // class relationships
    ];
    
    let connectionCount = 0;
    for (const pattern of connectionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        connectionCount += matches.length;
      }
    }

    // Calculate nesting depth
    const depth = this.calculateNestingDepth(content);
    
    // Count special keywords
    let specialKeywordScore = 0;
    for (const [keyword, weight] of Object.entries(COMPLEXITY_WEIGHTS.specialKeywords)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        specialKeywordScore += matches.length * weight;
      }
    }

    // Calculate overall complexity score
    const rawScore = 
      (nodeCount * COMPLEXITY_WEIGHTS.nodeBase) +
      (connectionCount * COMPLEXITY_WEIGHTS.connectionBase) +
      (depth * COMPLEXITY_WEIGHTS.depthMultiplier) +
      specialKeywordScore;

    const normalizedScore = Math.min(10, Math.max(0, rawScore / 10));
    
    let category: DiagramComplexity['category'];
    if (normalizedScore <= 2) category = 'simple';
    else if (normalizedScore <= 5) category = 'moderate';
    else if (normalizedScore <= 8) category = 'complex';
    else category = 'very-complex';

    // Estimate render time based on complexity
    const baseRenderTime = 100; // ms
    const complexityMultiplier = 1 + (normalizedScore * 0.5);
    const estimatedRenderTime = Math.round(baseRenderTime * complexityMultiplier);

    const complexity: DiagramComplexity = {
      nodeCount,
      connectionCount,
      depth,
      score: Math.round(normalizedScore * 10) / 10,
      category,
      estimatedRenderTime
    };

    // Cache the result
    this.analysisCache.set(cacheKey, complexity);
    
    return complexity;
  }

  /**
   * Recursive directory scanning with advanced filtering
   */
  private async scanDirectory(
    directory: string,
    options: DiscoveryOptions,
    currentDepth: number,
    results: EnhancedMermaidFile[]
  ): Promise<void> {
    if (currentDepth >= (options.maxDepth || 5)) {
      return;
    }

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (this.shouldExcludeDirectory(entry.name, options)) {
            continue;
          }
          
          await this.scanDirectory(fullPath, options, currentDepth + 1, results);
          
        } else if (entry.isFile()) {
          // Check if file matches include patterns and doesn't match exclude patterns
          if (this.shouldIncludeFile(entry.name, options)) {
            try {
              const analyzedFile = await this.analyzeFile(fullPath);
              if (analyzedFile.diagrams.length > 0) {
                results.push(analyzedFile);
              }
            } catch (error) {
              ErrorHandler.logWarning(`Failed to analyze file ${fullPath}: ${error}`);
              // Continue processing other files
            }
          }
        }
      }
    } catch (error) {
      ErrorHandler.logWarning(`Failed to scan directory ${directory}: ${error}`);
      // Continue with other directories
    }
  }

  /**
   * Extract mermaid diagrams from markdown with enhanced pattern matching
   */
  private extractMermaidFromMarkdown(content: string, filePath: string): EnhancedMermaidDiagram[] {
    const diagrams: EnhancedMermaidDiagram[] = [];
    const lines = content.split('\n');
    
    let inMermaidBlock = false;
    let startLine = -1;
    let mermaidContent: string[] = [];
    let currentIndent = 0;
    let diagramIndex = 0;

    // Enhanced patterns for mermaid block detection
    const mermaidStartPatterns = [
      /^(\s*)```\s*mermaid\s*$/i,
      /^(\s*)```\s*Mermaid\s*$/i,  
      /^(\s*)```\s*MERMAID\s*$/i
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (!inMermaidBlock) {
        // Check for mermaid block start
        for (const pattern of mermaidStartPatterns) {
          const match = line.match(pattern);
          if (match) {
            inMermaidBlock = true;
            startLine = i;
            mermaidContent = [];
            currentIndent = match[1]?.length || 0;
            break;
          }
        }
      } else {
        // Check for block end
        const trimmedLine = line.trim();
        if (trimmedLine === '```' || (trimmedLine.startsWith('```') && trimmedLine.length > 3)) {
          inMermaidBlock = false;
          
          if (mermaidContent.length > 0) {
            const diagramContent = this.cleanDiagramContent(mermaidContent.join('\n'));
            if (diagramContent.trim()) {
              const diagram = this.createEnhancedDiagram(
                diagramContent,
                startLine + 1,
                i - 1,
                filePath,
                diagramIndex++
              );
              diagrams.push(diagram);
            }
          }
        } else if (inMermaidBlock) {
          // Add line to current diagram, preserving relative indentation
          const lineIndent = line.length - line.trimStart().length;
          const relativeIndent = Math.max(0, lineIndent - currentIndent);
          const adjustedLine = ' '.repeat(relativeIndent) + line.trimStart();
          mermaidContent.push(adjustedLine);
        }
      }
    }
    
    return diagrams;
  }

  /**
   * Create enhanced diagram with comprehensive analysis
   */
  private createEnhancedDiagram(
    content: string,
    startLine: number,
    endLine: number,
    filePath: string,
    index: number
  ): EnhancedMermaidDiagram {
    const id = this.generateDiagramId(content, filePath, index);
    const typeAnalysis = this.analyzeDiagramType(content);
    const complexity = this.calculateComplexity({ content } as EnhancedMermaidDiagram);
    
    return {
      id,
      content,
      startLine,
      endLine,
      type: typeAnalysis.primaryType,
      typeAnalysis,
      validation: { isValid: true, errors: [], warnings: [], parser: 'pending' },
      complexity
    };
  }

  /**
   * Analyze diagram type with confidence scoring
   */
  private analyzeDiagramType(content: string): DiagramTypeAnalysis {
    const firstLine = content.trim().split('\n')[0].trim();
    const fullContent = content.toLowerCase();
    
    const scores = new Map<string, number>();
    
    // Check each diagram type
    for (const [type, patterns] of Object.entries(DIAGRAM_TYPE_PATTERNS)) {
      let score = 0;
      
      for (const pattern of patterns) {
        if (pattern.test(firstLine)) {
          score += 10; // High weight for first line matches
        } else if (pattern.test(fullContent)) {
          score += 3; // Lower weight for content matches
        }
      }
      
      if (score > 0) {
        scores.set(type, score);
      }
    }

    // Sort by score
    const sortedTypes = Array.from(scores.entries())
      .sort(([,a], [,b]) => b - a);

    if (sortedTypes.length === 0) {
      return {
        primaryType: 'unknown',
        confidence: 0,
        alternatives: [],
        analysisMethod: 'heuristic'
      };
    }

    const [primaryType, primaryScore] = sortedTypes[0];
    const maxPossibleScore = 10;
    const confidence = Math.min(1, primaryScore / maxPossibleScore);
    
    const alternatives = sortedTypes.slice(1, 4).map(([type, score]) => ({
      type,
      confidence: Math.min(1, score / maxPossibleScore)
    }));

    return {
      primaryType,
      confidence,
      alternatives,
      analysisMethod: confidence > 0.7 ? 'keyword' : 'heuristic'
    };
  }

  /**
   * Utility methods for file filtering and validation
   */
  
  private shouldExcludeDirectory(dirName: string, options: DiscoveryOptions): boolean {
    const excludeDirs = options.excludeDirectories || DEFAULT_DISCOVERY_OPTIONS.excludeDirectories!;
    return excludeDirs.some(pattern => {
      if (options.caseSensitive) {
        return dirName === pattern || dirName.includes(pattern);
      } else {
        return dirName.toLowerCase() === pattern.toLowerCase() || 
               dirName.toLowerCase().includes(pattern.toLowerCase());
      }
    });
  }

  private shouldIncludeFile(fileName: string, options: DiscoveryOptions): boolean {
    const includePatterns = options.includePatterns || DEFAULT_DISCOVERY_OPTIONS.includePatterns!;
    const excludePatterns = options.excludePatterns || DEFAULT_DISCOVERY_OPTIONS.excludePatterns!;
    
    // Check include patterns
    const matchesInclude = includePatterns.some(pattern => this.matchesPattern(fileName, pattern, options.caseSensitive));
    if (!matchesInclude) return false;
    
    // Check exclude patterns
    const matchesExclude = excludePatterns.some(pattern => this.matchesPattern(fileName, pattern, options.caseSensitive));
    return !matchesExclude;
  }

  private matchesPattern(fileName: string, pattern: string, caseSensitive?: boolean): boolean {
    const name = caseSensitive ? fileName : fileName.toLowerCase();
    const pat = caseSensitive ? pattern : pattern.toLowerCase();
    
    // Simple glob pattern matching
    const regexPattern = pat
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
      
    return new RegExp(`^${regexPattern}$`).test(name);
  }

  private getFileType(filePath: string): 'mmd' | 'markdown' {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.mmd' ? 'mmd' : 'markdown';
  }

  private detectEncoding(content: string): string {
    // Simple encoding detection
    if (content.charCodeAt(0) === 0xFEFF) return 'utf8-bom';
    if (/^[\x00-\x7F]*$/.test(content)) return 'ascii';
    return 'utf8';
  }

  private cleanDiagramContent(content: string): string {
    return content
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .trim();
  }

  private calculateNestingDepth(content: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      
      // Count opening structures
      const openings = (trimmed.match(/subgraph|{|\[/g) || []).length;
      const closings = (trimmed.match(/end|}|\]/g) || []).length;
      
      currentDepth += openings - closings;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
    
    return maxDepth;
  }

  private generateDiagramId(content: string, filePath: string, index: number): string {
    const hash = crypto.createHash('sha256')
      .update(content + filePath + index)
      .digest('hex')
      .substring(0, 8);
    return `diagram_${hash}`;
  }

  private generateCacheKey(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Validation helper methods
   */
  
  private validateBasicSyntax(content: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;
      
      // Check for common syntax errors
      if (line.includes('-->') && line.includes('<--')) {
        errors.push({
          message: 'Bidirectional arrows are not supported in flowcharts',
          line: lineNum,
          severity: 'error',
          code: 'INVALID_ARROW',
          suggestion: 'Use separate unidirectional arrows'
        });
      }
      
      // Check for unclosed brackets
      const openBrackets = (line.match(/[\[\{]/g) || []).length;
      const closeBrackets = (line.match(/[\]\}]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        warnings.push({
          message: 'Unmatched brackets detected',
          line: lineNum,
          category: 'syntax',
          recommendation: 'Ensure all brackets are properly closed'
        });
      }
    }
  }

  private validateTypeSpecificSyntax(diagram: EnhancedMermaidDiagram, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const type = diagram.typeAnalysis.primaryType;
    const content = diagram.content;
    
    switch (type) {
      case 'flowchart':
        this.validateFlowchartSyntax(content, errors, warnings);
        break;
      case 'sequence':
        this.validateSequenceSyntax(content, errors, warnings);
        break;
      case 'class':
        this.validateClassSyntax(content, errors, warnings);
        break;
      // Add more type-specific validations as needed
    }
  }

  private validateFlowchartSyntax(content: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!content.match(/^(flowchart|graph)\s+(TD|TB|BT|LR|RL)/im)) {
      warnings.push({
        message: 'Flowchart direction not specified',
        category: 'style',
        recommendation: 'Add direction like "flowchart TD" for better clarity'
      });
    }
  }

  private validateSequenceSyntax(content: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!content.includes('participant') && content.includes('->')) {
      warnings.push({
        message: 'No participants defined in sequence diagram',
        category: 'style', 
        recommendation: 'Define participants explicitly for better readability'
      });
    }
  }

  private validateClassSyntax(content: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const classDefinitions = content.match(/class\s+\w+/gi) || [];
    if (classDefinitions.length === 0) {
      warnings.push({
        message: 'No class definitions found in class diagram',
        category: 'syntax',
        recommendation: 'Add class definitions using "class ClassName"'
      });
    }
  }

  private validateBestPractices(diagram: EnhancedMermaidDiagram, warnings: ValidationWarning[]): void {
    const content = diagram.content;
    const lineCount = content.split('\n').length;
    
    if (lineCount > 50) {
      warnings.push({
        message: 'Diagram is very long and may be hard to read',
        category: 'style',
        recommendation: 'Consider breaking into smaller diagrams or using subgraphs'
      });
    }
    
    if (diagram.complexity.score > 8) {
      warnings.push({
        message: 'Diagram complexity is very high',
        category: 'performance',
        recommendation: 'Consider simplifying or splitting the diagram for better performance'
      });
    }
  }
}

/**
 * Singleton instance for easy access
 */
export const diagramDiscoveryService = new DiagramDiscoveryServiceImpl();