# Developer Documentation - Index & Restructuring Guide

**Last Updated**: October 12, 2025  
**Restructuring Date**: October 12, 2025

## 📋 Overview

This directory contains comprehensive developer documentation for the Mermaid Export Pro VS Code extension. The documentation has been reorganized into logical categories for better navigation and maintainability.

## 🗂️ Directory Structure

```
docs/developers/
├── README.md (this file)               # Navigation index
├── architecture/                        # System design & architecture docs
├── guides/                             # How-to guides and tutorials
├── testing/                            # Testing strategies and reports
├── decisions/                          # Architecture Decision Records (ADRs)
└── [legacy files - to be organized]   # Files pending categorization
```

## 📁 Category Descriptions

### `/architecture/` - System Design & Architecture

**Purpose**: Documents describing the overall system design, component architecture, and technical blueprints.

**Current Files**:
- `BATCH-EXPORT-V2-ARCHITECTURE.md` - Batch export system design
- `timeout-architecture.md` - Timeout management architecture
- `DOCUMENT-CATHEDRAL.md` - Overall extension architecture

**What Belongs Here**:
- System architecture diagrams
- Component interaction flows
- Service layer designs
- Strategy pattern implementations
- Data flow documentation

---

### `/guides/` - How-To Guides & Tutorials

**Purpose**: Step-by-step guides for developers working on the extension.

**Current Files**:
- `RELEASE-PROCESS.md` - Complete release workflow guide
- `MERMAID-EXTENSIONS-GUIDE.md` - Guide to mermaid extension ecosystem
- `BADGES-SETUP-GUIDE.md` - Setting up badges for README
- `coverage-integration-guide.md` - Integrating code coverage

**What Belongs Here**:
- Setup instructions
- Development workflows
- Release procedures
- Testing guides
- Tool configuration guides
- Onboarding documentation

---

### `/testing/` - Testing Documentation

**Purpose**: Testing strategies, test coverage reports, and quality assurance documentation.

**Current Files**:
- `TEST-SCENARIOS.md` - Comprehensive test scenarios
- `TEST-COVERAGE-ANALYSIS.md` - Coverage analysis reports
- `TESTING-STRATEGY-2025.md` - Overall testing strategy
- `test-coverage-tracker.csv` - Coverage tracking spreadsheet
- `test-case-tracker.csv` - Test case tracking
- `e2e-testing-gaps.csv` - E2E testing gap analysis

**What Belongs Here**:
- Testing strategies
- Test coverage reports
- Test case documentation
- Quality metrics
- Bug analysis
- Performance benchmarks

---

### `/decisions/` - Architecture Decision Records (ADRs)

**Purpose**: Records of significant technical decisions, their context, and rationale.

**Current Files**:
- `DESIGN_DECISIONS.md` - Core design decisions
- `premium-features-decision.md` - Premium features decision
- `COMMAND-NAMING-ANALYSIS.md` - Command naming decisions

**What Belongs Here**:
- Architecture Decision Records (ADRs)
- Technology selection rationale
- Design pattern choices
- Trade-off analyses
- Performance optimization decisions

---

## 🔍 Quick Reference

### By Topic

#### **CI/CD & Automation**
- `guides/RELEASE-PROCESS.md` - How to create releases
- CI/CD files (pending reorganization):
  - `CI-CD-LEARNINGS.md`
  - `CICD-IMPLEMENTATION-PLAN.md`
  - `CICD-SUMMARY.md`
  - `CI-WORKFLOW-DEBUGGING.md`

#### **Testing**
- `testing/TEST-SCENARIOS.md` - All test scenarios
- `testing/TESTING-STRATEGY-2025.md` - Testing approach
- `testing/TEST-COVERAGE-ANALYSIS.md` - Coverage reports
- Testing files (pending reorganization):
  - `DIALOG-FREE-TESTING.md`
  - `DIALOG-FREE-TESTING-SUMMARY.md`
  - `VITEST-CONFIG-FIX.md`
  - `VSCODE-MOCK-FIX-URGENT.md`

#### **Architecture**
- `architecture/BATCH-EXPORT-V2-ARCHITECTURE.md` - Batch export design
- `architecture/timeout-architecture.md` - Timeout system
- `architecture/DOCUMENT-CATHEDRAL.md` - Overall architecture

#### **Project Management**
- Project tracking files (pending reorganization):
  - `PROJECT_PLAN.md`
  - `FEATURE_TRACKING.csv`
  - `component-tracker.csv`
  - `readiness-metrics.csv`

#### **Releases & Validation**
- `RELEASE-READINESS-v1.0.7.md`
- `VALIDATION-COMPLETE.md`
- `EDITORIAL-REVIEW-SUMMARY.md`

---

## 📦 Migration Plan

### Phase 1: Current State ✅
- Created new directory structure
- This index document created
- Identified file categories

### Phase 2: File Migration (In Progress)
Files will be moved into appropriate directories:

#### **To `/architecture/`**:
- [ ] `BATCH-EXPORT-V2-ARCHITECTURE.md` ✅
- [ ] `timeout-architecture.md` ✅
- [ ] `DOCUMENT-CATHEDRAL.md` ✅
- [ ] `CODELENS-VALIDATION-DESIGN.md`
- [ ] `REFACTOR-ANALYSIS.md`

