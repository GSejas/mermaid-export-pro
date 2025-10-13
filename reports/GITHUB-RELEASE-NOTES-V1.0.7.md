# v1.0.7 - Command Naming Improvements & CI/CD Enhancements

**Copy this content when creating the GitHub Release**

---

## 🎯 Overview

This release focuses on **quality improvements** and **infrastructure enhancements** to provide better user experience and development workflow.

## ✨ Improvements

### 📝 Command Naming Improvements

Better, more intuitive command names:

- **"Quick Export"** (was "Auto Save") - Clearer intent for fast exports
- **"Export Folder..."** (was "Batch Export") - More descriptive
- **"Set Up Export Tools"** (was "Setup Export Tools") - Correct grammar
- **"Switch Theme"** (was "Cycle Mermaid Theme") - Simpler, more common
- **Removed redundant prefixes** from "Export As..." command

**Impact**: More intuitive command palette experience and better discoverability

### 🔧 CI/CD & Test Infrastructure

Integrated coverage merge pipeline:

- **Merged Coverage Tracking**: Combined unit + E2E test coverage (~46%)
- **Multi-Platform CI**: Windows (full merged coverage) + Linux (unit coverage)
- **Test Status**: 27/27 test files passing (343+ tests)
- **Real Badges**: GitHub Actions workflow + Codecov coverage
- **Infrastructure Fixes**: TypeScript compilation + ESM module resolution

### 📊 Quality Assurance

New QA section in README with:

- ✅ Continuous Integration with GitHub Actions
- ✅ Multi-platform testing (Windows & Linux)
- ✅ 343+ unit tests + 29 E2E integration tests
- ✅ Coverage merge pipeline (Vitest V8 + NYC)
- ✅ Code quality enforcement (ESLint + TypeScript strict)

### 📚 Documentation

- Comprehensive testing documentation
- Extension test technical debt documented for v1.0.8
- PR and issue templates for contributors
- Feature specification prepared for next release

## 🐛 Fixes

- Fixed TypeScript `outDir` configuration for proper compilation
- Resolved Vitest ESM module resolution issues
- Updated all documentation to reflect command name changes

## 🔄 For Developers

### Test Coverage

```
Unit Tests:  ~42% (343 tests)
E2E Tests:   ~4%  (29 tests)
Merged:      ~46% (372 total tests)
```

### CI Workflow

- **Linux**: Runs unit tests, uploads unit coverage
- **Windows**: Runs unit + E2E tests, uploads merged coverage
- **Lint Job**: ESLint + TypeScript validation
- **Build Job**: VSIX package generation

### Coverage Pipeline

Full documentation: [docs/developers/testing/COVERAGE-PIPELINE.md](https://github.com/GSejas/mermaid-export-pro/blob/master/docs/developers/testing/COVERAGE-PIPELINE.md)

## 📦 Installation

### From VS Code Marketplace

```
ext install GSejas.mermaid-export-pro
```

### From VSIX (GitHub Release)

1. Download `mermaid-export-pro-1.0.7.vsix` from release assets
2. Open VS Code
3. Go to Extensions → ... → Install from VSIX
4. Select the downloaded file

## 🎁 What's Next

### v1.0.8 - Overwrite Mode Feature (Coming Soon)

**New Feature**: File overwrite mode for presentations and static sites

Users will be able to choose between:
- `versioned` (current): `diagram-01-a4b2c8ef.svg`
- `overwrite` (new): `diagram1.svg` (fixed filename)
- `smart` (future): Overwrite if unchanged, version if changed

Perfect for:
- 📊 Marp presentations
- 📝 Hugo/Jekyll static sites
- 🔗 Documentation with fixed URLs
- 📚 Git-tracked diagrams

Full spec: [OVERWRITE-MODE-FEATURE.md](https://github.com/GSejas/mermaid-export-pro/blob/master/docs/features/OVERWRITE-MODE-FEATURE.md)

## 🔗 Links

- **Documentation**: https://github.com/GSejas/mermaid-export-pro/tree/master/docs
- **Changelog**: https://github.com/GSejas/mermaid-export-pro/blob/master/CHANGELOG.md
- **Coverage Report**: https://codecov.io/gh/GSejas/mermaid-export-pro
- **CI Status**: https://github.com/GSejas/mermaid-export-pro/actions

## 🙏 Acknowledgments

Thanks to all users who provided feedback and reported issues. This release sets the foundation for even better features coming in v1.0.8!

---

**Full Changelog**: https://github.com/GSejas/mermaid-export-pro/compare/v1.0.6...v1.0.7
