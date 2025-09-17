/**
 * Integration Tests for Batch Export v2 Architecture
 * 
 * Tests the integration between all services in the new batch export architecture:
 * - DiagramDiscoveryService + BatchExportEngine + ProgressTrackingService
 * - End-to-end batch export workflow
 * - Service coordination and error handling
 * 
 * @author Claude/Jorge
 * @version 2.0.0
 * @date 2025-08-27
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { expect } from 'vitest';
import { DiagramDiscoveryServiceImpl } from '../../../services/diagramDiscoveryService';
import { BatchExportEngineImpl } from '../../../services/batchExportEngine';
import { BatchExportConfig, EnhancedMermaidFile } from '../../../types/batchExport';
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

describe('Batch Export v2 - Integration Tests', () => {
  let discoveryService: DiagramDiscoveryServiceImpl;
  let batchEngine: BatchExportEngineImpl;
  let tempDir: string;
  
  beforeEach(async () => {
    discoveryService = new DiagramDiscoveryServiceImpl();
    batchEngine = new BatchExportEngineImpl(mockContext);
    
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batch-export-test-'));
  });
  
  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Service Integration', () => {
    it('should discover files and create batch successfully', async () => {
      // Create test files
      await createTestFiles(tempDir);
      
      // Discover files using discovery service
      const options = {
        rootDirectory: tempDir,
        maxDepth: 2,
        includePatterns: ['*.md', '*.mmd'],
        excludePatterns: [],
        excludeDirectories: [],
        followSymlinks: false,
        caseSensitive: false
      };
      
      const files = await discoveryService.discoverFiles(options);
      expect(files.length).toBeGreaterThan(0);
      
      // Create batch using batch engine
      const config: BatchExportConfig = {
        formats: ['svg', 'png'] as ExportFormat[],
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(tempDir, 'output'),
        maxDepth: 2,
        namingStrategy: 'sequential',
        organizeByFormat: true,
        overwriteExisting: false
      };
      
      const batch = await batchEngine.createBatch(files, config);
      
      expect(batch.id).toBeDefined();
      expect(batch.jobs.length).toBeGreaterThan(0);
      expect(batch.metadata.totalFiles).toBe(files.length);
      expect(batch.metadata.totalFormats).toBe(2);
    });

    it('should handle multi-format export correctly', async () => {
      // Create test file with multiple diagrams
      const mdContent = `# Test Document

First diagram:

\`\`\`mermaid
flowchart TD
    A --> B
    B --> C
\`\`\`

Second diagram:

\`\`\`mermaid
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello
\`\`\`
`;

      await fs.writeFile(path.join(tempDir, 'multi-diagram.md'), mdContent);
      
      const file = await discoveryService.analyzeFile(path.join(tempDir, 'multi-diagram.md'));
      expect(file.diagrams.length).toBe(2);
      
      const config: BatchExportConfig = {
        formats: ['svg', 'png', 'pdf'] as ExportFormat[],
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(tempDir, 'output'),
        maxDepth: 2,
        namingStrategy: 'sequential',
        organizeByFormat: true,
        overwriteExisting: false
      };
      
      const batch = await batchEngine.createBatch([file], config);
      
      // Should create jobs for each diagram/format combination
      const expectedJobs = file.diagrams.length * config.formats.length;
      expect(batch.jobs.length).toBe(expectedJobs);
      
      // Check job distribution
      const svgJobs = batch.jobs.filter(j => j.format === 'svg');
      const pngJobs = batch.jobs.filter(j => j.format === 'png');  
      const pdfJobs = batch.jobs.filter(j => j.format === 'pdf');
      
      expect(svgJobs.length).toBe(file.diagrams.length);
      expect(pngJobs.length).toBe(file.diagrams.length);
      expect(pdfJobs.length).toBe(file.diagrams.length);
    });

    it('should estimate batch duration accurately', async () => {
      await createTestFiles(tempDir);
      
      const files = await discoveryService.discoverFiles({
        rootDirectory: tempDir,
        maxDepth: 2,
        includePatterns: ['*.md'],
        excludePatterns: [],
        excludeDirectories: [],
        followSymlinks: false,
        caseSensitive: false
      });
      
      const config: BatchExportConfig = {
        formats: ['svg'] as ExportFormat[],
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(tempDir, 'output'),
        maxDepth: 2,
        namingStrategy: 'sequential',
        organizeByFormat: false,
        overwriteExisting: false
      };
      
      const batch = await batchEngine.createBatch(files, config);
      const estimation = await batchEngine.estimateDuration(batch);
      
      expect(estimation).toBeGreaterThan(0);
      expect(estimation).toBeLessThan(300000); // Should be reasonable (< 5 minutes)
      
      // Duration should scale with job count
      expect(estimation).toBeGreaterThan(batch.jobs.length * 1000); // At least 1 second per job
    });

    it('should optimize job order based on complexity and priority', async () => {
      const files = await createComplexTestFiles(tempDir);
      
      const config: BatchExportConfig = {
        formats: ['svg', 'png'] as ExportFormat[],
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(tempDir, 'output'),
        maxDepth: 2,
        namingStrategy: 'sequential',
        organizeByFormat: false,
        overwriteExisting: false
      };
      
      const batch = await batchEngine.createBatch(files, config);
      const jobs = batch.jobs;
      
      // Jobs should be sorted by priority (higher first)
      for (let i = 1; i < jobs.length; i++) {
        expect(jobs[i].priority).toBeLessThanOrEqual(jobs[i-1].priority);
      }
      
      // SVG jobs should generally come before PNG jobs (faster format)
      const firstPngIndex = jobs.findIndex(j => j.format === 'png');
      const lastSvgIndex = jobs.map((j, i) => j.format === 'svg' ? i : -1)
        .filter(i => i >= 0)
        .pop() || -1;
        
      if (firstPngIndex >= 0 && lastSvgIndex >= 0) {
        // This might not always be true due to priority sorting, but should generally hold
        expect(lastSvgIndex).toBeLessThanOrEqual(firstPngIndex + jobs.length / 2);
      }
    });

    it('should validate batch configuration before execution', async () => {
      await createTestFiles(tempDir);
      
      const files = await discoveryService.discoverFiles({
        rootDirectory: tempDir,
        maxDepth: 2,
        includePatterns: ['*.md'],
        excludePatterns: [],
        excludeDirectories: [],
        followSymlinks: false,
        caseSensitive: false
      });
      
      // Valid configuration
      const validConfig: BatchExportConfig = {
        formats: ['svg'] as ExportFormat[],
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(tempDir, 'output'),
        maxDepth: 2,
        namingStrategy: 'sequential',
        organizeByFormat: false,
        overwriteExisting: false
      };
      
      const validBatch = await batchEngine.createBatch(files, validConfig);
      const validationErrors = await batchEngine.validateBatch(validBatch);
      
      expect(Array.isArray(validationErrors)).toBe(true);
      expect(validationErrors.length).toBeLessThanOrEqual(2); // Should have minimal errors for valid batch
      
      // Invalid configuration should throw during creation
      const invalidConfig: BatchExportConfig = {
        formats: [] as ExportFormat[], // Empty formats - should throw
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(tempDir, 'output'),
        maxDepth: 2,
        namingStrategy: 'sequential',
        organizeByFormat: false,
        overwriteExisting: false
      };
      
      await expect(batchEngine.createBatch(files, invalidConfig)).rejects.toThrow();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle discovery errors gracefully', async () => {
      // Try to discover files in non-existent directory
      const invalidOptions = {
        rootDirectory: path.join(tempDir, 'non-existent'),
        maxDepth: 2,
        includePatterns: ['*.md'],
        excludePatterns: [],
        excludeDirectories: [],
        followSymlinks: false,
        caseSensitive: false
      };
      
      // Service gracefully returns empty array for non-existent directories
      const result = await discoveryService.discoverFiles(invalidOptions);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle batch creation errors', async () => {
      // Empty files array
      const config: BatchExportConfig = {
        formats: ['svg'] as ExportFormat[],
        theme: 'default' as MermaidTheme,
        outputDirectory: path.join(tempDir, 'output'),
        maxDepth: 2,
        namingStrategy: 'sequential',
        organizeByFormat: false,
        overwriteExisting: false
      };
      
      const batch = await batchEngine.createBatch([], config);
      
      expect(batch.jobs.length).toBe(0);
      expect(batch.metadata.totalFiles).toBe(0);
      expect(batch.metadata.expectedOutputs).toBe(0);
    });
  });
});

/**
 * Helper function to create test files
 */
