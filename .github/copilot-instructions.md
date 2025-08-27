# 🚀 **ONE-SHOT PROJECT PROMPT: Modern Mermaid Export Extension**

## **PROJECT OVERVIEW**
Create a modern, reliable VS Code extension called "**Mermaid Export Pro**" to replace the broken `Gruntfuggly/mermaid-export` extension. The extension should provide robust, cross-platform mermaid diagram export capabilities with multiple output formats and advanced features.

## **🎯 CORE REQUIREMENTS**

### **Primary Functionality**
1. **Export mermaid diagrams** from `.mmd` files to multiple formats (SVG, PNG, PDF, WEBP)
2. **Process markdown files** with embedded mermaid code blocks
3. **Mermaid Export Pro - Batch Export** entire folders/workspaces
4. **Cross-platform compatibility** (Windows/Mac/Linux) with proper path handling
5. **Dual export strategies** for maximum reliability

### **Technical Architecture**
```typescript
// Core interfaces
interface ExportOptions {
  format: 'svg' | 'png' | 'pdf' | 'webp';
  theme: 'default' | 'dark' | 'forest' | 'neutral';
  width?: number;
  height?: number;
  backgroundColor?: string;
  cssFile?: string;
  configFile?: string;
}

interface ExportStrategy {
  export(content: string, options: ExportOptions): Promise<Buffer>;
  isAvailable(): Promise<boolean>;
}
```

## **🏗️ PROJECT STRUCTURE**
```
mermaid-export-pro/
├── package.json                 # Extension manifest
├── src/
│   ├── extension.ts             # Main activation file
│   ├── commands/
│   │   ├── exportCommand.ts     # Single file export
│   │   ├── batchExportCommand.ts# Mermaid Export Pro - Batch Export
│   │   └── watchCommand.ts      # Auto-export on save
│   ├── strategies/
│   │   ├── cliExportStrategy.ts # @mermaid-js/mermaid-cli
│   │   └── webExportStrategy.ts # Browser-based fallback
│   ├── services/
│   │   ├── exportManager.ts     # Main export orchestrator
│   │   ├── fileProcessor.ts     # File handling utilities
│   │   └── configManager.ts     # Settings management
│   ├── ui/
│   │   ├── progressReporter.ts  # Progress indicators
│   │   └── errorHandler.ts      # User-friendly error messages
│   └── utils/
│       ├── pathUtils.ts         # Cross-platform path handling
│       └── validators.ts        # Input validation
├── media/                       # Extension icons
├── webview/                     # Browser-based export assets
└── test/                        # Unit and integration tests
```

## **🔧 IMPLEMENTATION DETAILS**

### **1. Export Strategies (Dual Engine Approach)**

#### **Primary: CLI Strategy**
```typescript
export class CLIExportStrategy implements ExportStrategy {
  async export(content: string, options: ExportOptions): Promise<Buffer> {
    // Use @mermaid-js/mermaid-cli v11.9.0
    // Handle Windows path issues with proper escaping
    // Support all modern mermaid features
  }

  async isAvailable(): Promise<boolean> {
    // Check if @mermaid-js/mermaid-cli is installed
    // Verify CLI works with simple test
  }
}
```

#### **Fallback: Web Strategy**
```typescript
export class WebExportStrategy implements ExportStrategy {
  async export(content: string, options: ExportOptions): Promise<Buffer> {
    // Use VS Code webview with mermaid.js
    // Render to SVG, convert to other formats
    // No external dependencies required
  }
}
```

### **2. VS Code Commands**
```typescript
// Commands to register
const commands = [
  'mermaidExportPro.exportCurrent',      // Export active file
  'mermaidExportPro.exportAs',           // Export with format selection
  'mermaidExportPro.batchExport',        // Export folder/workspace
  'mermaidExportPro.exportMarkdown',     // Process markdown files
  'mermaidExportPro.toggleAutoExport',   // Auto-export on save
  'mermaidExportPro.showOutput',         // Show export log
];
```

### **3. Configuration Options**
```json
{
  "mermaidExportPro.defaultFormat": {
    "type": "string",
    "enum": ["svg", "png", "pdf", "webp"],
    "default": "png",
    "description": "Default export format"
  },
  "mermaidExportPro.theme": {
    "type": "string",
    "enum": ["default", "dark", "forest", "neutral"],
    "default": "default",
    "description": "Mermaid theme"
  },
  "mermaidExportPro.outputDirectory": {
    "type": "string",
    "default": "",
    "description": "Custom output directory (relative to file location if not absolute)"
  },
  "mermaidExportPro.autoExport": {
    "type": "boolean",
    "default": false,
    "description": "Automatically export on file save"
  },
  "mermaidExportPro.exportStrategy": {
    "type": "string",
    "enum": ["cli", "web", "auto"],
    "default": "auto",
    "description": "Export strategy preference"
  }
}
```

## **🚀 IMPLEMENTATION PHASES**

### **Phase 1: Core Export (Week 1)**
- [ ] Project scaffolding with modern TypeScript setup
- [ ] Basic CLI export strategy with `@mermaid-js/mermaid-cli`
- [ ] Single file export command
- [ ] Cross-platform path handling
- [ ] Basic error handling and logging

### **Phase 2: Reliability & Fallback (Week 2)**
- [ ] Web-based export strategy implementation
- [ ] Strategy selection and fallback logic
- [ ] Progress reporting and status updates
- [ ] Configuration management
- [ ] Comprehensive error handling

### **Phase 3: Advanced Features (Week 3)**
- [ ] Mermaid Export Pro - Batch Export functionality
- [ ] Markdown file processing with embedded diagrams
- [ ] Auto-export on save feature
- [ ] Custom themes and styling support
- [ ] Output directory customization

### **Phase 4: Polish & Testing (Week 4)**
- [ ] Comprehensive unit tests
- [ ] Integration tests with real mermaid files
- [ ] Performance optimization
- [ ] User experience improvements
- [ ] Documentation and examples

### **Phase 5: Publishing (Week 5)**
- [ ] Extension packaging and optimization
- [ ] VS Code Marketplace submission
- [ ] README and documentation
- [ ] GitHub repository setup with CI/CD

## **🔍 TECHNICAL SPECIFICATIONS**

### **Dependencies**
```json
{
  "dependencies": {
    "@mermaid-js/mermaid-cli": "^11.9.0",
    "chalk": "^5.0.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "typescript": "^5.3.0",
    "webpack": "^5.89.0"
  }
}
```

### **Key Features to Implement**
1. **Smart Installation**: Auto-install `@mermaid-js/mermaid-cli` if missing
2. **Path Intelligence**: Handle Windows UNC paths, network drives
3. **Format Detection**: Auto-detect mermaid content in various file types
4. **Performance**: Async operations with proper cancellation
5. **User Feedback**: Rich progress indicators and meaningful error messages

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
