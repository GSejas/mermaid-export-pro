# Mermaid Export Pro


[![Build](https://img.shields.io/badge/Build-passing-brightgreen?style=flat)](#build-status) [![Coverage](https://img.shields.io/badge/Coverage-75%25-yellow?style=flat)](#test-coverage) [![Version](https://img.shields.io/badge/Version-v1.0.4-blue?style=flat)](#version) [![License](https://img.shields.io/badge/License-MIT-green?style=flat)](#license)


> This extension is free, the name is mainly to set it appart from older unmaintained alternatives. 

![](.\media\mermaid-export-pro-banner.png)

Professional cross-platform Mermaid (from markdown `.md` or Mermaid files `.mmd`) diagram export extension for Visual Studio Code with comprehensive format support and workflow automation.

- [Mermaid Export Pro](#mermaid-export-pro)
    - [🎯 Smart Status Bar Integration](#-smart-status-bar-integration)
    - [📊 Multiple Export Formats](#-multiple-export-formats)
    - [🚀 Batch Operations](#-batch-operations)
    - [⚡ Auto-Export on Save](#-auto-export-on-save)
    - [🎨 Enhanced Markdown Experience](#-enhanced-markdown-experience)
  - [Requirements](#requirements)
    - [Optional (Recommended)](#optional-recommended)
  - [Extension Settings](#extension-settings)
    - [Quick Start](#quick-start)
    - [Commands](#commands)
    - [Context Menus](#context-menus)
  - [Release Notes](#release-notes)
    - [1.0.0](#100)


![](media\features-overview-banner.png)

---

### 🎯 Smart Status Bar Integration
- **Real-time Diagram Count**: Shows number of mermaid diagrams in current file
- **One-Click Export**: Click status bar to export directly when configured
- **Visual Status Indicators**: Different icons for CLI/web/setup states
- **Auto-hide**: Only appears when viewing files with mermaid content

### 📊 Multiple Export Formats
- **SVG**: Vector graphics with perfect scalability
- **PNG**: High-quality raster with transparency support  
- **JPG/JPEG**: Compressed images for web use
- **PDF**: Document-ready format
- **WebP**: Modern web format

### 🚀 Batch Operations  
- **Folder Export**: Process entire directory structures
- **Multi-diagram Support**: Handle multiple mermaid blocks per markdown file
- **Progress Tracking**: Visual feedback for large operations
- **Error Reporting**: Detailed logs of successful/failed exports

### ⚡ Auto-Export on Save
- **File Watcher**: Automatically export when files are saved
- **Configurable**: Toggle on/off with workspace persistence
- **Custom Output**: Configure export directory and naming
- **Smart Detection**: Works with `.mmd` files and markdown blocks

![](2025-08-25-01-56-04.png)

### 🎨 Enhanced Markdown Experience
- **CodeLens**: Export buttons above mermaid code blocks
- **Rich Hover**: Diagram info and export options on hover
- **Command Links**: Direct export from tooltips
- **Type Detection**: Identifies flowchart, sequence, class diagrams, etc.


![](media\export-stragegies-banner.png)

- **CLI Export**: High-quality rendering via Mermaid CLI (@mermaid-js/mermaid-cli)
- **Web Fallback**: Browser-based export when CLI unavailable
- **Auto-detection**: Automatically selects best available method
- **Cross-platform**: Windows, macOS, and Linux support **[UNTESTED: Need testers!!]**

## Requirements

### Optional (Recommended)
- **Node.js**: For CLI export strategy (best quality)
- **@mermaid-js/mermaid-cli**: Automatically detected if globally installed

The extension works without these dependencies using the web export strategy.

## Extension Settings

This extension contributes the following settings:

* `mermaidExportPro.defaultFormat`: Default export format (svg, png, pdf, webp, jpg, jpeg)
* `mermaidExportPro.theme`: Mermaid theme (default, dark, forest, neutral)
* `mermaidExportPro.outputDirectory`: Custom output directory (relative or absolute)
* `mermaidExportPro.autoExport`: Automatically export on file save
* `mermaidExportPro.exportStrategy`: Export strategy preference (cli, web, auto)
* `mermaidExportPro.width`: Default export width in pixels
* `mermaidExportPro.height`: Default export height in pixels  
* `mermaidExportPro.backgroundColor`: Background color for exports

![](media\getting-started-banner.png)

### Quick Start
1. Open a file with mermaid diagrams (`.mmd` or markdown with mermaid blocks)
2. Status bar will show diagram count - click to export
3. Or use Command Palette: `Ctrl+Shift+P` → "Mermaid Export Pro"

### Commands
- **Export Current**: Export active file diagrams
- **Batch Export**: Export all diagrams in folder
- **Toggle Auto Export**: Enable/disable auto-export on save
- **Setup Export Tools**: Configure CLI tools

### Context Menus
- Right-click `.mmd` files → Export Current
- Right-click folders → Batch Export
- CodeLens buttons above mermaid blocks in markdown

## Release Notes

### 1.0.0

Complete implementation of professional mermaid export workflows:

- Smart status bar with diagram counting and one-click export
- Comprehensive batch export with recursive directory support
- Auto-export on save with file watcher integration
- Enhanced markdown support with CodeLens and hover providers
- Extended format support including JPG/JPEG
- Dual export strategy (CLI + Web) for maximum compatibility
- Complete configuration system with workspace persistence
- Cross-platform path handling and error management

---

**Enjoy professional mermaid diagram workflows in VS Code!**
