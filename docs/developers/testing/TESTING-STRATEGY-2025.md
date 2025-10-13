# VS Code Extension Testing Strategy 2025 - Mermaid Export Pro

## Overview

This document outlines the comprehensive testing strategy for Mermaid Export Pro, following 2025 best practices for VS Code extension development. Our testing approach combines unit tests, integration tests, and E2E testing with modern tooling and CI/CD integration.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Testing Framework Comparison](#testing-framework-comparison)
- [Test Architecture](#test-architecture)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Mocking Strategy](#mocking-strategy)
- [CI/CD Pipeline](#cicd-pipeline)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)

## Tech Stack

### Current Stack (2025 Recommended)

- **Unit Testing Framework**: Vitest (preferred for TypeScript, speed, built-in mocking)
- **Test Runner**: Vitest with watch mode and snapshot support
- **VS Code Test Helpers**: `@vscode/test-electron` for desktop integration tests
- **Mocking**: Vitest's built-in mocking + Sinon for complex scenarios
- **E2E Tools**: Playwright for webview automation and screenshot testing
- **Coverage**: c8 with Vitest for LCOV/HTML reports

### Package.json Test Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:unit": "vitest run src/test/unit",
    "test:integration": "vscode-test --extensionDevelopmentPath=. --extensionTestsPath=./out/test/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

## Testing Framework Comparison

| Framework  | TypeScript Support | Speed         | Mocking          | Watch Mode | Our Rating | Use Case |
|------------|-------------------|---------------|------------------|------------|------------|----------|
| **Vitest** | First-class, ESM | Fast (Vite)   | Built-in, modern | Yes        | ⭐⭐⭐⭐⭐    | Primary choice for units |
| **Jest**   | Good, JS-first   | Medium        | Built-in         | Yes        | ⭐⭐⭐⭐      | Legacy compatibility |
| **Mocha**  | Requires setup   | Fast (bare)   | Sinon/3rd party  | Yes        | ⭐⭐⭐       | Not recommended |

**Decision**: We use **Vitest** for modern TS/ESM setup, speed, and excellent developer experience.

## Test Architecture

### Directory Structure

```
src/test/
├── unit/                          # Unit tests (isolated component testing)
│   ├── services/                  # Service layer tests
│   │   ├── diagramDiscoveryService.test.ts
│   │   ├── batchExportEngine.test.ts
│   │   ├── progressTrackingService.test.ts
│   │   └── errorHandlingService.test.ts
│   ├── commands/                  # Command tests with mocked dependencies
│   │   ├── batchExportCommand.test.ts
│   │   └── exportAllCommand.test.ts
│   ├── strategies/                # Export strategy tests
│   │   ├── cliExportStrategy.test.ts
│   │   └── webExportStrategy.test.ts
│   └── utils/                     # Utility function tests
│       └── pathUtils.test.ts
├── integration/                   # Integration tests with VS Code API
│   ├── fullBatchExport.test.ts    # End-to-end export folder flow
│   ├── commandRegistration.test.ts
│   └── extensionActivation.test.ts
├── e2e/                          # End-to-end tests with Playwright
│   ├── webview.test.ts           # Webview rendering tests
│   ├── userFlows.test.ts         # Complete user workflows
│   └── visual.test.ts            # Visual regression tests
├── fixtures/                     # Test data and fixtures
│   ├── sample-diagrams/
│   │   ├── simple.mmd
│   │   ├── complex.md
│   │   └── multi-diagram.md
│   └── expected-outputs/
│       ├── simple.svg
│       └── complex.png
└── helpers/                      # Test utilities and mocks
    ├── mockVscode.ts            # VS Code API mocks
    ├── testUtils.ts             # Common test utilities
    └── fixtures.ts              # Test data generators
```

## Unit Testing

### Service Layer Testing

Our service-oriented architecture enables comprehensive unit testing with dependency injection:

```typescript
// Example: diagramDiscoveryService.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiagramDiscoveryServiceImpl } from '../../services/diagramDiscoveryService';

describe('DiagramDiscoveryService', () => {
  let service: DiagramDiscoveryServiceImpl;
  
  beforeEach(() => {
    service = new DiagramDiscoveryServiceImpl();
  });

  describe('File Discovery', () => {
    it('should discover .mmd files', async () => {
      const options = createTestDiscoveryOptions();
      const files = await service.discoverFiles(options);
      
      expect(files).toHaveLength(3);
      expect(files.every(f => f.type === 'mmd')).toBe(true);
    });

    it('should respect depth limits', async () => {
      const shallowOptions = { ...baseOptions, maxDepth: 1 };
      const deepOptions = { ...baseOptions, maxDepth: 3 };
      
      const shallowFiles = await service.discoverFiles(shallowOptions);
      const deepFiles = await service.discoverFiles(deepOptions);
      
      expect(deepFiles.length).toBeGreaterThanOrEqual(shallowFiles.length);
    });
  });

  describe('Diagram Analysis', () => {
    it('should correctly identify diagram types', () => {
      const flowchartDiagram = service.extractDiagrams(`
        \`\`\`mermaid
        flowchart TD
            A --> B
        \`\`\`
      `, 'test.md')[0];
      
      expect(flowchartDiagram.typeAnalysis.primaryType).toBe('flowchart');
      expect(flowchartDiagram.typeAnalysis.confidence).toBeGreaterThan(0.8);
    });

    it('should calculate complexity accurately', () => {
      const complexDiagram = createComplexDiagramFixture();
      const complexity = service.calculateComplexity(complexDiagram);
      
      expect(complexity.category).toBe('complex');
      expect(complexity.nodeCount).toBeGreaterThan(10);
      expect(complexity.estimatedRenderTime).toBeGreaterThan(1000);
    });
  });
});
```

### Export Folder Engine Testing

```typescript
// Example: batchExportEngine.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BatchExportEngineImpl } from '../../services/batchExportEngine';

