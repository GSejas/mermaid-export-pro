# Phase 1 Implementation Checklist

## 🎯 Objective
Get CI/CD badges showing on the repository README within 1 hour.

## ✅ Tasks

### 1. Update GitHub Actions Workflow
- [x] Enhanced `.github/workflows/test.yml` with:
  - Multi-platform testing (Ubuntu, Windows)
  - Multi-version Node.js testing (18.x, 20.x)
  - Coverage report generation
  - Codecov upload integration
  - Artifact uploads for test results
  - Separate lint and build jobs

### 2. Set Up Codecov
- [ ] Visit https://codecov.io/
- [ ] Sign in with GitHub account
- [ ] Add repository: `GSejas/mermaid-export-pro`
- [ ] Copy upload token
- [ ] Add GitHub Secret:
  - Go to: https://github.com/GSejas/mermaid-export-pro/settings/secrets/actions
  - Click "New repository secret"
  - Name: `CODECOV_TOKEN`
  - Value: [paste token]
  - Click "Add secret"

### 3. Update README.md
- [ ] Add badges section at top of README.md
- [ ] Use "Standard" badge set (recommended):

```markdown
# Mermaid Export Pro

[![Tests](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml/badge.svg)](https://github.com/GSejas/mermaid-export-pro/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/GSejas/mermaid-export-pro/branch/master/graph/badge.svg)](https://codecov.io/gh/GSejas/mermaid-export-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Professional VS Code extension for exporting Mermaid diagrams with dual CLI/Web strategies...
```

### 4. Commit and Push
```bash
git add .github/workflows/test.yml
git add docs/developers/
git add README.md  # (after updating)
git commit -m "feat: add CI/CD with codecov integration and badges"
git push origin master
```

### 5. Verify Workflow
- [ ] Go to https://github.com/GSejas/mermaid-export-pro/actions
- [ ] Check that "Tests" workflow runs successfully
- [ ] Verify all jobs pass (test, lint, build)
- [ ] Check that coverage uploads to Codecov

### 6. Verify Badges
- [ ] Refresh README on GitHub
- [ ] Confirm test badge shows "passing" (green)
- [ ] Confirm coverage badge shows percentage
- [ ] Click badges to verify links work

---

## 🎉 Success Criteria

When complete, you should see:
- ✅ Green "Tests passing" badge in README
- ✅ Coverage percentage badge (showing ~30%)
- ✅ Workflow running on every push
- ✅ Test results uploaded as artifacts
- ✅ Coverage reports on Codecov dashboard

---

## 🚀 Next Steps (Phase 2)

After Phase 1 is working:
1. Add branch protection rules (require tests to pass)
2. Add macOS to test matrix
3. Set minimum coverage threshold (30%)
4. Add code quality scanning (SonarCloud/CodeQL)
5. Configure Dependabot for dependency updates

---

## 📊 Expected Timeline

- Codecov setup: **10 minutes**
- README update: **5 minutes**
- Commit & push: **2 minutes**
- Workflow execution: **3-5 minutes**
- Badge verification: **2 minutes**

**Total: ~25 minutes** ⚡

---

## 🐛 Troubleshooting

### Workflow not running?
- Check branch name matches workflow trigger (master/main)
- Verify workflow file is in `.github/workflows/` directory
- Check Actions tab for error messages

### Coverage badge showing "unknown"?
- Ensure `CODECOV_TOKEN` secret is set correctly
- Check workflow logs for upload errors
- Verify coverage files exist in `coverage/` directory
- May take 1-2 workflow runs to populate

### Tests failing?
- Run `npm test` locally first to verify
- Check Node.js version compatibility
- Verify all dependencies are in package.json

---

## 📝 Notes

- The enhanced workflow runs tests on both Ubuntu and Windows
- Integration tests only run on Windows (VS Code requirement)
- Coverage is only uploaded from Ubuntu + Node 20.x to avoid duplicates
- Lint errors are allowed initially (`continue-on-error: true`) to not block development
- Artifacts are kept for 7 days for debugging
- VSIX packages are kept for 30 days

---

**Status**: Ready to implement ✅  
**Owner**: Development Team  
**Date**: 2025-10-10
