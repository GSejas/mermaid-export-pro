# 🚀 **ONE-SHOT PROJECT PROMPT: Modern Mermaid Export Extension**

## **PROJECT OVERVIEW**
Create a modern, reliable VS Code extension called "**Mermaid Export Pro**" to replace the broken `Gruntfuggly/mermaid-export` extension. The extension should provide robust, cross-platform mermaid diagram export capabilities with multiple output formats and advanced features.

## **🎯 CORE REQUIREMENTS**

### **Primary Functionality**
1. **Export mermaid diagrams** from `.mmd` files to multiple formats (SVG, PNG, PDF, WEBP)
2. **Process markdown files** with embedded mermaid code blocks
3. **Batch export** entire folders/workspaces
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
│   │   ├── batchExportCommand.ts# Batch export
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
- [x] Project scaffolding with modern TypeScript setup
- [x] Basic CLI export strategy with `@mermaid-js/mermaid-cli`
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
- [ ] Batch export functionality
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

---

# V2 - 

We asked AI to include an additional way to review export options, when users view markdown.

---

# Answer

I'll check the VS Code API docs for hover/CodeLens/decoration support and ask Perplexity for current best practices and patterns; expected outcome: concrete API guidance and best-practice tips we can implement. Receiving task — I’ll (1) list a compact checklist of requirements I’ll cover, (2) summarize concrete implementation options for tooltip/hover/overlay + export actions, (3) surface the VS Code API bits and Perplexity best-practice guidance I fetched, and (4) propose next steps you can ask me to run.

Checklist (requirements)
- Detect fenced ```mermaid``` blocks inside Markdown (on-demand, robust). — Done (recommendation below)
- Surface an info tooltip / hover / overlay when viewing the block. — Done (options below)
- Offer actionable exports: PNG / JPEG / SVG (and PDF/webp as optional). — Done (strategies below)
- Use up-to-date VS Code APIs and follow best practices (2025). — Done (API & Perplexity summary below)
- Recommend fallback and performance strategies (non-blocking, progress, error handling). — Done (below)

Progress update (what I already did)
- Checked VS Code API snippets and relevant provider APIs.
- Queried for best-practice guidance (Perplexity-style summary) about hover/Codelens/decoration approaches, performance, parsing, and pitfalls.
- Next: implement a minimal prototype (hover + CodeLens) on request.

Implementation ideas — concrete approach (minimal -> full)

1) Detection (core)
- Use a Markdown AST parser (remark/unified or markdown-it) to reliably find fenced code blocks with info "mermaid". Avoid brittle regex.
- Produce ranges: startLine/endLine and a TextDocument Range for each code fence. Use those ranges to attach CodeLens/hover/diagnostics/decoration.

2) UI affordances (recommend combining 2-3 for best UX)
- CodeLens (always-visible, sits above the code fence)
  - Pros: discoverable, keyboard accessible, direct actions (Export PNG / Export SVG / Export JPEG)
  - Implementation: registerCodeLensProvider({ language: 'markdown' }, provider) and create CodeLens objects with command metadata.
- Hover provider (contextual, non-intrusive)
  - Show on hover over the fence or any line inside the block.
  - Use Markdown content containing command links like [Export as SVG](command:extension.mermaidExportAsSvg).
  - Note: mark the MarkdownString as trusted for command links to be clickable.
    - Example: let md = new vscode.MarkdownString('[Export SVG](command:extension.exportSvg)'); md.isTrusted = true;
  - Register with vscode.languages.registerHoverProvider('markdown', ...)
- Decoration / inline overlay / gutter icon
  - Use TextEditorDecorationType to show a small icon or subtle overlay near the block for discoverability.
  - Decorations cannot be directly clicked; use them with CodeLens or respond to editor selection/click events to offer the action.
- Optional: small floating Webview preview when user hovers or clicks "Preview" action.

3) Export action wiring
- Commands:
  - extension.exportSvg, extension.exportPng, extension.exportJpeg, extension.batchExport
- Flow for a single export:
  1. Extract the Mermaid text from the code block
  2. Run export via ExportManager (see strategies below)
  3. Use window.withProgress to show progress and allow cancellation
  4. Present Save dialog (window.showSaveDialog) or save next to source with configured naming
  5. Show a notification on success/failure and attach a “Open file” action

4) Export strategies (dual-engine for reliability)
- Primary: CLI using @mermaid-js/mermaid-cli
  - Use local install (node_modules/.bin/mmdc) or npx/@mermaid-js/mermaid-cli programmatic run import { run } from '@mermaid-js/mermaid-cli'
  - Spawn child process; ensure on Windows to use path.join and proper spawn options (shell:true when needed).
  - Check availability asynchronously with small test run (or run `npx -p @mermaid-js/mermaid-cli mmdc -h`).
