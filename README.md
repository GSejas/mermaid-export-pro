# Mermaid Export Pro


[![Build](https://img.shields.io/badge/Build-passing-brightgreen?style=flat)](#build-status) [![Coverage](https://img.shields.io/badge/Coverage-85%25-green?style=flat)](#test-coverage) [![Version](https://img.shields.io/badge/Version-v1.0.5-blue?style=flat)](#version) [![License](https://img.shields.io/badge/License-MIT-green?style=flat)](#license)

![](media/mermaid-lens_temp_128.gif)

> This extension is free, the name is mainly to set it appart from older unmaintained alternatives. 
> This extension is in BETA Mode, please report issues @ `jsequeira03@gmail.com`. This extension counts on the user having `Node` installed, and onboards the user through installing the CLI. 

![](.\media\mermaid-export-pro-banner.png)

Professional cross-platform Mermaid (from markdown `.md` or Mermaid files `.mmd`) diagram export extension for Visual Studio Code with comprehensive format support and workflow automation.


![](media/features-overview-banner.png)

---
![](media/status-bar_128colors_32colors.gif)

### 🎯 Smart Status Bar Integration
- **Real-time Diagram Count**: Shows number of mermaid diagrams in current file
- **One-Click Export**: Click status bar to export directly when configured
- **Visual Status Indicators**: Different icons for CLI/web/setup states
- **Auto-hide**: Only appears when viewing files with mermaid content


![](media/export-as_128colors_32colors.gif)

### 📊 Multiple Export Formats
- **SVG**: Vector graphics with perfect scalability
- **PNG**: High-quality raster with transparency support  
- **JPG/JPEG**: Compressed images for web use
- **PDF**: Document-ready format
- **WebP**: Modern web format


![](media\batch-export_128colors_32colors.gif)

### 🚀 Batch Operations  
- **Folder Export**: Process entire directory structures
- **Multi-diagram Support**: Handle multiple mermaid blocks per markdown file
- **Progress Tracking**: Visual feedback for large operations
- **Error Reporting**: Detailed logs of successful/failed exports

![](media/auto-export_32colors_128colors.gif)

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

### 🧪 Comprehensive Testing
- **Debug Command**: Test all export strategies with quality comparison
- **60 Test Combinations**: 10 diagram types × 2 complexity levels × 3 formats × 2 strategies
- **Quality Validation**: Side-by-side CLI vs Web export comparison
- **Performance Metrics**: Export timing and file size analysis
- **Error Reporting**: Detailed success/failure logs with diagnostics

### 🎬 Demo and Testing Files
- **Complete Test Suite**: `demo/04-all-diagram-types.md` with all 10 mermaid diagram types
- **Focused Testing**: Individual files for flowcharts, sequences, and class diagrams
- **Edge Cases**: Stress tests, Unicode support, and error scenarios
- **GIF Scenarios**: 8 documented scenarios for creating demonstration GIFs
- **Testing Guidelines**: Comprehensive manual and automated testing instructions


![](media/export-stragegies-banner.png)

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

![](media/settings_128colors_32colors.gif)

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
- **Export Folder...**: Export all diagrams in folder
- **Toggle Auto Export**: Enable/disable auto-export on save
- **Set Up Export Tools**: Configure CLI tools
- **Debug Export**: Run comprehensive test suite with quality comparison
- **Export As**: Choose specific format and options for current file

### Context Menus
- Right-click `.mmd` files → Export Current
- Right-click folders → Export Folder...
- CodeLens buttons above mermaid blocks in markdown

## Release Notes

### 1.0.5 (Latest)

**Major Quality and Testing Improvements:**

- **Fixed JPG Background Issue**: JPG exports now default to white background instead of black
- **Comprehensive Testing Suite**: Added debug command testing all 10 mermaid diagram types
- **Demo Folder**: Complete test scenarios in `./demo/` with GIF recording guidelines
- **Quality Comparison**: Side-by-side CLI vs Web export validation
- **Enhanced Error Handling**: Better diagnostics and recovery for export failures
- **Performance Optimization**: Improved export speeds and memory usage
- **Cross-Platform Validation**: Tested on Windows
  - Pending: macOS, and Linux environments

### 1.0.4

**Status Bar and Theme Enhancements:**

- Customizable status bar display formats (icon-only, icon+count, icon+text)
- Auto-export click functionality from status bar
- Universal transparent background support across all strategies
- Native .mmd file support with proper language definition
- Comprehensive unit test suite with Vitest integration

### 1.0.0

**Foundation Release:**

- Smart status bar with diagram counting and one-click export
- Comprehensive Mermaid Export Pro - Export Folder with recursive directory support
- Auto-export on save with file watcher integration
- Enhanced markdown support with CodeLens and hover providers
- Extended format support including JPG/JPEG
- Dual export strategy (CLI + Web) for maximum compatibility
- Complete configuration system with workspace persistence
- Cross-platform path handling and error management

---

**Enjoy professional mermaid diagram workflows in VS Code!**