describe('BatchExportEngine', () => {
  let engine: BatchExportEngineImpl;
  let mockContext: MockExtensionContext;

  beforeEach(() => {
    mockContext = createMockExtensionContext();
    engine = new BatchExportEngineImpl(mockContext);
  });

  describe('Batch Creation', () => {
    it('should create jobs for all format/diagram combinations', async () => {
      const files = createMockFiles(2); // 2 files, 1 diagram each
      const config = createBatchConfig(['svg', 'png']); // 2 formats
      
      const batch = await engine.createBatch(files, config);
      
      expect(batch.jobs).toHaveLength(4); // 2 files × 1 diagram × 2 formats
      expect(batch.jobs.map(j => j.id)).toHaveLength(4); // All unique IDs
    });

    it('should optimize job execution order', () => {
      const jobs = createMockJobs();
      const optimized = engine.optimizeJobOrder(jobs);
      
      // Verify priority ordering
      for (let i = 1; i < optimized.length; i++) {
        expect(optimized[i].priority).toBeLessThanOrEqual(optimized[i - 1].priority);
      }
    });
  });

  describe('Error Handling', () => {
    it('should detect circular dependencies', async () => {
      const batch = await engine.createBatch(mockFiles, config);
      
      // Create circular dependency
      batch.jobs[0].dependencies = [batch.jobs[1].id];
      batch.jobs[1].dependencies = [batch.jobs[0].id];
      
      const errors = await engine.validateBatch(batch);
      
      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'CIRCULAR_DEPENDENCIES' })
      );
    });
  });
});
```

### Testing Patterns

1. **Arrange-Act-Assert (AAA)**: Standard pattern for all tests
2. **Factory Functions**: `createMockFiles()`, `createBatchConfig()` for reusable test data
3. **Snapshot Testing**: For complex objects and generated reports
4. **Property-Based Testing**: Using fast-check for edge case discovery

## Integration Testing

### VS Code Extension Context

Using `@vscode/test-electron` for full VS Code integration:

```typescript
// integration/fullBatchExport.test.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { runBatchExport } from '../../commands/batchExportCommand.v2';

