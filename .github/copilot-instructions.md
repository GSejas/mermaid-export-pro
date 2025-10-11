# 🚀 Mermaid Export Pro - AI Agent Instructions

## **PROJECT OVERVIEW**
VS Code extension for professional Mermaid diagram export with dual CLI/Web strategies, cross-platform compatibility, and comprehensive format support.

## **�️ ARCHITECTURE OVERVIEW**

### **Core Components & Data Flow**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Commands      │───▶│   Services       │───▶│   Strategies    │
│ (User Actions)  │    │ (Business Logic) │    │ (Export Engines)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────┐                           ┌─────────────────┐
│   Extension.ts  │                           │ CLI/Web Export  │
│ (Activation)    │                           │ (File Output)   │
└─────────────────┘                           └─────────────────┘
```

### **Key Architectural Patterns**
- **Strategy Pattern**: CLI (`cliExportStrategy.ts`) vs Web (`webExportStrategy.ts`) export engines
- **Service Layer**: Business logic separated in `services/` (exportManager, configManager, fileProcessor)
- **Command Pattern**: VS Code commands in `commands/` with consistent error handling
- **Observer Pattern**: Status bar updates and progress reporting via `ui/` components

## **🔧 DEVELOPMENT WORKFLOWS**

### **Essential Commands**
```bash
# Build & Watch (use these for development)
npm run watch:esbuild    # Fast incremental builds
npm run watch:tsc        # TypeScript watch mode
npm run compile          # Full TypeScript compilation

# Testing & Quality
npm run test            # Run vitest test suite
npm run test:unit       # Unit tests only
npm run lint            # ESLint checks
npm run check-types     # TypeScript validation only

# Packaging & Deployment
npm run package         # Create .vsix file
npm run vscode:prepublish # Pre-deployment build
```

### **Debugging Workflow**
1. **Extension Host**: Use VS Code's "Launch Extension" debug configuration
2. **Debug Command**: Run `mermaidExportPro.debugExport` to test all strategies
3. **Test Files**: Use `demo/` folder with sample diagrams for validation
4. **Logs**: Check VS Code developer console and extension output channel

## **� PROJECT-SPECIFIC PATTERNS**

### **Export Strategy Implementation**
```typescript
// Always implement this interface for new strategies
export interface ExportStrategy {
  export(content: string, options: ExportOptions): Promise<Buffer>;
  isAvailable(): Promise<boolean>;
}

// Example from cliExportStrategy.ts
export class CLIExportStrategy implements ExportStrategy {
  async export(content: string, options: ExportOptions): Promise<Buffer> {
    // Use @mermaid-js/mermaid-cli with proper error handling
    // Handle Windows path escaping and Puppeteer setup
  }
}
```

### **Configuration Management**
```typescript
// Use configManager.ts for all settings access
const config = await configManager.getConfiguration();
const format = config.get<string>('defaultFormat', 'png');

// Settings are defined in package.json contributes.configuration
```

### **Error Handling Pattern**
```typescript
// Always use try-catch with user-friendly messages
try {
  await exportManager.export(content, options);
} catch (error) {
  await errorHandler.showError('Export failed', error.message);
  // Log technical details for debugging
  logger.error('Export error:', error);
}
```

### **Cross-Platform Path Handling**
```typescript
// Use pathUtils.ts for all file operations
import { normalizePath, ensureDirectory } from '../utils/pathUtils';