- Fallback: in-extension web rendering
  - Use a headless webview (mermaid.min.js) to render to SVG in-memory, then convert to PNG/JPEG via an offscreen canvas (in webview) and send back base64 to extension host.
  - Advantage: no Puppeteer install required and avoids Chromium download issues.
- Optional heavy-duty: Puppeteer for pixel-perfect outputs if caller requests or for PDF output that needs Chromium.

5) Performance & robustness
- Offload heavy work to a child process or worker. Never block the extension host thread.
- Debounce parsing updates; only re-parse after small idle (200-500ms) or on save for heavy operations.
- Add a queue + concurrency limit for exports, and a safety cutoff for huge diagrams (lines/characters threshold).
- Cache rendered outputs (hash of diagram + options) to avoid re-rendering unchanged content.
- Provide meaningful diagnostics (vscode.languages.createDiagnosticCollection) for invalid mermaid syntax or export failures.

6) Accessibility & keyboard support
- Make CodeLens key-bindable and ensure exported commands accept focus and keyboard invocation.
- Provide clear text alternatives and accessible notifications.

7) Error handling & user flows
- If dependency missing (mermaid-cli or Puppeteer): show hover or popup with "Install" action and an option to use web fallback.
- For large diagram warnings, ask user to confirm before invoking Puppeteer or high-res export.
- Provide logs via an OutputChannel and a "Show Export Log" command.

VS Code API specifics & examples (from checks)
- Hover provider:
  - register with vscode.languages.registerHoverProvider('markdown', { provideHover(document, position) { return new vscode.Hover(md); } })
  - Use MarkdownString for hover content; enable command links with md.isTrusted = true.
- CodeLens provider:
  - vscode.languages.registerCodeLensProvider({ language: 'markdown' }, provider)
  - provider.provideCodeLenses(document) returns CodeLens[] with range above code fence
- Decorations:
  - vscode.window.createTextEditorDecorationType({ gutterIconPath, overviewRulerLane, ... })
- Diagnostics: use vscode.languages.createDiagnosticCollection to mark parsing or export errors
- Progress UI: vscode.window.withProgress({ location: vscode.ProgressLocation.Notification }, async (progress, token) => { ... })
- Running child processes: use child_process.spawn or spawnSync; on Windows set spawn options carefully (shell:true or use cmd.exe /c) and ensure paths use path.join/path.resolve

Perplexity best-practice highlights (condensed)
- Use AST parsing (remark/markdown-it) for block detection.
- Combine CodeLens (visible action) with hover (contextual info).
- Use command links inside hovers and mark MarkdownString as trusted for clickability.
- Offload rendering to background processes, and present progress.
- Provide fallback rendering (webview) to avoid brittle Puppeteer/Chromium installs.
- Avoid regex-only detection, clean up providers when document changes, and limit resource use for very large diagrams.

Small snippet examples (concise)
- Hover with command link (conceptual)
```ts
const md = new vscode.MarkdownString('[Export as SVG](command:extension.exportSvg)');
md.isTrusted = true;
return new vscode.Hover(md, codeFenceRange);
```
- Register CodeLens provider (conceptual)
```ts
vscode.languages.registerCodeLensProvider({ language: 'markdown' }, myProvider);
```

Next steps I can take for you (pick any)
- A) Implement a small prototype in this repo: detect mermaid code blocks, add CodeLens + Hover that call stub export commands (I can create files & run build). — recommended first step.
- B) Scaffold the full TypeScript extension (file tree, package.json, minimal ExportManager with CLI + web fallback stubs).
- C) Implement the full CLIExportStrategy using @mermaid-js/mermaid-cli and a simple webview fallback that returns SVG.
- D) Write tests and demo markdown files and a README.

Which one do you want me to do now? If you pick A or B I’ll:
- show a short checklist of files to create,
- then create them in the repo and run a quick build/test (I can run the compile and run tests locally), and give a compact checkpoint and the next actions.Next steps I can take for you (pick any)
- A) Implement a small prototype in this repo: detect mermaid code blocks, add CodeLens + Hover that call stub export commands (I can create files & run build). — recommended first step.
- B) Scaffold the full TypeScript extension (file tree, package.json, minimal ExportManager with CLI + web fallback stubs).
- C) Implement the full CLIExportStrategy using @mermaid-js/mermaid-cli and a simple webview fallback that returns SVG.
- D) Write tests and demo markdown files and a README.

Which one do you want me to do now? If you pick A or B I’ll:
- show a short checklist of files to create,
- then create them in the repo and run a quick build/test (I can run the compile and run tests locally), and give a compact checkpoint and the next actions.