describe('Full Export Folder Integration', () => {
  let testWorkspace: vscode.Uri;

  before(async () => {
    testWorkspace = await createTestWorkspace();
    await vscode.commands.executeCommand('vscode.openFolder', testWorkspace);
  });

  it('should complete full export folder workflow', async () => {
    const folderUri = vscode.Uri.file(path.join(testWorkspace.fsPath, 'diagrams'));
    
    // Mock user selections
    const showQuickPickStub = sinon.stub(vscode.window, 'showQuickPick');
    setupBatchExportMocks(showQuickPickStub);
    
    // Execute export folder
    await runBatchExport(mockContext, folderUri);
    
    // Verify outputs
    const outputDir = path.join(testWorkspace.fsPath, 'exported-diagrams');
    const outputFiles = await vscode.workspace.fs.readDirectory(vscode.Uri.file(outputDir));
    
    expect(outputFiles.length).toBeGreaterThan(0);
    expect(outputFiles.some(([name]) => name.endsWith('.svg'))).toBe(true);
  });

  it('should handle cancellation gracefully', async () => {
    // Test cancellation during export
    const cancellationToken = new vscode.CancellationTokenSource();
    
    const exportPromise = runBatchExport(mockContext, testUri);
    
    // Cancel after short delay
    setTimeout(() => cancellationToken.cancel(), 100);
    
    await expect(exportPromise).rejects.toThrow('Operation was cancelled');
  });
});
```

### Command Registration Tests

```typescript
// integration/commandRegistration.test.ts
import * as vscode from 'vscode';

describe('Command Registration', () => {
  it('should register all extension commands', async () => {
    const commands = await vscode.commands.getCommands();
    
    const expectedCommands = [
      'mermaidExportPro.batchExport',
      'mermaidExportPro.exportCurrent',
      'mermaidExportPro.exportAll'
    ];
    
    expectedCommands.forEach(cmd => {
      expect(commands).toContain(cmd);
    });
  });

  it('should execute commands without errors', async () => {
    await expect(
      vscode.commands.executeCommand('mermaidExportPro.exportCurrent')
    ).resolves.not.toThrow();
  });
});
```

## E2E Testing

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e',
  timeout: 30000,
  retries: 2,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
```

### Webview Testing

```typescript
// e2e/webview.test.ts
import { test, expect } from '@playwright/test';

test.describe('Webview Export', () => {
  test('should render SVG correctly in webview', async ({ page }) => {
    await page.goto('http://localhost:3000/webview');
    
    // Wait for mermaid diagram to render
    await page.waitForSelector('svg.mermaid-diagram');
    
    // Verify SVG content
    const svgContent = await page.locator('svg.mermaid-diagram').innerHTML();
    expect(svgContent).toContain('<path'); // Basic SVG element check
    
    // Visual regression test
    await expect(page.locator('svg.mermaid-diagram')).toHaveScreenshot('flowchart.png');
  });

  test('should handle export button clicks', async ({ page }) => {
    await page.goto('http://localhost:3000/webview');
    
    // Click export button
    await page.click('[data-testid="export-svg"]');
    
    // Verify download triggered
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('diagram.svg');
  });
});
```

### User Flow Testing

```typescript
// e2e/userFlows.test.ts
import { test, expect } from '@playwright/test';

test.describe('Complete User Workflows', () => {
  test('export folder workflow', async ({ page }) => {
    // Navigate to VS Code extension
    await page.goto('vscode://extension/your-publisher.mermaid-export-pro');
    
    // Open command palette
    await page.keyboard.press('Ctrl+Shift+P');
    await page.type('Mermaid: Export Folder');
    await page.press('Enter');
    
    // Follow through export dialog
    await page.click('[data-testid="select-all-formats"]');
    await page.click('[data-testid="confirm-export"]');
    
    // Wait for completion
    await page.waitForSelector('[data-testid="export-complete"]', { timeout: 30000 });
    
    // Verify success message
    const successMessage = await page.textContent('[data-testid="export-complete"]');
    expect(successMessage).toContain('exported successfully');
  });
});
```

## Mocking Strategy

### VS Code API Mocking

```typescript
// helpers/mockVscode.ts
import { vi } from 'vitest';

export const mockVscode = {
  commands: {
    executeCommand: vi.fn().mockResolvedValue(undefined),
    registerCommand: vi.fn()
  },
  window: {
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
    showQuickPick: vi.fn().mockResolvedValue(undefined),
    showInputBox: vi.fn().mockResolvedValue(undefined),
    createOutputChannel: vi.fn().mockReturnValue({
      appendLine: vi.fn(),
      show: vi.fn(),
      clear: vi.fn()
    }),
    withProgress: vi.fn().mockImplementation((options, task) => 
      task({ report: vi.fn() }, { isCancellationRequested: false })
    )
  },
  workspace: {
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue('default')
    }),
    workspaceFolders: [],
    openTextDocument: vi.fn().mockResolvedValue({
      fileName: 'test.md',
      getText: vi.fn().mockReturnValue('test content')
    })
  },
  Uri: {
    file: vi.fn().mockImplementation((path) => ({ fsPath: path }))
  }
};

// Mock the entire vscode module
vi.mock('vscode', () => mockVscode);
```

