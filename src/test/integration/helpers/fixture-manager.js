"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixtureManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class FixtureManager {
    tempDirs = [];
    /**
     * Create a temporary test workspace with mermaid diagrams
     */
    async createTestWorkspace(name, diagrams) {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `mermaid-e2e-${name}-`));
        this.tempDirs.push(tempDir);
        for (const diagram of diagrams) {
            const filePath = path.join(tempDir, diagram.filename);
            await fs.writeFile(filePath, diagram.content, 'utf-8');
        }
        return tempDir;
    }
    /**
     * Create a nested folder structure for testing recursive export folder
     */
    async createNestedWorkspace(name, depth) {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `mermaid-nested-${name}-`));
        this.tempDirs.push(tempDir);
        let currentDir = tempDir;
        for (let i = 0; i < depth; i++) {
            currentDir = path.join(currentDir, `level-${i}`);
            await fs.mkdir(currentDir, { recursive: true });
            // Add a diagram at each level
            const diagram = this.createSimpleFlowchart(`Diagram at level ${i}`);
            await fs.writeFile(path.join(currentDir, `diagram-level-${i}.mmd`), diagram, 'utf-8');
        }
        return tempDir;
    }
    /**
     * Create a simple mermaid file
     */
    async createMermaidFile(directory, filename, content) {
        const filePath = path.join(directory, filename);
        await fs.writeFile(filePath, content, 'utf-8');
        return filePath;
    }
    /**
     * Create a markdown file with embedded mermaid diagrams
     */
    async createMarkdownFile(directory, filename, diagrams) {
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
    createSimpleFlowchart(title = 'Simple Flow') {
        return `flowchart TD
    A[${title}] --> B{Decision}
    B -->|Yes| C[Success]
    B -->|No| D[Failure]`;
    }
    /**
     * Create a sequence diagram
     */
    createSequenceDiagram() {
        return `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob!
    Bob-->>Alice: Hi Alice!`;
    }
    /**
     * Create a class diagram
     */
    createClassDiagram() {
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
    createInvalidDiagram() {
        return `flowchart TD
    A[Start --> BROKEN SYNTAX
    B{Missing closing bracket`;
    }
    /**
     * Create a complex diagram with many nodes (for performance testing)
     */
    createComplexDiagram(nodeCount = 100) {
        const nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            if (i === 0) {
                nodes.push(`    A0[Node 0] --> A1[Node 1]`);
            }
            else if (i < nodeCount - 1) {
                nodes.push(`    A${i}[Node ${i}] --> A${i + 1}[Node ${i + 1}]`);
            }
        }
        return `flowchart TD\n${nodes.join('\n')}`;
    }
    /**
     * Verify a file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Count files in a directory matching a pattern
     */
    async countFiles(directory, extension) {
        try {
            const files = await fs.readdir(directory);
            return files.filter(f => f.endsWith(extension)).length;
        }
        catch {
            return 0;
        }
    }
    /**
     * Get all files in a directory (recursive)
     */
    async getAllFiles(directory, extension) {
        const results = [];
        async function scan(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await scan(fullPath);
                }
                else if (!extension || entry.name.endsWith(extension)) {
                    results.push(fullPath);
                }
            }
        }
        try {
            await scan(directory);
        }
        catch {
            // Directory doesn't exist or not accessible
        }
        return results;
    }
    /**
     * Read file content
     */
    async readFile(filePath) {
        return await fs.readFile(filePath, 'utf-8');
    }
    /**
     * Clean up all temporary directories
     */
    async cleanup() {
        for (const dir of this.tempDirs) {
            try {
                await fs.rm(dir, { recursive: true, force: true });
            }
            catch (err) {
                // Ignore cleanup errors
                console.warn(`Failed to clean up ${dir}:`, err);
            }
        }
        this.tempDirs = [];
    }
    /**
     * Clean up a specific directory
     */
    async cleanupDirectory(directory) {
        try {
            await fs.rm(directory, { recursive: true, force: true });
            this.tempDirs = this.tempDirs.filter(d => d !== directory);
        }
        catch (err) {
            console.warn(`Failed to clean up ${directory}:`, err);
        }
    }
}
exports.FixtureManager = FixtureManager;
//# sourceMappingURL=fixture-manager.js.map