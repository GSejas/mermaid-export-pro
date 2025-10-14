# Release Checklist - Mermaid Export Pro

**Purpose**: Comprehensive pre-release verification to catch integration bugs and ensure all features work end-to-end.

---

## 🏗️ Build & Compilation

- [ ] **TypeScript compilation passes**
  ```powershell
  npm run check-types
  ```
  - Expected: No errors
  - If fails: Fix type errors before continuing

- [ ] **ESLint passes**
  ```powershell
  npm run lint
  ```
  - Expected: No errors or warnings
  - If fails: Fix lint issues

- [ ] **Production build succeeds**
  ```powershell
  npm run compile
  ```
  - Expected: Clean build
  - Check: `out/` directory contains compiled JS

---

## 🧪 Automated Tests

- [ ] **Unit tests pass**
  ```powershell
  npm run test:unit
  ```
  - Expected: All tests green
  - Target: 100% pass rate

- [ ] **Integration tests pass**
  ```powershell
  npm run test
  ```
  - Expected: All tests green
  - Special attention to: telemetry, auto-naming, versioned mode

- [ ] **Test coverage acceptable**
  - Check: Coverage report generated
  - Target: >80% line coverage for core modules

---

## 📦 Package Creation

- [ ] **Create .vsix package**
  ```powershell
  npm run package
  ```
  - Expected: `.vsix` file created (e.g., `mermaid-export-pro-1.0.10.vsix`)
  - Check: File size reasonable (< 5MB)

- [ ] **Install locally from .vsix**
  - Open VS Code
  - Extensions → Install from VSIX
  - Select the generated `.vsix` file
  - Verify: Extension appears in installed extensions

---

## 🎯 Core Functionality

### Basic Export
- [ ] **Single .mmd file export**
  - Open `demo/test.mmd`
  - Right-click → "Export Mermaid Diagram"
  - Select SVG format
  - Verify: File exported successfully, opens correctly

- [ ] **Markdown with code blocks**
  - Open `demo/01-flowchart-examples.md`
  - Right-click → "Export All Mermaid Diagrams"
  - Verify: All diagrams exported

- [ ] **Multiple formats**
  - Export same diagram as: SVG, PNG, PDF
  - Verify: All formats work, files are valid

### Export Strategies
- [ ] **CLI strategy works**
  - Ensure `@mermaid-js/mermaid-cli` is installed
  - Export a diagram
  - Check: Output channel shows "Using CLI strategy"
  
- [ ] **Web fallback works**
  - Uninstall CLI tool or disable it
  - Export a diagram
  - Check: Falls back to web strategy

### Auto-Naming Modes
- [ ] **Overwrite mode**
  - Set `mermaidExportPro.autoNaming.mode` to `overwrite`
  - Export same diagram twice
  - Verify: Second export overwrites first (no `-1`, `-2` suffixes)

- [ ] **Versioned mode**
  - Set `mermaidExportPro.autoNaming.mode` to `versioned`
  - Export same diagram 3 times
  - Verify: Files named `file.svg`, `file-1.svg`, `file-2.svg`

- [ ] **Skip mode (versioned=true)**
  - Set `mermaidExportPro.autoNaming.mode` to `versioned`
  - Export diagram, modify diagram, export again
  - Verify: Changed diagram exports, unchanged diagram skips (no progress flash!)

---

## ✨ Advanced Features

### Batch Export
- [ ] **Export all from folder**
  - Right-click workspace folder
  - "Batch Export All Mermaid Files"
  - Verify: All `.mmd` and `.md` files processed

### Quick Export
- [ ] **Quick export command**
  - Open markdown with multiple diagrams
  - Command Palette → "Quick Export All Diagrams"
  - Verify: All exported without dialogs

### Status Bar
- [ ] **Diagram count shown**
  - Open file with 3 mermaid diagrams
  - Check: Status bar shows "🎨 3 diagrams"
  
- [ ] **One-click export**
  - Click status bar item
  - Verify: Export starts immediately

### CodeLens
- [ ] **Export buttons appear**
  - Open markdown with mermaid code block
  - Check: "Export as SVG | PNG | PDF" appears above block
  
- [ ] **Format selection works**
  - Click "Export as PNG"
  - Verify: PNG file created (not SVG)

---

## 🔧 Configuration & Settings