### Service Mocking

```typescript
// Unit test with service mocking
describe('BatchExportCommand', () => {
  let mockDiscoveryService: MockDiscoveryService;
  let mockExportEngine: MockExportEngine;

  beforeEach(() => {
    mockDiscoveryService = {
      discoverFiles: vi.fn().mockResolvedValue([]),
      analyzeFile: vi.fn().mockResolvedValue(mockFile)
    };
    
    mockExportEngine = {
      createBatch: vi.fn().mockResolvedValue(mockBatch),
      executeBatch: vi.fn().mockResolvedValue(mockResult)
    };
    
    // Inject mocks
    vi.doMock('../../services/diagramDiscoveryService', () => ({
      diagramDiscoveryService: mockDiscoveryService
    }));
  });
});
```

## CI/CD Pipeline

### GitHub Actions Configuration

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test Suite
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linting
        run: npm run lint
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        if: matrix.os == 'ubuntu-latest' # Only run on Linux to avoid flaky tests
        
      - name: Generate coverage
        run: npm run test:coverage
        if: matrix.os == 'ubuntu-latest' && matrix.node-version == '20'
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        if: matrix.os == 'ubuntu-latest' && matrix.node-version == '20'
        with:
          file: ./coverage/lcov.info
          
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-results
          path: test-results/
          
  package:
    name: Package Extension
    runs-on: ubuntu-latest
    needs: [test, e2e]
    if: success()
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install dependencies
        run: npm ci
        
      - name: Package extension
        run: |
          npm install -g @vscode/vsce
          vsce package
          
      - name: Upload VSIX
        uses: actions/upload-artifact@v4
        with:
          name: extension-vsix
          path: '*.vsix'
```

### Quality Gates

```yaml
# Additional job for quality gates
  quality-gate:
    name: Quality Gate
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi
```

## Coverage Requirements

### Coverage Targets

- **Overall Coverage**: ≥ 80%
- **Service Layer**: ≥ 90% (business logic)
- **Command Layer**: ≥ 75% (UI interaction)
- **Utility Functions**: ≥ 95% (pure functions)

### Coverage Configuration

```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Service-specific thresholds
        'src/services/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      exclude: [
        'src/test/',
        'out/',
        '*.config.ts',
        'src/**/*.d.ts'
      ]
    }
  }
});
```

### Coverage Reporting

```json
{
  "scripts": {
    "coverage:html": "vitest run --coverage --reporter=html",
    "coverage:lcov": "vitest run --coverage --reporter=lcov", 
    "coverage:check": "vitest run --coverage --reporter=threshold"
  }
}
```

## Best Practices

### Test Organization

1. **Single Responsibility**: Each test should verify one behavior
2. **Descriptive Names**: Test names should clearly describe the scenario
3. **AAA Pattern**: Arrange, Act, Assert structure
4. **DRY Principle**: Use factory functions and helpers to avoid duplication

### Performance Guidelines

1. **Fast Unit Tests**: < 100ms per test
2. **Reasonable Integration**: < 5s per test
3. **Efficient E2E**: < 30s per test
4. **Parallel Execution**: Use Vitest's built-in parallelization

### Error Testing

```typescript
describe('Error Scenarios', () => {
  it('should handle file system errors gracefully', async () => {
    const mockError = new Error('EACCES: permission denied');
    mockFs.readFile.mockRejectedValue(mockError);
    
    const result = await service.analyzeFile('/protected/file.md');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission denied');
  });

  it('should provide helpful error messages', async () => {
    const invalidDiagram = 'invalid mermaid syntax';
    
    await expect(
      service.validateDiagram({ content: invalidDiagram })
    ).rejects.toMatchObject({
      code: 'INVALID_SYNTAX',
      message: expect.stringContaining('syntax'),
      recoveryActions: expect.arrayContaining([
        expect.stringContaining('Check diagram syntax')
      ])
    });
  });
});
```

### Mock Management

```typescript
// Centralized mock factory
export class MockFactory {
  static createMermaidFile(overrides?: Partial<EnhancedMermaidFile>): EnhancedMermaidFile {
    return {
      path: '/test/file.md',
      relativePath: 'file.md',
      content: 'flowchart TD\n  A --> B',
      type: 'markdown',
      size: 1000,
      lastModified: new Date(),
      diagrams: [MockFactory.createDiagram()],
      metadata: MockFactory.createMetadata(),
      ...overrides
    };
  }

