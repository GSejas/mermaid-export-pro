# Claude Instructions for Mermaid Export Pro

This is a VS Code extension that provides professional Mermaid diagram export capabilities with multiple formats and cross-platform reliability.

## Project Overview

**Name**: Mermaid Export Pro  
**Purpose**: Replace broken `Gruntfuggly/mermaid-export` extension with modern, reliable cross-platform solution  
**Status**: Phase 1 (Core Export) - Basic scaffolding complete, implementing core functionality  

## Key Architecture

### Dual Export Strategy
- **Primary**: CLI-based using `@mermaid-js/mermaid-cli` v11.9.0
- **Fallback**: Web-based using VS Code webview with mermaid.js (no external dependencies)

### Core Components
```
src/
├── extension.ts              # Main activation file
├── commands/                 # VS Code command implementations
├── strategies/               # Export strategies (CLI, Web)  
├── services/                 # Core business logic
├── ui/                      # Progress reporting, error handling
├── utils/                   # Cross-platform utilities
└── types/                   # TypeScript interfaces
```

## Available Commands

When working on this project, these are the key commands available:

- `npm run compile` - TypeScript compilation with type checking and linting
- `npm run watch` - Watch mode for development
- `npm run test` - Run extension tests
- `npm run lint` - ESLint code quality checks
- `npm run check-types` - TypeScript type checking only
- `npm run package` - Production build

## Core VS Code Extension Commands

The extension contributes these commands:
- `mermaidExportPro.exportCurrent` - Export active file
- `mermaidExportPro.exportAs` - Export with format selection  
- `mermaidExportPro.batchExport` - Export folder/workspace
- `mermaidExportPro.exportMarkdown` - Process markdown files
- `mermaidExportPro.toggleAutoExport` - Auto-export on save
- `mermaidExportPro.showOutput` - Show export log
- `mermaidExportPro.debugExport` - Debug command

## Configuration Settings

Key extension settings:
- `mermaidExportPro.defaultFormat`: Export format (svg|png|pdf|webp)
- `mermaidExportPro.theme`: Mermaid theme (default|dark|forest|neutral)
- `mermaidExportPro.exportStrategy`: Strategy preference (cli|web|auto)
- `mermaidExportPro.outputDirectory`: Custom output directory
- `mermaidExportPro.autoExport`: Auto-export on save

## Development Guidelines

### Code Standards
- Follow existing TypeScript patterns and project structure
- Use interfaces from `src/types/index.ts` for type definitions
- Implement proper error handling with user-friendly messages
- Support cross-platform path handling (Windows/Mac/Linux)
- Always use async/await patterns with proper progress reporting

### Key Dependencies
- `@mermaid-js/mermaid-cli`: Primary export engine
- `@types/vscode`: VS Code API types
- `chalk`: Terminal colors for CLI output
- `commander`: CLI argument parsing

### Testing Strategy
- Unit tests for core services and utilities
- Integration tests with real mermaid files
- Cross-platform compatibility testing
- Performance testing for large diagrams

## Current Implementation Status

### Phase 1 - Core Export (In Progress)
- [x] Project scaffolding with modern TypeScript setup
- [x] Basic CLI export strategy structure
- [ ] Single file export command implementation
- [ ] Cross-platform path handling
- [ ] Basic error handling and logging

### Key Files to Focus On
1. `src/extension.ts` - Main activation and command registration
2. `src/strategies/cliExportStrategy.ts` - Primary export implementation
3. `src/services/exportManager.ts` - Export orchestration
4. `src/commands/exportCommand.ts` - Command implementations

## Error Handling Requirements

Handle these scenarios gracefully:
- CLI tool not installed/broken
- Puppeteer/Chromium installation failures  
- Invalid mermaid syntax
- File permission issues
- Network connectivity problems
- Workspace folder access issues

## Performance Requirements
- Fast startup time (< 2 seconds)
- Responsive UI during export operations
- Memory efficient for large diagrams
- Graceful degradation when CLI unavailable
- Comprehensive logging for troubleshooting

## User Experience Goals
1. One-click export: Right-click → Export Mermaid
2. Visual feedback: Progress bars and status indicators
3. Smart defaults: Sensible configuration out-of-the-box
4. Error recovery: Clear instructions when things go wrong
5. Batch operations: Process entire projects efficiently

## Security Considerations
- Validate all user inputs and file paths
- Sanitize mermaid diagram content before processing
- Use secure temp file handling
- No logging of sensitive information

## Next Implementation Priority
Focus on getting basic single-file export working first with CLI strategy, then iterate to add advanced features and web fallback.