### Output Paths
- [ ] **Custom output directory**
  - Set `mermaidExportPro.outputDirectory` to custom path
  - Export diagram
  - Verify: File created in custom directory

- [ ] **Relative paths work**
  - Set output to `./exports`
  - Verify: Created relative to workspace

### Export Options
- [ ] **Image quality settings**
  - Set PNG quality to 0.5
  - Export PNG
  - Verify: Lower quality/smaller file

- [ ] **Theme customization**
  - Set theme to `dark`
  - Export diagram
  - Verify: Dark theme applied

- [ ] **Transparent backgrounds**
  - Enable `transparentBackground`
  - Export PNG
  - Verify: No white background

---

## 📊 Optional Features (CRITICAL - These were missed before!)

### Telemetry (Bug Fix Verification)
- [ ] **Enable telemetry**
  - Settings → `mermaidExportPro.telemetry.enabled` → ✅ ON
  - Command Palette → "Show Usage Statistics"
  - Verify: Shows "✅ Enabled"

- [ ] **Verify tracking works**
  - Export 5 diagrams (mix of formats: 2 SVG, 2 PNG, 1 PDF)
  - Command Palette → "Show Usage Statistics"
  - **CRITICAL**: Verify stats are NOT all zeros:
    - Total exports: 5
    - By format: SVG=2, PNG=2, PDF=1
    - Export times: > 0ms
    - File sizes: > 0 bytes

- [ ] **Export telemetry data**
  - Command Palette → "Export Usage Data"
  - Verify: JSON file created with correct data

- [ ] **Clear telemetry data**
  - Command Palette → "Clear Usage Statistics"
  - Show statistics again
  - Verify: All zeros

- [ ] **Disabled telemetry doesn't track**
  - Disable telemetry in settings
  - Export 3 diagrams
  - Show statistics
  - Verify: Still shows zeros (no tracking when disabled)

### Health Monitoring
- [ ] **Background health checks work**
  - Wait 5 minutes after activating extension
  - Check: Output channel shows health check logs

### Diagnostics
- [ ] **Diagnostics report generates**
  - Command Palette → "Run Diagnostics"
  - Verify: Report shows system info, strategy status, configuration

---

## 🎨 UI & UX

### Progress Notifications
- [ ] **Progress shown during export**
  - Export large diagram
  - Verify: "Exporting mermaid diagram..." notification appears
  - Verify: Progress percentage increases

- [ ] **No progress flash in skip mode**
  - Set mode to `versioned`
  - Export unchanged diagram
  - **CRITICAL**: Verify NO progress notification flashes
  - Expected: Info message "Diagram unchanged, skipping export"

### Error Messages
- [ ] **Invalid mermaid syntax**
  - Create `.mmd` file with garbage text
  - Attempt export
  - Verify: Clear error message (not stack trace)

- [ ] **Permission errors**
  - Try exporting to read-only directory
  - Verify: Helpful error message

### Hover Tooltips
- [ ] **Hover over mermaid code**
  - Open markdown with mermaid block
  - Hover over code
  - Verify: Tooltip shows "Mermaid diagram" with preview

---

## 🖼️ Output Validation

### SVG Files
- [ ] **SVG opens in browser**
  - Export as SVG
  - Open in browser
  - Verify: Renders correctly

- [ ] **SVG contains proper metadata**
  - Check: XML declaration present
  - Check: viewBox attribute set

### PNG Files
- [ ] **PNG has correct dimensions**
  - Export as PNG with custom size
  - Check: Image dimensions match settings

- [ ] **PNG transparency works**
  - Enable transparent background
  - Export PNG
  - Open in image editor
  - Verify: Alpha channel present

### PDF Files
- [ ] **PDF opens correctly**
  - Export as PDF
  - Open in PDF reader
  - Verify: Single page, correct dimensions

---

## 🐛 Edge Cases & Known Issues

### Large Diagrams
- [ ] **Complex diagram with 50+ nodes**
  - Open `demo/05-edge-cases.md`
  - Export large diagram
  - Verify: Completes within timeout (30s)

### Special Characters
- [ ] **Filenames with spaces**
  - File named `test diagram.mmd`
  - Verify: Exports without issues

- [ ] **Unicode in diagram content**
  - Diagram with emoji or non-ASCII text
  - Verify: Renders correctly

