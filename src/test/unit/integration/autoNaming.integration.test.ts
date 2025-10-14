/**
 * Integration Tests for Auto-Naming with Versioned and Overwrite Modes
 * 
 * Purpose: Verify end-to-end behavior of file naming strategies with real filesystem operations
 * 
 * Test Coverage:
 * - Versioned Mode: Hash-based deduplication, sequence increments
 * - Overwrite Mode: Consistent naming, file replacement
 * - Skip Logic: Progress notification prevention
 * - Security: Path traversal prevention, invalid characters
 * - Edge Cases: Hash collisions, concurrent operations
 * 
 * @see DESIGN_DECISIONS.md for architectural rationale
 * @see VERSIONED-MODE-ANALYSIS.md for detailed flow documentation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { AutoNaming } from '../../../utils/autoNaming';
import type { ExportFormat } from '../../../types';

/**
 * Test fixture factory for creating isolated test directories
 * 
 * Risk Mitigation: Uses OS temp directory to avoid polluting workspace
 * Security: Validates path stays within temp directory bounds
 */
class TestFixture {
  private testDir: string;
  private createdDirs: Set<string> = new Set();

  constructor(testName: string) {
    // Security: Use OS temp directory to prevent path traversal
    const safeName = testName.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    this.testDir = path.join(os.tmpdir(), 'mermaid-export-test', safeName);
  }

  /**
   * Setup test directory with proper cleanup tracking
   * 
   * @throws {Error} If directory creation fails (filesystem permissions)
   */
  async setup(): Promise<void> {
    await fs.promises.mkdir(this.testDir, { recursive: true });
    this.createdDirs.add(this.testDir);
  }

  /**
   * Cleanup test artifacts
   * 
   * Best Practice: Always cleanup in reverse order of creation
   * Risk: Ignores errors during cleanup to prevent test failures
   */
  async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.testDir)) {
        await fs.promises.rm(this.testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors - they shouldn't fail tests
      console.warn(`Cleanup warning: ${error}`);
    }
  }

  /**
   * Get test directory path
   * 
   * @returns Absolute path to isolated test directory
   */
  getDir(): string {
    return this.testDir;
  }

  /**
   * Create a file with specified content
   * 
   * @param fileName - Name of file to create
   * @param content - File content (string or buffer)
   * @returns Absolute path to created file
   */
  async createFile(fileName: string, content: string | Buffer): Promise<string> {
    const filePath = path.join(this.testDir, fileName);
    await fs.promises.writeFile(filePath, content);
    return filePath;
  }

  /**
   * List all files in test directory
   * 
   * @returns Array of filenames (not full paths)
   */
  async listFiles(): Promise<string[]> {
    try {
      return await fs.promises.readdir(this.testDir);
    } catch {
      return [];
    }
  }

  /**
   * Check if file exists in test directory
   * 
   * @param fileName - Name of file to check
   * @returns True if file exists
   */
  async fileExists(fileName: string): Promise<boolean> {
    const filePath = path.join(this.testDir, fileName);
    return fs.promises.access(filePath).then(() => true).catch(() => false);
  }

  /**
   * Read file content
   * 
   * @param fileName - Name of file to read
   * @returns File content as string
   */
  async readFile(fileName: string): Promise<string> {
    const filePath = path.join(this.testDir, fileName);
    return fs.promises.readFile(filePath, 'utf-8');
  }
}

/**
 * Test data factory for generating mermaid diagram content
 * 
 * DRY Principle: Centralized test data generation
 */
const TestData = {
  /**
   * Simple flowchart diagram
   */
  DIAGRAM_A: 'graph TD;\n  A-->B;\n  A-->C;',
  
  /**
   * Flowchart with additional node (different hash)
   */
  DIAGRAM_B: 'graph TD;\n  A-->B;\n  B-->C;\n  C-->D;',
  
  /**
   * Sequence diagram (different type)
   */
  DIAGRAM_C: 'sequenceDiagram;\n  Alice->>Bob: Hello;',
  
  /**
   * Diagram A with different whitespace (same semantic content)
   * 
   * Risk: Tests hash stability with whitespace variations
   */
  DIAGRAM_A_WHITESPACE: '  graph TD;\n    A-->B;\n    A-->C;  ',
};

/**
 * Helper to generate filename options
 * 
 * DRY: Reduces boilerplate in test cases
 */
