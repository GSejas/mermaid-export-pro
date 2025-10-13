# CI/CD Badges Setup Guide

This guide explains how to add quality badges to your README.md and configure the services.

---

## 📊 Available Badges

### 1. GitHub Actions Test Status
Shows whether tests are passing on the latest commit.

```markdown
[![Tests](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml/badge.svg)](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml)
```

**Setup**: Already configured in `.github/workflows/test.yml` ✅

---

### 2. Code Coverage (Codecov)
Shows percentage of code covered by tests.

```markdown
[![codecov](https://codecov.io/gh/GSejas/mermaid-export-pro/branch/master/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/GSejas/mermaid-export-pro)
```

**Setup Steps**:
1. Go to [codecov.io](https://codecov.io/)
2. Sign in with GitHub
3. Add your repository `GSejas/mermaid-export-pro`
4. Copy the upload token
5. Add token to GitHub Secrets:
   - Go to repository Settings → Secrets → Actions
   - Add new secret: `CODECOV_TOKEN` with the token value
6. Push code to trigger workflow
7. Badge will automatically update!

**Alternative**: Use Coveralls instead
```markdown
[![Coverage Status](https://coveralls.io/repos/github/GSejas/mermaid-export-pro/badge.svg?branch=master)](https://coveralls.io/github/GSejas/mermaid-export-pro?branch=master)
```

---

### 3. VS Code Marketplace Version
Shows the current published version.

```markdown
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/GSejas.mermaid-export-pro?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=GSejas.mermaid-export-pro)
```

**Setup**: Automatically works once extension is published to marketplace ✅

---

### 4. Downloads Count
Shows total download count from VS Code Marketplace.

```markdown
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/GSejas.mermaid-export-pro)](https://marketplace.visualstudio.com/items?itemName=GSejas.mermaid-export-pro)
```

**Setup**: Automatically works once extension is published ✅

---

### 5. Marketplace Rating
Shows user rating from VS Code Marketplace.

```markdown
[![Rating](https://img.shields.io/visual-studio-marketplace/r/GSejas.mermaid-export-pro)](https://marketplace.visualstudio.com/items?itemName=GSejas.mermaid-export-pro)
```

**Setup**: Automatically works once extension has ratings ✅

---

### 6. License Badge
Shows the license type.

```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

**Setup**: Already configured in repository ✅

---

### 7. Issues & PRs
Shows open issues and pull requests.

```markdown
[![GitHub issues](https://img.shields.io/github/issues/GSejas/mermaid-export-pro)](https://github.com/GSejas/mermaid-export-pro/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/GSejas/mermaid-export-pro)](https://github.com/GSejas/mermaid-export-pro/pulls)
```

**Setup**: Already configured ✅

---

### 8. Last Commit
Shows how recently the project was updated.

```markdown
[![GitHub last commit](https://img.shields.io/github/last-commit/GSejas/mermaid-export-pro)](https://github.com/GSejas/mermaid-export-pro/commits/master)
```

**Setup**: Already configured ✅

---

### 9. Contributors
Shows number of contributors.

```markdown
[![Contributors](https://img.shields.io/github/contributors/GSejas/mermaid-export-pro)](https://github.com/GSejas/mermaid-export-pro/graphs/contributors)
```

**Setup**: Already configured ✅

---

### 10. Package Size
Shows extension package size.

```markdown
[![Package Size](https://img.shields.io/bundlephobia/min/@mermaid-js/mermaid-cli)](https://www.npmjs.com/package/@mermaid-js/mermaid-cli)
```

---

## 📋 Recommended Badge Set for README

### Minimal (Clean Look)
```markdown
[![Tests](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml/badge.svg)](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/GSejas/mermaid-export-pro/branch/master/graph/badge.svg)](https://codecov.io/gh/GSejas/mermaid-export-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

### Standard (Professional)
```markdown
[![Tests](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml/badge.svg)](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/GSejas/mermaid-export-pro/branch/master/graph/badge.svg)](https://codecov.io/gh/GSejas/mermaid-export-pro)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/GSejas.mermaid-export-pro)](https://marketplace.visualstudio.com/items?itemName=GSejas.mermaid-export-pro)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/GSejas.mermaid-export-pro)](https://marketplace.visualstudio.com/items?itemName=GSejas.mermaid-export-pro)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/GSejas.mermaid-export-pro)](https://marketplace.visualstudio.com/items?itemName=GSejas.mermaid-export-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

### Complete (Everything)
```markdown
<!-- Build Status -->
[![Tests](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml/badge.svg)](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/GSejas/mermaid-export-pro/branch/master/graph/badge.svg)](https://codecov.io/gh/GSejas/mermaid-export-pro)

<!-- Marketplace -->
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/GSejas.mermaid-export-pro)](https://marketplace.visualstudio.com/items?itemName=GSejas.mermaid-export-pro)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/GSejas.mermaid-export-pro)](https://marketplace.visualstudio.com/items?itemName=GSejas.mermaid-export-pro)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/GSejas.mermaid-export-pro)](https://marketplace.visualstudio.com/items?itemName=GSejas.mermaid-export-pro)

<!-- Repository Stats -->
[![GitHub issues](https://img.shields.io/github/issues/GSejas/mermaid-export-pro)](https://github.com/GSejas/mermaid-export-pro/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/GSejas/mermaid-export-pro)](https://github.com/GSejas/mermaid-export-pro/pulls)
[![GitHub last commit](https://img.shields.io/github/last-commit/GSejas/mermaid-export-pro)](https://github.com/GSejas/mermaid-export-pro/commits/master)
[![Contributors](https://img.shields.io/github/contributors/GSejas/mermaid-export-pro)](https://github.com/GSejas/mermaid-export-pro/graphs/contributors)

<!-- License -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

---

## 🚀 Quick Start Guide

### Step 1: Update README.md
Add the "Standard" badge set to the top of your README.md, right after the title:

```markdown
# Mermaid Export Pro

[![Tests](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml/badge.svg)](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/GSejas/mermaid-export-pro/branch/master/graph/badge.svg)](https://codecov.io/gh/GSejas/mermaid-export-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Professional VS Code extension for exporting Mermaid diagrams...
```

### Step 2: Set Up Codecov
1. Visit [codecov.io](https://codecov.io/)
2. Click "Sign up with GitHub"
3. Authorize Codecov
4. Click "Add new repository"
5. Select `mermaid-export-pro`
6. Copy the "Upload Token"
7. Go to GitHub repository → Settings → Secrets and variables → Actions
8. Click "New repository secret"
9. Name: `CODECOV_TOKEN`
10. Value: Paste the token
11. Click "Add secret"

### Step 3: Push and Verify
```bash
git add .
git commit -m "chore: add CI/CD badges and enhanced workflows"
git push
```

### Step 4: Check Results
1. Go to Actions tab on GitHub
2. Wait for workflow to complete (~2-3 minutes)
3. Refresh README to see green badges! 🎉

---

## 🎨 Badge Customization

### Custom Colors
```markdown
![Custom Badge](https://img.shields.io/badge/Custom-Text-blue)
![Coverage](https://img.shields.io/badge/Coverage-30%25-orange)
```

### With Logo
```markdown
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)](https://nodejs.org/)
```

### Custom Styles
```markdown
![Flat](https://img.shields.io/badge/style-flat-green?style=flat)
![Flat Square](https://img.shields.io/badge/style-flat--square-green?style=flat-square)
![Plastic](https://img.shields.io/badge/style-plastic-green?style=plastic)
![For the Badge](https://img.shields.io/badge/style-for--the--badge-green?style=for-the-badge)
```

---

## 📊 Coverage Visualization

Codecov provides advanced coverage visualization:
- Line-by-line coverage view
- Coverage trends over time
- PR coverage comparisons
- Sunburst visualizations
- Coverage diff on pull requests

**Example**: https://codecov.io/gh/YOUR_REPO (after setup)

---

## 🔧 Troubleshooting

### Badge Not Showing?
1. Check workflow name in `.github/workflows/test.yml` matches badge URL
2. Ensure workflow has run at least once
3. Clear browser cache

### Coverage Not Uploading?
1. Verify `CODECOV_TOKEN` is set in GitHub Secrets
2. Check workflow logs for upload errors
3. Ensure coverage files are generated (`coverage/coverage-final.json`)

### Wrong Coverage Percentage?
1. Check that test script includes `--coverage` flag
2. Verify `vitest.config.ts` has coverage enabled
3. Check excluded files in coverage config

---

## 📚 Additional Resources

- [Shields.io Documentation](https://shields.io/)
- [Codecov Documentation](https://docs.codecov.com/)
- [GitHub Actions Badges](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/adding-a-workflow-status-badge)
- [VS Code Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

---

**Last Updated**: 2025-10-10  
**Status**: Ready to Use