### Multiple Workspaces
- [ ] **Multi-root workspace**
  - Open workspace with 2+ folders
  - Export from each folder
  - Verify: Correct output paths

---

## 📝 Documentation

- [ ] **README up to date**
  - Version number matches `package.json`
  - Features list accurate
  - Screenshots current

- [ ] **CHANGELOG updated**
  - All changes since last version listed
  - Breaking changes highlighted
  - Bug fixes documented

- [ ] **User guide accurate**
  - `docs/users/USER-GUIDE.md` reflects current features
  - New features documented

---

## 🚀 Pre-Release Validation

### Version Number
- [ ] **package.json version bumped**
  - Check: Version incremented (1.0.9 → 1.0.10)
  - Follows semver: MAJOR.MINOR.PATCH

- [ ] **Version in README matches**
  - Search README for old version
  - Update to new version

### Git Status
- [ ] **All changes committed**
  ```powershell
  git status
  ```
  - Expected: "nothing to commit, working tree clean"

- [ ] **Commit message follows convention**
  - Format: `fix: [description]` or `feat: [description]`
  - Example: `fix: telemetry not tracking exports in v1.0.9`

### GitHub Actions
- [ ] **Push to GitHub**
  ```powershell
  git push origin main
  ```
  
- [ ] **Wait for CI/CD workflows**
  - Check: Tests workflow passes ✅
  - Check: Integration Tests workflow passes ✅
  
- [ ] **Review workflow logs**
  - Open GitHub Actions
  - Check: No unexpected warnings
  - Check: All test suites pass

---

## 🏷️ Release Tagging

- [ ] **Create release tag**
  ```powershell
  git tag v1.0.10
  git push origin v1.0.10
  ```

- [ ] **Create GitHub Release**
  - Go to GitHub → Releases → New Release
  - Tag: `v1.0.10`
  - Title: `v1.0.10 - Telemetry Integration Fix`
  - Description: Copy from CHANGELOG
  - Attach: `.vsix` file

---

## 📢 Post-Release

- [ ] **Monitor GitHub Issues**
  - Check for new bug reports within 24 hours
  - Respond to user feedback

- [ ] **Update marketplace listing**
  - Verify: New version appears on VS Code Marketplace
  - Check: Download count tracking

- [ ] **Announce release**
  - Update project README
  - Post in relevant communities (if applicable)

---

## ❌ Failure Recovery

If any checklist item fails:

1. **DO NOT RELEASE** - Fix the issue first
2. Document the failure in GitHub Issues
3. Create test case to prevent regression
4. Re-run full checklist after fix

---

## 📋 Checklist Summary

**Total Items**: 85  
**Critical Items**: 12 (marked as **CRITICAL** above)

**Pass Criteria**: 
- ✅ 100% of critical items must pass
- ✅ 95%+ of total items must pass
- ❌ Any failing critical item blocks release

**Estimated Time**: 30-45 minutes for full checklist

---

## 🎯 Lessons Learned Integration

Based on [TELEMETRY-INTEGRATION-BUG.md](./TELEMETRY-INTEGRATION-BUG.md):

### Added Verifications
1. **Telemetry E2E Test** (Items 45-50)
   - Was missing in v1.0.9 release
   - Now mandatory: Verify actual data collection, not just UI

2. **Progress Flash Check** (Item 76)
   - Specific test for "no progress flash in skip mode"
   - Prevents regression of bug from v1.0.9

3. **Optional Features Section**
   - Dedicated section for opt-in features
   - Ensures features are tested even if disabled by default

### Review Questions for Each Feature
Ask yourself:
- ✅ Does the UI work?
- ✅ Does the backend work?
- ✅ Are they connected?
- ✅ Does the complete user journey work?

---

## 📚 Related Documents

- [TELEMETRY-INTEGRATION-BUG.md](./TELEMETRY-INTEGRATION-BUG.md) - Why this checklist exists
- [PROGRESS-NOTIFICATION-FIX.md](./PROGRESS-NOTIFICATION-FIX.md) - v1.0.10 bug fix
- [TEST-COVERAGE-ANALYSIS.md](./TEST-COVERAGE-ANALYSIS.md) - Test gap analysis
- [PROJECT_PLAN.md](./PROJECT_PLAN.md) - Overall project roadmap

---

**Last Updated**: v1.0.10  
**Next Review**: Before v1.1.0 release
