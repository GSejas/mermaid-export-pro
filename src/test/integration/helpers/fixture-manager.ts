/**
 * E2E Test Fixture Manager
 *
 * Creates and manages test workspaces, files, and diagrams for E2E testing.
 * Provides cleanup utilities to ensure test isolation.
 *
 * @author Claude/Jorge
 * @version 1.0.0
 * @date 2025-10-10
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface DiagramFixture {
  filename: string;
  content: string;
  type: 'mmd' | 'md';
  isValid: boolean;
}

export class FixtureManager {
  private tempDirs: string[] = [];

  /**
   * Create a temporary test workspace with mermaid diagrams
   */
  async createTestWorkspace(name: string, diagrams: DiagramFixture[]): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `mermaid-e2e-${name}-`));
    this.tempDirs.push(tempDir);

    for (const diagram of diagrams) {
      const filePath = path.join(tempDir, diagram.filename);
      await fs.writeFile(filePath, diagram.content, 'utf-8');
    }

    return tempDir;
  }

  /**
   * Create a nested folder structure for testing recursive batch export
   */
  async createNestedWorkspace(name: string, depth: number): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `mermaid-nested-${name}-`));
    this.tempDirs.push(tempDir);

    let currentDir = tempDir;
    for (let i = 0; i < depth; i++) {
      currentDir = path.join(currentDir, `level-${i}`);
      await fs.mkdir(currentDir, { recursive: true });

      // Add a diagram at each level
      const diagram = this.createSimpleFlowchart(`Diagram at level ${i}`);
      await fs.writeFile(
        path.join(currentDir, `diagram-level-${i}.mmd`),
        diagram,
        'utf-8'
      );
    }

    return tempDir;
  }

  /**
   * Create a simple mermaid file
   */
  async createMermaidFile(directory: string, filename: string, content: string): Promise<string> {
    const filePath = path.join(directory, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Create a markdown file with embedded mermaid diagrams
   */
  async createMarkdownFile(
    directory: string,
    filename: string,
    diagrams: string[]
  ): Promise<string> {
    const sections = diagrams.map((diagram, index) => {
      return `## Diagram ${index + 1}\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`;
    });

    const content = `# Test Document\n\n${sections.join('\n')}`;
    const filePath = path.join(directory, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Create a simple flowchart diagram
   */
  createSimpleFlowchart(title: string = 'Simple Flow'): string {
    return `flowchart TD
    A[${title}] --> B{Decision}
    B -->|Yes| C[Success]
    B -->|No| D[Failure]`;
  }

  /**
   * Create a sequence diagram
   */
  createSequenceDiagram(): string {
    return `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob!
    Bob-->>Alice: Hi Alice!`;
  }

  /**
   * Create a class diagram
   */
  createClassDiagram(): string {
    return `classDiagram
    class Animal {
        +name: string
        +age: int
        +speak()
    }
    class Dog {
        +breed: string
        +bark()
    }
    Animal <|-- Dog`;
  }

  /**
   * Create an invalid mermaid diagram (for error testing)
   */
  createInvalidDiagram(): string {
    return `flowchart TD
    A[Start --> BROKEN SYNTAX
    B{Missing closing bracket`;
  }

  /**
   * Create a complex diagram with many nodes (for performance testing)
   */
  createComplexDiagram(nodeCount: number = 100): string {
    const nodes: string[] = [];
    for (let i = 0; i < nodeCount; i++) {
      if (i === 0) {
        nodes.push(`    A0[Node 0] --> A1[Node 1]`);
      } else if (i < nodeCount - 1) {
        nodes.push(`    A${i}[Node ${i}] --> A${i + 1}[Node ${i + 1}]`);
      }
    }
    return `flowchart TD\n${nodes.join('\n')}`;
  }

  /**
   * Verify a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Count files in a directory matching a pattern
   */
  async countFiles(directory: string, extension: string): Promise<number> {
    try {
      const files = await fs.readdir(directory);
      return files.filter(f => f.endsWith(extension)).length;
    } catch {
      return 0;
    }
  }

  /**
   * Get all files in a directory (recursive)
   */
  async getAllFiles(directory: string, extension?: string): Promise<string[]> {
    const results: string[] = [];

    async function scan(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (!extension || entry.name.endsWith(extension)) {
          results.push(fullPath);
        }
      }
    }

    try {
      await scan(directory);
    } catch {
      // Directory doesn't exist or not accessible
    }

    return results;
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * Clean up all temporary directories
   */
  async cleanup(): Promise<void> {
    for (const dir of this.tempDirs) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch (err) {
        // Ignore cleanup errors
        console.warn(`Failed to clean up ${dir}:`, err);
      }
    }
    this.tempDirs = [];
  }

  /**
   * Clean up a specific directory
   */
  async cleanupDirectory(directory: string): Promise<void> {
    try {
      await fs.rm(directory, { recursive: true, force: true });
      this.tempDirs = this.tempDirs.filter(d => d !== directory);
    } catch (err) {
      console.warn(`Failed to clean up ${directory}:`, err);
    }
  }
}