#### **To `/guides/`**:
- [ ] `RELEASE-PROCESS.md` ✅
- [ ] `MERMAID-EXTENSIONS-GUIDE.md` ✅
- [ ] `BADGES-SETUP-GUIDE.md` ✅
- [ ] `coverage-integration-guide.md` ✅
- [ ] `COVERAGE-MERGE-IMPLEMENTATION.md`

#### **To `/testing/`**:
- [ ] `TEST-SCENARIOS.md` ✅
- [ ] `TEST-COVERAGE-ANALYSIS.md` ✅
- [ ] `TESTING-STRATEGY-2025.md` ✅
- [ ] `test-coverage-tracker.csv` ✅
- [ ] `test-case-tracker.csv` ✅
- [ ] `e2e-testing-gaps.csv` ✅
- [ ] `DIALOG-FREE-TESTING.md`
- [ ] `DIALOG-FREE-TESTING-SUMMARY.md`
- [ ] `VITEST-CONFIG-FIX.md`
- [ ] `VSCODE-MOCK-FIX-URGENT.md`
- [ ] `INTEGRATION-TEST-CHANGES.md`
- [ ] `test-fixes-summary.md`
- [ ] `e2e-tests-created.md`
- [ ] `FINAL-E2E-SUMMARY.md`
- [ ] `batch-export-e2e-analysis.md`

#### **To `/decisions/`**:
- [ ] `DESIGN_DECISIONS.md` ✅
- [ ] `premium-features-decision.md` ✅
- [ ] `COMMAND-NAMING-ANALYSIS.md` ✅
- [ ] `COMMAND-RENAME-VALIDATION.md`

#### **To Archive or Delete**:
- [ ] Superseded documents
- [ ] Temporary analysis files
- [ ] Old project plans

### Phase 3: Update Links
- [ ] Update all internal documentation links
- [ ] Update main README.md references
- [ ] Update CHANGELOG.md if needed

### Phase 4: Cleanup
- [ ] Remove empty legacy files
- [ ] Archive old versions
- [ ] Final review of structure

---

## 🎯 Best Practices for Contributors

### When Adding New Documentation:

1. **Choose the Right Category**:
   - Is it describing system design? → `/architecture/`
   - Is it a how-to guide? → `/guides/`
   - Is it about testing? → `/testing/`
   - Is it a significant decision? → `/decisions/`

2. **Naming Conventions**:
   - Use `UPPER-CASE-WITH-DASHES.md` for major documents
   - Use `lowercase-with-dashes.md` for guides
   - Use descriptive names (avoid generic names like "doc1.md")

3. **Document Headers**:
   ```markdown
   # Document Title
   
   **Created**: YYYY-MM-DD
   **Last Updated**: YYYY-MM-DD
   **Status**: Draft | Active | Deprecated
   **Category**: Architecture | Guide | Testing | Decision
   ```

4. **Update This Index**:
   - Add new files to the appropriate section
   - Update the quick reference if applicable

5. **Link to Related Docs**:
   - Always link to related documentation
   - Keep a "See Also" section at the bottom

---

## 📊 Documentation Statistics

- **Total Files**: 50+ documents
- **Architecture Docs**: ~5
- **Testing Docs**: ~15
- **Guides**: ~8
- **Decisions**: ~3
- **Legacy/Unsorted**: ~20

---

## 🔗 Quick Links

### Essential Reading
- [Release Process Guide](./guides/RELEASE-PROCESS.md)
- [Testing Strategy](./testing/TESTING-STRATEGY-2025.md)
- [Design Decisions](./decisions/DESIGN_DECISIONS.md)
- [Architecture Overview](./architecture/DOCUMENT-CATHEDRAL.md)

### For New Contributors
1. Read the [Architecture Overview](./architecture/DOCUMENT-CATHEDRAL.md)
2. Review [Testing Strategy](./testing/TESTING-STRATEGY-2025.md)
3. Follow [Release Process](./guides/RELEASE-PROCESS.md) for deployments

### For Bug Fixes
1. Check [Test Scenarios](./testing/TEST-SCENARIOS.md)
2. Review [Testing Strategy](./testing/TESTING-STRATEGY-2025.md)
3. Update [Test Coverage Tracker](./testing/test-coverage-tracker.csv)

---

## 📝 Changelog

### 2025-10-12 - Initial Restructuring
- Created new directory structure
- Created this index document
- Identified files for categorization
- Established naming conventions

---

## 🤝 Contributing to Documentation

To contribute to this documentation:

1. **For Minor Updates**: Edit directly and submit PR
2. **For New Documents**: 
   - Choose appropriate category
   - Follow naming conventions
   - Update this index
3. **For Restructuring**: 
   - Discuss in issues first
   - Update migration plan
   - Test all links after moving files

---

## 📧 Contact

For documentation questions or suggestions:
- **Repository Issues**: https://github.com/GSejas/mermaid-export-pro/issues
- **Email**: jsequeira03@gmail.com

---

**Thank you for helping maintain clear, organized documentation!** 📚