// Always normalize paths for Windows/Mac/Linux compatibility
const outputPath = normalizePath(config.outputDirectory);
```

## **🏛️ ARCHITECTURE DECISIONS**

### **Why Dual Strategy Pattern?**
**Decision**: CLI primary + Web fallback instead of single approach
**Rationale**: 
- CLI provides highest quality output but requires external dependencies
- Web fallback ensures reliability when CLI fails (installation issues, permissions)
- Users get best quality when possible, always get working export
- **Pattern**: Always check `isAvailable()` before using any strategy

### **Why Async/Await Everywhere?**
**Decision**: Mandatory async/await patterns throughout codebase
**Rationale**:
- Export operations are inherently asynchronous (file I/O, CLI execution)
- VS Code API is async-first
- Prevents blocking UI during long operations
- Enables proper cancellation and progress reporting
- **Pattern**: Never use synchronous file operations or blocking calls

### **Why Built-in Progress Reporting?**
**Decision**: Progress reporting integrated into all operations
**Rationale**:
- Export operations can take 5-30+ seconds
- Users need feedback to understand what's happening
- Prevents "extension frozen" perception
- Enables cancellation of long-running operations
- **Pattern**: Use `progressReporter.ts` for all user-facing operations

### **Why Comprehensive Timeout Handling?**
**Decision**: `operationTimeoutManager.ts` for all export operations
**Rationale**:
- Mermaid diagrams can be computationally expensive
- CLI tool can hang on complex diagrams
- Web rendering can freeze on malformed content
- Prevents indefinite hangs and resource exhaustion
- **Pattern**: Default 30s timeout, configurable per operation type

### **Why VS Code Temp Directory APIs?**
**Decision**: Use `vscode.workspace.fs` and temp APIs instead of Node.js fs
**Rationale**:
- Cross-platform compatibility (handles Windows UNC paths, network drives)
- Proper permission handling within VS Code sandbox
- Automatic cleanup on extension deactivation
- Consistent with VS Code extension best practices
- **Pattern**: Never use Node.js `fs` directly for user files

### **Why Extensive TypeScript Interfaces?**
**Decision**: Comprehensive interfaces in `types/index.ts`
**Rationale**:
- Export options vary by format (PNG needs quality, SVG needs none)
- Strategy implementations need consistent contracts
- Configuration options are complex and versioned
- Enables IDE autocompletion and compile-time safety
- **Pattern**: Define interfaces before implementation, update together

### **Why Specific Error Categorization?**
**Decision**: Structured error types and user-friendly messages
**Rationale**:
- Users don't understand technical errors ("ENOENT" means nothing)
- Different error types need different recovery strategies
- Enables better telemetry and debugging
- Supports graceful degradation (CLI fails → Web fallback)
- **Pattern**: Always provide user message + technical details for logging

### **Why Smart File Naming?**
**Decision**: Hash-based naming with sequences in `fileProcessor.ts`
**Rationale**:
- Prevents filename collisions on export folders
- Maintains relation between source and output files
- Enables incremental exports without overwriting
- Supports version control friendly workflows
- **Pattern**: `{original}-{hash}-{sequence}.{format}`

### **Why Comprehensive Logging?**
**Decision**: Detailed logging for all operations
**Rationale**:
- Debugging user issues requires full context
- Performance monitoring needs timing data
- Telemetry helps improve reliability
- Users can share logs for support
- **Pattern**: Log at multiple levels (debug, info, error) with structured data

### **Why Demo-First Testing?**
**Decision**: Use `demo/` folder as primary test bed
**Rationale**:
- Real-world diagrams are complex and varied
- Unit tests can't catch integration issues
- Manual testing with actual content is more reliable
- Demo files serve as documentation examples
- **Pattern**: Test new features with `demo/04-all-diagram-types.md` first

### **Why Status Bar Integration?**
**Decision**: Real-time status bar with diagram counts
**Rationale**:
- Users need to know when files contain mermaid diagrams
- One-click export from status bar improves UX
- Visual feedback reduces support questions
- **Pattern**: Auto-hide when no diagrams, show count when present

### **Why CodeLens for Inline Actions?**
**Decision**: Export buttons above mermaid code blocks
**Rationale**:
- Reduces context switching (no need to find command palette)
- Makes export action discoverable
- Provides format selection at point of use
- **Pattern**: Non-intrusive but always available when viewing mermaid content

## **🔗 INTEGRATION POINTS**

### **VS Code API Usage**
- **Commands**: Register in `extension.ts` activation function
- **Settings**: Define in `package.json` contributes.configuration
- **Webview**: Use for fallback export strategy (`webExportStrategy.ts`)
- **Status Bar**: Update via `ui/statusBarManager.ts`
- **CodeLens**: Provide inline export buttons (`providers/mermaidCodeLensProvider.ts`)

### **External Dependencies**
- **@mermaid-js/mermaid-cli**: Primary export engine (auto-install if missing)
- **Puppeteer**: Headless browser for CLI exports (bundled with CLI)
- **mermaid.js**: Web fallback rendering library

### **File System Operations**
- **Temp Files**: Use VS Code's temp directory APIs
- **Workspace Access**: Always check permissions before file operations
- **Output Naming**: Use smart naming with hashes/sequences (see `fileProcessor.ts`)

## **🎯 DEVELOPMENT GUIDELINES**

### **Code Organization**
- **Commands**: User-initiated actions (`commands/exportCommand.ts`)
- **Services**: Business logic without UI (`services/exportManager.ts`)
- **Strategies**: Export implementations (`strategies/cliExportStrategy.ts`)
- **UI**: User interface components (`ui/progressReporter.ts`)
- **Utils**: Cross-cutting concerns (`utils/pathUtils.ts`)
- **Types**: Shared interfaces (`types/index.ts`)

### **Testing Strategy**
- **Unit Tests**: Core services and utilities
- **Integration Tests**: Full export workflows
- **Demo Files**: Use `demo/` folder for manual testing
- **Debug Command**: Test all combinations via `debugExport`

### **Performance Considerations**
- **Large Diagrams**: Implement timeout handling (`operationTimeoutManager.ts`)
- **Memory Usage**: Monitor for leaks in webview strategy
- **Async Operations**: Always use proper cancellation tokens
- **Progress Reporting**: Show feedback for long-running exports

## **🚨 COMMON PITFALLS**

### **Path Handling**
- **Windows UNC Paths**: Always use `normalizePath()` from `pathUtils.ts`
- **Relative vs Absolute**: Check workspace context before resolving
- **Permissions**: Verify write access before file operations

### **CLI Strategy Issues**
- **Puppeteer Installation**: Handle missing Chromium gracefully
- **Version Compatibility**: Test with @mermaid-js/mermaid-cli@^11.9.0
- **Process Spawning**: Use proper child_process APIs with error handling

### **Web Strategy Fallback**
- **Webview Lifecycle**: Properly dispose resources
- **Mermaid.js Loading**: Handle network failures gracefully
- **Format Conversion**: SVG to PNG/PDF requires additional libraries

## **� KEY FILES FOR ONBOARDING**

1. **`src/extension.ts`** - Entry point and command registration
2. **`src/services/exportManager.ts`** - Main export orchestration
3. **`src/strategies/cliExportStrategy.ts`** - Primary export implementation
4. **`src/commands/exportCommand.ts`** - Command implementation example
5. **`demo/04-all-diagram-types.md`** - Test all diagram types
6. **`package.json`** - Extension manifest and scripts

## **🔄 WORKFLOW REMINDERS**

- **Start Small**: Get basic CLI export working before advanced features
- **Test Cross-Platform**: Windows/Mac/Linux compatibility is core requirement
- **Handle Errors Gracefully**: Users expect clear feedback, not technical stack traces
- **Use Demo Files**: `demo/` folder has comprehensive test scenarios
- **Check Status Bar**: Real-time feedback is key UX feature

---

**🎯 START CODING**: Begin with understanding `src/extension.ts` activation, then explore `src/services/exportManager.ts` for the main orchestration logic. Focus on CLI strategy first, then add web fallback.

### **Error Scenarios to Handle**
- CLI tool not installed/broken
- Puppeteer/Chromium installation failures
- Invalid mermaid syntax
- File permission issues
- Network connectivity problems (for web strategy)
- Workspace folder access issues

## **📋 SUCCESS CRITERIA**

### **Functional Requirements**
- ✅ Export works reliably on Windows, Mac, and Linux
- ✅ Supports all modern mermaid diagram types
- ✅ Handles both `.mmd` files and markdown with code blocks
- ✅ Provides meaningful error messages and recovery suggestions
- ✅ Offers multiple export formats with quality options

### **Non-Functional Requirements**
- ✅ Fast startup time (< 2 seconds)
- ✅ Responsive UI during export operations
- ✅ Memory efficient for large diagrams
- ✅ Graceful degradation when CLI is unavailable
- ✅ Comprehensive logging for troubleshooting

## **🎨 USER EXPERIENCE GOALS**

1. **One-Click Export**: Right-click → Export Mermaid
2. **Visual Feedback**: Progress bars and status indicators
3. **Smart Defaults**: Sensible configuration out-of-the-box
4. **Error Recovery**: Clear instructions when things go wrong
5. **Batch Operations**: Process entire projects efficiently

## **📦 DELIVERABLES**

1. **Working VS Code Extension** ready for marketplace
2. **Comprehensive Documentation** with examples
3. **Test Suite** with >80% code coverage
4. **Performance Benchmarks** and optimization report
5. **Migration Guide** from old mermaid-export extension

---

**🎯 START CODING**: Begin with `src/extension.ts` and implement the activation function, then move to the core export manager and CLI strategy. Focus on getting a basic single-file export working first, then iterate to add the advanced features.

This prompt provides everything needed to create a production-ready mermaid export extension that solves the Windows compatibility issues and provides modern features that users actually need.
