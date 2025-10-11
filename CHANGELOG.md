# Change Log

All notable changes to the "mermaid-export-pro" extension will be documented in this file.

## [1.0.6] - 2025-08-28

### 🐛 Critical Fixes

#### Auto-Save Functionality Restored
- **Fixed Right-Click "Auto Save"**: Resolved issue where right-click "Quick Export" was incorrectly showing save dialog instead of auto-generating filenames
- **Command Consolidation**: Removed redundant `exportMarkdown` command that was duplicating `exportCurrent` functionality
- **Proper Auto-Naming**: Right-click auto-save now correctly uses smart filename generation next to source files

#### Code Cleanup and Optimization
- **Removed Dead Commands**: Eliminated unused `mermaidExportPro.exportMarkdown` command from codebase
- **Updated Documentation**: Cleaned up references to removed commands in CLAUDE.md and project documentation
- **Command Analysis**: Comprehensive audit identified and removed redundant functionality

### 🔧 Technical Improvements
- **Streamlined Command Set**: Reduced command complexity while maintaining all functionality
- **Better Architecture**: Cleaner separation between dialog-based and auto-save export modes
- **Documentation Updates**: Updated internal documentation to reflect command consolidation

## [1.0.5] - 2025-08-27

### 🚀 Major Quality and Testing Enhancements

#### Comprehensive Testing Infrastructure
- **Debug Command Expansion**: Added testing for all 10 mermaid diagram types (flowchart, sequence, class, state, entity-relationship, user-journey, gantt, pie, gitgraph, mindmap)
- **Test Matrix Coverage**: 60 test combinations (10 diagrams × 2 complexity × 3 formats × 2 strategies)
- **Quality Comparison**: Side-by-side CLI vs Web export validation with detailed metrics
- **Performance Analysis**: Export timing measurements and file size optimization tracking

#### Demo and Documentation Suite
- **Complete Demo Folder**: Created `./demo/` with comprehensive test scenarios
- **GIF Recording Guidelines**: 8 documented scenarios for creating demonstration materials
- **Test File Organization**: Focused test files for each diagram type with simple and complex variants
- **Edge Case Testing**: Unicode support, large diagrams, and error recovery scenarios

#### Export Quality Improvements
- **JPG Background Fix**: Resolved black background issue - JPG exports now default to white background when transparency requested
- **Format Consistency**: Improved background color handling across all export formats and strategies
- **Canvas Rendering**: Enhanced SVG-to-raster conversion with proper transparency handling
- **Cross-Platform Validation**: Verified export quality across Windows, macOS, and Linux

#### Feature Management
- **Premium Feature Flag**: Implemented feature flag system for optional visual enhancements
- **Focused Approach**: Disabled premium features to maintain "do one thing well" philosophy
- **Architecture Documentation**: Documented design decisions in `docs/developers/`
- **Clean Codebase**: Streamlined feature set for better maintainability

### 🐛 Critical Fixes
- Fixed JPG exports rendering with black backgrounds instead of white
- Resolved canvas transparency handling for all raster formats
- Improved error handling for malformed mermaid diagrams
- Enhanced cross-platform file path handling

### 🔧 Technical Improvements
- Expanded debug command to cover all mermaid diagram types
- Added comprehensive test documentation and guidelines
- Implemented feature flag architecture for optional functionality
- Enhanced logging and diagnostics for troubleshooting
- Optimized memory usage for large diagram processing

### 📚 Documentation
- Created comprehensive demo folder with all test scenarios
- Added GIF recording guidelines for marketing materials
- Documented premium feature architecture decisions
- Updated README with latest capabilities and testing infrastructure

## [1.0.4] - 2025-08-25

### 🚀 Major Enhancements

#### Status Bar System Overhaul
- **Customizable Display Formats**: Choose between icon-only, icon+count, or icon+"N Mermaids" text
- **Auto-Export Click**: Status bar click now automatically exports diagrams without save dialog
- **Visual Grouping**: Theme and export status bars positioned adjacently for better UX cohesion
- **Real-time Diagram Counting**: Improved regex-based detection for accurate mermaid block counting

#### Theme Management Improvements  
- **Debounced Notifications**: 3-second delay prevents notification spam during rapid theme cycling
- **Consistent Styling**: Removed unnecessary color cycling from theme status bar
- **Better Visibility**: Fixed theme status bar appearing/disappearing issues

#### Transparent Background Support
- **Universal Implementation**: Fixed transparent background support across all export strategies (CLI, Web, Simple Web)
- **Default Configuration**: Changed default backgroundColor from 'white' to 'transparent'
- **Consistent Behavior**: All export commands now properly respect transparent background setting

#### Language Support Enhancement
- **Native .mmd Support**: Added proper language definition for `.mmd` files
- **Improved Detection**: Better hover provider and CodeLens activation for mermaid files
- **File Association**: Proper syntax highlighting and language features for mermaid files

### 🐛 Bug Fixes
- Fixed status bar disappearing/appearing randomly with diagram counts
- Resolved hardcoded 'white' background defaults throughout codebase
- Fixed CLI strategy ignoring transparent background setting
- Removed duplicate extension activation messages
- Corrected status bar click handler to use 'exportFile' instead of 'exportCurrent' for auto-export

### 🧪 Testing Infrastructure  
- **Comprehensive Test Suite**: Added unit tests for StatusBarManager, ThemeStatusBarManager, and OnboardingManager
- **Vitest Integration**: Modern test runner with proper VS Code API mocking
- **Test Coverage**: Improved coverage tracking and reporting
- **Mock Framework**: Robust VS Code API mocking for reliable unit testing

### 🔧 Technical Improvements
- Enhanced error handling and logging throughout the application
- Better cross-platform path handling and file operations
- Improved configuration management with proper fallbacks
- More robust mermaid content detection using optimized regex patterns

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

#### Mermaid Export Pro - Export Folder System
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

- **Explorer Context**: Right-click folders to Mermaid Export Pro - Export Folder
- **Editor Context**: Right-click mermaid files to export
- **Command Palette**: All commands available via Ctrl+Shift+P

### 🏗️ Architecture

- **Dual Export Strategy**: CLI + Web fallback for maximum compatibility
- **Service-Oriented Design**: Clean separation of concerns
- **Extension Lifecycle**: Proper activation, deactivation, and resource cleanup
- **Configuration Management**: Centralized settings with validation

---

## [1.0.5] Summary

*This release focuses on quality, reliability, and comprehensive testing. With fixes for critical export issues and a complete testing infrastructure covering all 10 mermaid diagram types, version 1.0.5 establishes Mermaid Export Pro as a professional-grade, well-tested VS Code extension that reliably exports mermaid diagrams across all platforms and scenarios.*

---

*Previous releases established the foundation - version 1.0.5 ensures it works flawlessly in all real-world scenarios.*