  static createBatchConfig(overrides?: Partial<BatchExportConfig>): BatchExportConfig {
    return {
      formats: ['svg'],
      theme: 'default',
      outputDirectory: '/test/output',
      maxDepth: 3,
      namingStrategy: 'sequential',
      organizeByFormat: false,
      overwriteExisting: false,
      ...overrides
    };
  }
}
```

## Migration from Legacy Testing

### Current State Analysis

Our current test suite uses:
- ❌ **Mocha + Sinon**: Legacy setup with manual configuration
- ❌ **Manual Mocking**: Inconsistent mock patterns
- ❌ **Limited Coverage**: No systematic coverage tracking
- ❌ **Slow Tests**: Integration tests that are too heavy

### Migration Plan

#### Phase 1: Infrastructure (✅ Completed)
- [x] Install Vitest and migrate test runner
- [x] Set up proper TypeScript configuration
- [x] Configure coverage reporting
- [x] Update npm scripts

#### Phase 2: Unit Test Migration
- [ ] Migrate existing service tests to Vitest
- [ ] Implement new service layer tests
- [ ] Create comprehensive mocking strategy
- [ ] Achieve 80%+ unit test coverage

#### Phase 3: Integration Testing
- [ ] Set up @vscode/test-electron
- [ ] Create integration test suite
- [ ] Test command registration and execution
- [ ] Test VS Code API integrations

#### Phase 4: E2E Testing
- [ ] Configure Playwright
- [ ] Create webview tests
- [ ] Implement visual regression tests
- [ ] Add user flow tests

#### Phase 5: CI/CD
- [ ] Set up GitHub Actions pipeline
- [ ] Configure quality gates
- [ ] Add automated releases
- [ ] Set up coverage reporting

## Recent Changes & Pitfalls (2024-2025)

### Deprecated Practices

- ❌ **Old `vscode-test`**: Replaced by `@vscode/test-electron` and `@vscode/test-web`
- ❌ **Global VS Code Mocks**: Use proper ESM mocking instead
- ❌ **CommonJS**: Prefer pure ESM where possible
- ❌ **Manual Test Configuration**: Use modern test runners with built-in TypeScript

### New Best Practices

- ✅ **@vscode/test-electron/web**: Official integration testing helpers
- ✅ **Vitest**: Modern, fast test runner with built-in TypeScript
- ✅ **ESM Mocking**: Use `vi.mock()` for module mocking
- ✅ **Coverage Integration**: Built-in coverage with quality gates

### Common Pitfalls

1. **ESM/CommonJS Interop**: Ensure consistent module format
2. **VS Code Version Mismatch**: Use prebuilt VS Code versions in CI
3. **Flaky Integration Tests**: Mock external dependencies properly
4. **Memory Leaks**: Clean up resources in test teardown

## Conclusion

Our comprehensive testing strategy ensures:

- **Quality**: High code coverage with meaningful tests
- **Speed**: Fast development cycles with efficient test execution
- **Reliability**: Robust CI/CD pipeline with quality gates
- **Maintainability**: Modern tooling and clear test patterns
- **Confidence**: Comprehensive test coverage for safe refactoring

The combination of Vitest for unit tests, @vscode/test-electron for integration, and Playwright for E2E provides complete coverage across all layers of the extension architecture.

## Resources

- [VS Code Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Testing](https://playwright.dev/)
- [@vscode/test-electron](https://github.com/microsoft/vscode-test)
- [Extension Sample Tests](https://github.com/microsoft/vscode-extension-samples)