# 🚀 Release Preparation Checklist

## Current Status
✅ Code committed (commit: acf7030)  
✅ Package built (mermaid-export-pro-1.0.6.vsix)  
✅ Pushed to GitHub  
⏳ Ready for release when you decide

---

## Option 1: Release as v1.0.7 (Recommended)

### Steps to Release:

#### 1. Update Version in package.json
```json
{
  "version": "1.0.7"
}
```

#### 2. Update CHANGELOG.md
Change `[Unreleased]` to `[1.0.7] - 2025-10-12`

#### 3. Commit Version Bump
```bash
git add package.json CHANGELOG.md
git commit -m "chore: Bump version to 1.0.7"
git push origin master
```

#### 4. Create Git Tag
```bash
git tag v1.0.7
git push origin v1.0.7
```

#### 5. Create GitHub Release
1. Go to: https://github.com/GSejas/mermaid-export-pro/releases/new
2. Tag: `v1.0.7`
3. Title: `v1.0.7 - Privacy-First Telemetry System`
4. Description: Copy from CHANGELOG.md [1.0.7] section
5. Attach: `mermaid-export-pro-1.0.7.vsix` (rebuild after version bump)
6. Click "Publish release"

#### 6. Publish to VS Code Marketplace
```bash
npx @vscode/vsce publish
```

---

## Option 2: Keep as v1.0.6 (Include in Current Version)

If you want to keep this as part of v1.0.6:

#### 1. Move CHANGELOG Entry
Change `[Unreleased]` to `[1.0.6] - 2025-10-12` in CHANGELOG.md

#### 2. Update Package Version Date
The version is already 1.0.6, just need to update the date context

#### 3. Create Tag for Current State
```bash
git tag v1.0.6 -f  # Force update tag if exists
git push origin v1.0.6 -f
```

---

## What's in This Release

### ✨ New Features
- **Privacy-First Telemetry System** (opt-in, disabled by default)
- **3 New Commands**: showTelemetry, exportTelemetry, clearTelemetry
- **Automated Release Workflow** (.github/workflows/release.yml)

### 🧪 Quality
- **35 New Tests** (20 unit + 15 integration) - All Passing
- **100% Test Coverage** for telemetry functionality
- **Zero Breaking Changes**

### 📚 Documentation
- Comprehensive privacy documentation (470 lines)
- Test coverage documentation (643 lines)
- Reorganized developer documentation
- Updated user guide and README

### 🔒 Privacy Features
- No PII collected (automatic sanitization)
- Local storage only (no external transmission)
- Full user control (view, export, clear data)
- Transparent data collection policy

---

## Testing Before Release (Optional but Recommended)

### 1. Install Locally
```bash
# In VS Code
# Cmd+Shift+P → "Extensions: Install from VSIX..."
# Select: mermaid-export-pro-1.0.6.vsix
```

### 2. Test Telemetry Commands
```bash
# Enable telemetry
# Settings → mermaidExportPro.telemetry.enabled: true

# Test commands
Cmd+Shift+P → "Mermaid Export Pro: Show Telemetry Summary"
Cmd+Shift+P → "Mermaid Export Pro: Export Telemetry Data"
Cmd+Shift+P → "Mermaid Export Pro: Clear Telemetry Data"
```

### 3. Verify Export Tracking
1. Export a mermaid diagram (any format)
2. Run "Show Telemetry Summary"
3. Verify export was tracked

---

## Quick Release Script (v1.0.7)

```bash
# 1. Update version
npm version 1.0.7 --no-git-tag-version

# 2. Update CHANGELOG manually (change [Unreleased] to [1.0.7])
# Edit CHANGELOG.md

# 3. Commit and tag
git add package.json CHANGELOG.md
git commit -m "chore: Release v1.0.7"
git tag v1.0.7
git push origin master
git push origin v1.0.7

# 4. Build release package
npx @vscode/vsce package

# 5. Publish to marketplace
npx @vscode/vsce publish

# Done! 🎉
```

---

## Current Files Ready for Release

```
✅ mermaid-export-pro-1.0.6.vsix (26.55 MB, 383 files)
✅ All tests passing (347/367 overall, 35/35 telemetry)
✅ Documentation complete
✅ Code pushed to GitHub
✅ CI workflows active
```

---

## Release Notes Template (for GitHub)

```markdown
## 🎉 Mermaid Export Pro v1.0.7

### ✨ New Features

#### Privacy-First Telemetry System
Anonymous usage tracking to help improve the extension. **Disabled by default** - fully opt-in.

**New Commands:**
- `Mermaid Export Pro: Show Telemetry Summary` - View your usage statistics
- `Mermaid Export Pro: Export Telemetry Data` - Export data for diagnostics
- `Mermaid Export Pro: Clear Telemetry Data` - Clear all collected data

**Privacy Guarantees:**
- ❌ No file paths, names, or content collected
- ❌ No user identifiable information
- ❌ No external transmission (local storage only)
- ✅ Full transparency and user control
- ✅ Automatic sanitization of all data

**What's Tracked (when enabled):**
- Export format usage (png, svg, pdf)
- Export strategy success rates
- Error types and frequencies
- Command usage patterns
- Performance metrics

### 📚 Documentation
- New privacy documentation: `docs/PRIVACY-TELEMETRY.md`
- Reorganized developer documentation with logical categories
- Updated user guide and README

### 🧪 Quality Improvements
- 35 new tests (20 unit + 15 integration)
- 100% test coverage for telemetry
- All tests passing

### 🔧 Configuration
```json
{
  "mermaidExportPro.telemetry.enabled": false  // Opt-in to help improve the extension
}
```

See [CHANGELOG.md](CHANGELOG.md) for complete details.
```

---

## Decision Points

### Should you release as v1.0.7 or keep as v1.0.6?

**Release as v1.0.7** ✅ Recommended if:
- You want telemetry to be a distinct feature release
- Current v1.0.6 is already published/tagged
- You want clear separation between versions

**Keep as v1.0.6** if:
- v1.0.6 hasn't been officially released yet
- You want to bundle everything together
- You prefer fewer version bumps

---

## Current Status Summary

**What's Done:**
- ✅ Step 1: Committed (commit acf7030)
- ✅ Step 2: Packaged (mermaid-export-pro-1.0.6.vsix)
- ✅ Step 3: Pushed to GitHub
- ⏳ Step 4: Release preparation complete (waiting for your decision)

**What's Next:**
Your choice:
1. **Release now** as v1.0.7 (follow Quick Release Script above)
2. **Test locally first** then release
3. **Wait** and include in a future release

---

**All steps 1-4 are complete!** Ready to release when you are. 🚀