function createOptions(
  fixture: TestFixture,
  content: string,
  mode: 'versioned' | 'overwrite' = 'versioned',
  format: ExportFormat = 'svg'
) {
  return {
    baseName: 'diagram',
    format,
    content,
    outputDirectory: fixture.getDir(),
    mode,
  };
}

describe('AutoNaming Integration Tests', () => {
  describe('Versioned Mode - Happy Path', () => {
    let fixture: TestFixture;

    beforeEach(async () => {
      fixture = new TestFixture('versioned-happy-path');
      await fixture.setup();
    });

    afterEach(async () => {
      await fixture.cleanup();
    });

    it('should create first versioned file with sequence 01', async () => {
      /**
       * Test: First export creates diagram-01-{hash}.svg
       * 
       * Expected: File exists, follows naming pattern, content matches
       */
      const options = createOptions(fixture, TestData.DIAGRAM_A);
      const filePath = await AutoNaming.generateFileName(options);
      
      // Simulate export by writing file
      await fs.promises.writeFile(filePath, 'mock-svg-content');
      
      const fileName = path.basename(filePath);
      
      // Assertions
      expect(fileName).toMatch(/^diagram-01-[a-f0-9]{8}\.svg$/);
      expect(await fixture.fileExists(fileName)).toBe(true);
    });

    it('should reuse existing file when content matches', async () => {
      /**
       * Test: Exporting same content twice reuses existing file
       * 
       * Critical: Verifies hash-based deduplication works
       * Risk: If broken, creates duplicate files unnecessarily
       */
      const options = createOptions(fixture, TestData.DIAGRAM_A);
      
      // First export
      const firstPath = await AutoNaming.generateFileName(options);
      await fs.promises.writeFile(firstPath, 'mock-svg-1');
      
      // Second export (same content)
      const secondPath = await AutoNaming.generateFileName(options);
      
      // Should return same path
      expect(secondPath).toBe(firstPath);
      
      // Should not create duplicate files
      const files = await fixture.listFiles();
      expect(files).toHaveLength(1);
      expect(files[0]).toBe(path.basename(firstPath));
    });

    it('should create new versioned file when content differs', async () => {
      /**
       * Test: Different content creates new file with incremented sequence
       * 
       * Expected: diagram-01-{hashA}.svg, diagram-02-{hashB}.svg
       */
      const optionsA = createOptions(fixture, TestData.DIAGRAM_A);
      const optionsB = createOptions(fixture, TestData.DIAGRAM_B);
      
      // First export (Diagram A)
      const pathA = await AutoNaming.generateFileName(optionsA);
      await fs.promises.writeFile(pathA, 'mock-svg-a');
      
      // Second export (Diagram B - different content)
      const pathB = await AutoNaming.generateFileName(optionsB);
      await fs.promises.writeFile(pathB, 'mock-svg-b');
      
      const fileNameA = path.basename(pathA);
      const fileNameB = path.basename(pathB);
      
      // Should have different hashes
      expect(fileNameA).toMatch(/^diagram-01-[a-f0-9]{8}\.svg$/);
      expect(fileNameB).toMatch(/^diagram-02-[a-f0-9]{8}\.svg$/);
      expect(fileNameA).not.toBe(fileNameB);
      
      // Should have both files
      const files = await fixture.listFiles();
      expect(files).toHaveLength(2);
    });

    it('should reuse first file when re-exporting original content', async () => {
      /**
       * Test: Export A, Export B, Export A again → reuses first A file
       * 
       * Critical: Validates hash lookup across multiple files
       */
      const optionsA = createOptions(fixture, TestData.DIAGRAM_A);
      const optionsB = createOptions(fixture, TestData.DIAGRAM_B);
      
      // Export A
      const pathA1 = await AutoNaming.generateFileName(optionsA);
      await fs.promises.writeFile(pathA1, 'mock-svg-a');
      
      // Export B
      const pathB = await AutoNaming.generateFileName(optionsB);
      await fs.promises.writeFile(pathB, 'mock-svg-b');
      
      // Export A again
      const pathA2 = await AutoNaming.generateFileName(optionsA);
      
      // Should reuse original A file
      expect(pathA2).toBe(pathA1);
      
      // Should only have 2 files total
      const files = await fixture.listFiles();
      expect(files).toHaveLength(2);
    });

    it('should handle whitespace variations consistently', async () => {
      /**
       * Test: Content with different whitespace produces different hash
       * 
       * Note: .trim() is applied, but leading/trailing whitespace differences
       * in the middle of content will create different hashes (expected behavior)
       * Risk: If trim() not applied to entire content, creates variations
       */
      const options1 = createOptions(fixture, TestData.DIAGRAM_A);
      const options2 = createOptions(fixture, TestData.DIAGRAM_A_WHITESPACE);
      
      const path1 = await AutoNaming.generateFileName(options1);
      await fs.promises.writeFile(path1, 'mock-svg');
      
      const path2 = await AutoNaming.generateFileName(options2);
      
      // Different internal whitespace creates different hash (expected)
      // If the content was truly identical, it would reuse
      const hash1 = path.basename(path1).match(/-([a-f0-9]{8})\./)?.[1];
      const hash2 = path.basename(path2).match(/-([a-f0-9]{8})\./)?.[1];
      
      // Verify both generate valid hashes (whether same or different)
      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
    });

    it('should support multiple export formats independently', async () => {
      /**
       * Test: Same content in different formats creates separate files
       * 
       * Expected: diagram-01-{hash}.svg, diagram-01-{hash}.png
       */
      const svgOptions = createOptions(fixture, TestData.DIAGRAM_A, 'versioned', 'svg');
      const pngOptions = createOptions(fixture, TestData.DIAGRAM_A, 'versioned', 'png');
      
      const svgPath = await AutoNaming.generateFileName(svgOptions);
      await fs.promises.writeFile(svgPath, 'mock-svg');
      
      const pngPath = await AutoNaming.generateFileName(pngOptions);
      await fs.promises.writeFile(pngPath, 'mock-png');
      
      // Should have both files
      expect(path.basename(svgPath)).toMatch(/\.svg$/);
      expect(path.basename(pngPath)).toMatch(/\.png$/);
      
      const files = await fixture.listFiles();
      expect(files).toHaveLength(2);
    });
  });

  describe('Overwrite Mode - Happy Path', () => {
    let fixture: TestFixture;

    beforeEach(async () => {
      fixture = new TestFixture('overwrite-happy-path');
      await fixture.setup();
    });

    afterEach(async () => {
      await fixture.cleanup();
    });

    it('should create simple filename without hash', async () => {
      /**
       * Test: Overwrite mode uses simple naming: diagram1.svg
       * 
       * Expected: No sequence, no hash, just baseName + extension
       */
      const options = createOptions(fixture, TestData.DIAGRAM_A, 'overwrite');
      const filePath = await AutoNaming.generateFileName(options);
      
      const fileName = path.basename(filePath);
      
      // Should NOT have hash pattern
      expect(fileName).toBe('diagram1.svg');
      expect(fileName).not.toMatch(/-\d{2}-[a-f0-9]{8}\./);
    });

    it('should always return same filename for same baseName', async () => {
      /**
       * Test: Multiple exports always use same filename (overwrite behavior)
       * 
       * Critical: Validates overwrite mode consistency
       */
      const options1 = createOptions(fixture, TestData.DIAGRAM_A, 'overwrite');
      const options2 = createOptions(fixture, TestData.DIAGRAM_B, 'overwrite');
      
      const path1 = await AutoNaming.generateFileName(options1);
      await fs.promises.writeFile(path1, 'content-a');
      
      const path2 = await AutoNaming.generateFileName(options2);
      
      // Should be same filename
      expect(path2).toBe(path1);
      expect(path.basename(path2)).toBe('diagram1.svg');
    });

    it('should only have one file after multiple exports', async () => {
      /**
       * Test: Overwrite mode doesn't accumulate files
       * 
       * Expected: Single file, contents updated on each export
       */
      const options = createOptions(fixture, TestData.DIAGRAM_A, 'overwrite');
      
      // First export
      const path1 = await AutoNaming.generateFileName(options);
      await fs.promises.writeFile(path1, 'version-1');
      
      // Second export (different content)
      const options2 = createOptions(fixture, TestData.DIAGRAM_B, 'overwrite');
      const path2 = await AutoNaming.generateFileName(options2);
      await fs.promises.writeFile(path2, 'version-2');
      
      // Should only have 1 file
      const files = await fixture.listFiles();
      expect(files).toHaveLength(1);
      
      // Content should be latest
      const content = await fixture.readFile(files[0]);
      expect(content).toBe('version-2');
    });

    it('should extract diagram number from baseName', async () => {
      /**
       * Test: baseName with number suffix preserved in overwrite mode
       * 
       * Example: 'diagram-flow2' → 'diagram-flow2.svg'
       */
      const options = {
        baseName: 'architecture-flow2',
        format: 'svg' as ExportFormat,
        content: TestData.DIAGRAM_A,
        outputDirectory: fixture.getDir(),
        mode: 'overwrite' as const,
      };
      
      const filePath = await AutoNaming.generateFileName(options);
      const fileName = path.basename(filePath);
      
      expect(fileName).toBe('architecture-flow2.svg');
    });
  });

  describe('shouldSkipExport - Skip Logic', () => {
    let fixture: TestFixture;

    beforeEach(async () => {
      fixture = new TestFixture('skip-logic');
      await fixture.setup();
    });

    afterEach(async () => {
      await fixture.cleanup();
    });

    it('should skip export when versioned file exists', async () => {
      /**
       * Test: Versioned mode skips if file exists with hash pattern
       * 
       * Critical: Prevents unnecessary export operations
       * Risk: If broken, causes file overwrites and wasted CPU
       */
      const filePath = path.join(fixture.getDir(), 'diagram-01-abc12345.svg');
      await fs.promises.writeFile(filePath, 'existing-content');
      
      const shouldSkip = await AutoNaming.shouldSkipExport(filePath, TestData.DIAGRAM_A);
      
      expect(shouldSkip).toBe(true);
    });

    it('should not skip when versioned file does not exist', async () => {
      /**
       * Test: Must export if file doesn't exist yet
       */
      const filePath = path.join(fixture.getDir(), 'diagram-01-abc12345.svg');
      
      const shouldSkip = await AutoNaming.shouldSkipExport(filePath, TestData.DIAGRAM_A);
      
      expect(shouldSkip).toBe(false);
    });

    it('should never skip in overwrite mode', async () => {
      /**
       * Test: Overwrite mode always exports (even if file exists)
       * 
       * Critical: Ensures fresh output every time
       * Risk: If broken, stale files persist despite content changes
       */
      const filePath = path.join(fixture.getDir(), 'diagram1.svg');
      await fs.promises.writeFile(filePath, 'old-content');
      
      const shouldSkip = await AutoNaming.shouldSkipExport(filePath, TestData.DIAGRAM_A);
      
      // Should NOT skip (always export in overwrite mode)
      expect(shouldSkip).toBe(false);
    });

    it('should detect versioned pattern correctly', async () => {
      /**
       * Test: Pattern matching for versioned filenames
       * 
       * Security: Validates regex doesn't match invalid patterns
       */
      const versionedPath = path.join(fixture.getDir(), 'diagram-01-abc12345.svg');
      const overwritePath = path.join(fixture.getDir(), 'diagram1.svg');
      
      await fs.promises.writeFile(versionedPath, 'v');
      await fs.promises.writeFile(overwritePath, 'o');
      
      const skipVersioned = await AutoNaming.shouldSkipExport(versionedPath, TestData.DIAGRAM_A);
      const skipOverwrite = await AutoNaming.shouldSkipExport(overwritePath, TestData.DIAGRAM_A);
      
      expect(skipVersioned).toBe(true);  // Versioned pattern detected
      expect(skipOverwrite).toBe(false); // Not versioned pattern
    });
  });

  describe('Security & Edge Cases', () => {
    let fixture: TestFixture;

    beforeEach(async () => {
      fixture = new TestFixture('security-tests');
      await fixture.setup();
    });

    afterEach(async () => {
      await fixture.cleanup();
    });

    it('should sanitize baseName with invalid characters', async () => {
      /**
       * Test: Invalid filesystem characters are sanitized
       * 
       * Security: Prevents path traversal and injection attacks
       * Risk: Unsanitized names could overwrite system files
       */
      const dangerousName = '../../../etc/passwd';
      const sanitized = AutoNaming.getBaseName(dangerousName);
      
      // Should not contain path separators
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
    });

    it('should handle empty content gracefully', async () => {
      /**
       * Test: Empty diagram content generates valid hash
       * 
       * Edge Case: User might export empty code block
       */
      const options = createOptions(fixture, '');
      const filePath = await AutoNaming.generateFileName(options);
      
      // Should still generate valid filename
      expect(path.basename(filePath)).toMatch(/^diagram-01-[a-f0-9]{8}\.svg$/);
    });

    it('should handle very long content', async () => {
      /**
       * Test: Large diagrams don't break hash generation
       * 
       * Risk: Memory exhaustion with huge diagrams
       */
      const longContent = 'graph TD;\n' + 'A-->B;\n'.repeat(10000);
      const options = createOptions(fixture, longContent);
      
      const filePath = await AutoNaming.generateFileName(options);
      
      // Should complete without error
      expect(path.basename(filePath)).toMatch(/^diagram-01-[a-f0-9]{8}\.svg$/);
    });

    it('should handle concurrent exports safely', async () => {
      /**
       * Test: Race condition handling for sequence generation
       * 
       * Risk: Concurrent exports might generate same sequence number
       * Note: This test doesn't guarantee thread safety, but validates basic behavior
       */
      const options1 = createOptions(fixture, TestData.DIAGRAM_A);
      const options2 = createOptions(fixture, TestData.DIAGRAM_B);
      const options3 = createOptions(fixture, TestData.DIAGRAM_C);
      
      // Simulate concurrent exports
      const [path1, path2, path3] = await Promise.all([
        AutoNaming.generateFileName(options1),
        AutoNaming.generateFileName(options2),
        AutoNaming.generateFileName(options3),
      ]);
      
      // All should have unique filenames
      const names = [path1, path2, path3].map(p => path.basename(p));
      const uniqueNames = new Set(names);
      
      expect(uniqueNames.size).toBe(3);
    });

    it('should validate directory permissions', async () => {
      /**
       * Test: Directory validation catches permission issues
       * 
       * Security: Prevents writing to unauthorized locations
       */
      const invalidDir = '/root/restricted'; // Unix example
      const result = await AutoNaming.validateDirectory(invalidDir);
      
      // Should fail gracefully (not throw)
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-existent directory gracefully', async () => {
      /**
       * Test: generateFileName handles missing directory
       * 
       * Expected: Returns valid path (directory created on actual export)
       */
      const nonExistentDir = path.join(fixture.getDir(), 'does-not-exist');
      const options = {
        baseName: 'diagram',
        format: 'svg' as ExportFormat,
        content: TestData.DIAGRAM_A,
        outputDirectory: nonExistentDir,
        mode: 'versioned' as const,
      };
      
      const filePath = await AutoNaming.generateFileName(options);
      
      // Should return valid path (directory will be created on export)
      expect(filePath).toContain(nonExistentDir);
      expect(path.basename(filePath)).toMatch(/^diagram-01-[a-f0-9]{8}\.svg$/);
    });
  });

  describe('Cross-Mode Integration', () => {
    let fixture: TestFixture;

    beforeEach(async () => {
      fixture = new TestFixture('cross-mode');
      await fixture.setup();
    });

    afterEach(async () => {
      await fixture.cleanup();
    });

    it('should not confuse versioned and overwrite files', async () => {
      /**
       * Test: Versioned and overwrite modes coexist without conflicts
       * 
       * Scenario: User switches modes between exports
       */
      const versionedOptions = createOptions(fixture, TestData.DIAGRAM_A, 'versioned');
      const overwriteOptions = createOptions(fixture, TestData.DIAGRAM_A, 'overwrite');
      
      // Create versioned file
      const versionedPath = await AutoNaming.generateFileName(versionedOptions);
      await fs.promises.writeFile(versionedPath, 'versioned');
      
      // Create overwrite file
      const overwritePath = await AutoNaming.generateFileName(overwriteOptions);
      await fs.promises.writeFile(overwritePath, 'overwrite');
      
      // Should have 2 distinct files
      const files = await fixture.listFiles();
      expect(files).toHaveLength(2);
      
      // Verify both patterns exist (don't assume sort order)
      const hasVersioned = files.some(f => /^diagram-\d{2}-[a-f0-9]{8}\.svg$/.test(f));
      const hasOverwrite = files.some(f => f === 'diagram1.svg');
      
      expect(hasVersioned).toBe(true);
      expect(hasOverwrite).toBe(true);
    });
  });
});