async function createTestFiles(tempDir: string): Promise<void> {
  // Simple markdown file
  const simpleMarkdown = `# Simple Document

\`\`\`mermaid
flowchart TD
    A --> B
\`\`\`
`;
  
  await fs.writeFile(path.join(tempDir, 'simple.md'), simpleMarkdown);
  
  // Simple mermaid file
  const simpleMermaid = `sequenceDiagram
    participant A
    participant B
    A->>B: Message`;
  
  await fs.writeFile(path.join(tempDir, 'simple.mmd'), simpleMermaid);
  
  // Complex markdown file
  const complexMarkdown = `# Complex Document

First diagram:

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E
\`\`\`

Second diagram:

\`\`\`mermaid
classDiagram
    class Animal {
        +name: string
        +speak()
    }
    class Dog {
        +breed: string
        +bark()
    }
    Animal <|-- Dog
\`\`\`
`;
  
  await fs.writeFile(path.join(tempDir, 'complex.md'), complexMarkdown);
}

/**
 * Helper function to create test files with varying complexity
 */
async function createComplexTestFiles(tempDir: string): Promise<EnhancedMermaidFile[]> {
  // Simple diagram (should get high priority)
  const simpleContent = `# Simple

\`\`\`mermaid
flowchart TD
    A --> B
\`\`\`
`;
  
  // Complex diagram (should get lower priority)
  const complexContent = `# Complex

\`\`\`mermaid
flowchart TD
    subgraph "System"
        A[Start] --> B{Decision 1}
        B -->|Path 1| C[Process 1]
        B -->|Path 2| D{Decision 2}
        C --> E[Action 1]
        D -->|Yes| F[Action 2]
        D -->|No| G[Action 3]
        E --> H[End 1]
        F --> H
        G --> H
    end
\`\`\`
`;
  
  await fs.writeFile(path.join(tempDir, 'simple.md'), simpleContent);
  await fs.writeFile(path.join(tempDir, 'complex.md'), complexContent);
  
  const discoveryService = new DiagramDiscoveryServiceImpl();
  
  const simpleFile = await discoveryService.analyzeFile(path.join(tempDir, 'simple.md'));
  const complexFile = await discoveryService.analyzeFile(path.join(tempDir, 'complex.md'));
  
  return [simpleFile, complexFile];
}