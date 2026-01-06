# Release Notes - v1.0.11

**Release Date**: January 5, 2026  
**Type**: Feature Release + Bug Fixes  
**Breaking Changes**: None (fully backwards compatible)

---

## 🎉 **Headline Feature**

### Export Folder Now Respects Your Settings!

**Resolves**: [GitHub Issue #2](https://github.com/GSejas/mermaid-export-pro/issues/2) - "Export Folder does not respect user JSON settings"

Finally! Export Folder can work exactly like Quick Export - no dialogs, just respects your configured settings.

#### **New Setting: `mermaidExportPro.batchExportMode`**

Choose your workflow:

- **`"interactive"` (default)** - Original guided wizard (5-6 dialogs)
- **`"automatic"` (NEW!)** - Zero-dialog export using your JSON config

#### **Quick Setup**

Add to your `settings.json`:

```json
{
  "mermaidExportPro.batchExportMode": "automatic",
  "mermaidExportPro.defaultFormat": "svg",
  "mermaidExportPro.theme": "dark",
  "mermaidExportPro.backgroundColor": "transparent",
  "mermaidExportPro.outputDirectory": "exported-diagrams"
}
```

**Then**: Right-click folder → **Export Folder** → Done! 🎊

---

## 🐛 **Bug Fixes**

### 1. Export All - Now Uses Output Directory Setting

**Before**: Always prompted for output directory  
**After**: Checks `mermaidExportPro.outputDirectory` first, only prompts if not configured

**Impact**: Consistent with Quick Export behavior

### 2. Export As - Now Truly Different from Export Current

**Before**: Both commands were functionally identical  
**After**: Export As respects `mermaidExportPro.defaultFormat` setting

**Behavior**:
- Custom format configured? → Uses it (no prompt)
- Default `png`? → Shows format picker

**Impact**: Commands now have distinct purposes

---

## 📊 **Settings Compatibility (Updated)**

Commands that now respect your configuration:

| Setting | Quick Export | Export Folder | Export As | Export All |
|---------|-------------|--------------|-----------|-----------|
| `defaultFormat` | ✅ | ✅ NEW | ✅ NEW | ❌ |
| `theme` | ✅ | ✅ NEW | ❌ | ❌ |
| `backgroundColor` | ✅ | ✅ NEW | ❌ | ❌ |
| `outputDirectory` | ✅ | ✅ NEW | ❌ | ✅ NEW |
| `organizeByFormat` | N/A | ✅ | N/A | N/A |

---

## ⚙️ **Configuration Enhancements**

### New ConfigManager Methods

Three new getters for better settings access:
- `getBatchExportMode()` - Returns export mode preference
- `getBatchExportDefaultDepth()` - Returns folder scan depth
- `getOrganizeByFormat()` - Returns format organization preference

---

## 📚 **Documentation**

### New Files

1. **`docs/FIXES-IMPLEMENTATION-SUMMARY.md`**
   - Complete technical implementation details
   - Before/after comparisons
   - Usage examples
   - Testing checklist

2. **`docs/COMMAND-TRACKER.csv`**
   - All 20 commands documented
   - Feature matrix
   - Settings compatibility
   - Known issues tracking

3. **`.github/issue-2-resolution-comment.md`**
   - Ready-to-post GitHub comment
   - Resolution details
   - User-facing documentation

### Updated Files

- `README.md` - New `batchExportMode` setting documented
- `CHANGELOG.md` - Comprehensive v1.0.11 entry
- `package.json` - Version bumped to 1.0.11

---

## ✅ **Quality Assurance**

### Test Results

- **371/371 unit tests** passing (100%)
- **TypeScript compilation**: Zero errors
- **ESLint**: No warnings
- **Production build**: Successful

### Code Quality

- Unified settings access via ConfigManager
- Consistent configuration patterns
- Reduced code duplication
- Better maintainability

---

## 🔄 **Migration Guide**

### No Breaking Changes

All existing workflows continue unchanged:
- Export Folder defaults to interactive mode
- Export All prompts if no output directory configured
- Export As shows picker with default format

### Opt-In to New Behavior

1. Set `"mermaidExportPro.batchExportMode": "automatic"`
2. Configure your preferences in `settings.json`
3. Enjoy zero-dialog exports!

---

## 🎯 **Use Cases**

### Perfect For:

1. **Power Users** - Set preferences once, export everywhere
2. **CI/CD Pipelines** - Automated diagram generation
3. **Documentation Workflows** - Consistent bulk exports
4. **Presentation Prep** - Quick batch processing

### When to Use Each Mode:

**Interactive Mode** (default):
- First-time exports
- Need to see options
- One-off custom exports
- Learning the tool

**Automatic Mode** (new):
- Regular exports with same settings
- Batch processing workflows
- Scripted/automated use
- Minimal interruption needed

---

## 📦 **What's Next?**

### Upcoming Features

1. Integration tests for automatic mode
2. Performance optimizations for large folders
3. More granular settings control
4. Enhanced error reporting

### Community Feedback

We'd love to hear:
- Does automatic mode work for your workflow?
- What other settings should be respected?
- Feature requests for future releases

**Report issues**: [GitHub Issues](https://github.com/GSejas/mermaid-export-pro/issues)  
**Email**: jsequeira03@gmail.com

---

## 🙏 **Credits**

Special thanks to:
- **@alanlivio** for reporting [Issue #2](https://github.com/GSejas/mermaid-export-pro/issues/2)
- All beta testers providing feedback
- The mermaid.js community

---

## 📥 **Download**

- **VS Code Marketplace**: [Mermaid Export Pro](https://marketplace.visualstudio.com/items?itemName=GSejas.mermaid-export-pro)
- **GitHub Releases**: [v1.0.11](https://github.com/GSejas/mermaid-export-pro/releases/tag/v1.0.11)

---

## 🔗 **Links**

- [Full Changelog](./CHANGELOG.md)
- [Implementation Details](./docs/FIXES-IMPLEMENTATION-SUMMARY.md)
- [Command Reference](./docs/COMMAND-TRACKER.csv)
- [GitHub Repository](https://github.com/GSejas/mermaid-export-pro)

---

**Version**: 1.0.11  
**Released**: January 5, 2026  
**License**: MIT
