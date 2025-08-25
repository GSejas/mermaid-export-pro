# Change Log

All notable changes to the "mermaid-export-pro" extension will be documented in this file.

## [1.0.0] - 2025-08-25

## [1.0.2] - 2025-08-25

### 🐛 Fixes

- Fix activation timing so Status Bar and Hover providers register on startup and on `mermaid` files.
- Ensure Explorer/context commands open previewed files before exporting (no more "No active document").
- Persist per-file export format preferences and auto-save behavior for `Export As`.

### 📦 Packaging

- Add `LICENSE` and update packaging workflow. Created `mermaid-export-pro-1.0.1.vsix` and installed locally.

### 🔧 Developer

- Register CodeLens/Hover providers for both `markdown` and `mermaid` language ids.
- Minor lint and type fixes.

---


### ✨ New Features

#### Status Bar Integration
- **Smart Status Bar**: Shows mermaid diagram count in current file (`$(file-media) 2 Mermaids`)
- **One-Click Export**: Click status bar to directly export current file when configured
- **Real-time Updates**: Diagram count updates automatically as you edit
- **Visual Status Indicators**: Different icons for CLI-available, web-only, and setup-needed states

#### Batch Export System
- **Recursive Directory Scanning**: Export all mermaid files in folder structure
- **Multi-Diagram Support**: Handle multiple mermaid blocks per markdown file
- **Progress Tracking**: Visual progress indication for large batch operations
- **Detailed Reporting**: Summary of successful exports and any errors

#### Auto-Export on Save
- **File Watcher**: Automatically export mermaid files when saved
- **Configurable**: Toggle on/off with persistent workspace settings
- **Smart Detection**: Works with both `.mmd` files and markdown mermaid blocks
- **Custom Output Directory**: Configure where auto-exported files are saved

#### Enhanced Markdown Support
- **CodeLens Integration**: Export buttons above mermaid code blocks
- **Rich Hover Tooltips**: Diagram info and quick export options on hover
- **Command Links**: Click directly from hover to export in specific format
- **Diagram Type Detection**: Automatically identifies flowchart, sequence, class diagrams, etc.

#### Extended Format Support
- **JPG/JPEG Export**: Added compressed image format support
- **Canvas Conversion**: SVG to raster format conversion for web strategy
- **Quality Options**: Configurable width, height, and background color

#### Configuration Enhancements
- **Complete Schema**: All settings now properly defined in VS Code settings
- **Workspace Support**: Settings persist per workspace
- **Auto-Detection**: Extension automatically finds best export strategy
- **Theme Support**: Default, dark, forest, and neutral themes

### 🔧 Technical Improvements

- **TypeScript Compliance**: All code properly typed and error-free
- **Proper Error Handling**: Comprehensive error reporting and logging
- **Singleton Patterns**: Efficient resource management for watchers
- **Cross-Platform Paths**: Proper path handling for Windows/Mac/Linux
- **Memory Management**: Proper disposal of VS Code resources

### 🚀 Commands Added

- `mermaidExportPro.batchExport` - Export all diagrams in a folder
- `mermaidExportPro.toggleAutoExport` - Enable/disable auto-export on save
- `mermaidExportPro.exportMarkdownBlock` - Export specific mermaid block
- `mermaidExportPro.statusBarClick` - Handle status bar interactions

### 🎯 Providers Added

- **MermaidCodeLensProvider**: Shows export options above code blocks
- **MermaidHoverProvider**: Rich hover information and quick actions

### 📋 Menu Integrations

- **Explorer Context**: Right-click folders to batch export
- **Editor Context**: Right-click mermaid files to export
- **Command Palette**: All commands available via Ctrl+Shift+P

### 🏗️ Architecture

- **Dual Export Strategy**: CLI + Web fallback for maximum compatibility
- **Service-Oriented Design**: Clean separation of concerns
- **Extension Lifecycle**: Proper activation, deactivation, and resource cleanup
- **Configuration Management**: Centralized settings with validation

---

*This release represents a complete implementation of all planned features for Mermaid Export Pro, transforming it from a basic export tool to a comprehensive diagram workflow solution for VS Code.*