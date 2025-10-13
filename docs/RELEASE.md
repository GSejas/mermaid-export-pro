# Quick Release Guide

## 🚀 Creating a New Release

### Quick Commands
```bash
# 1. Bump version and create tag
npm version patch     # Bug fixes: 1.0.6 → 1.0.7
npm version minor     # New features: 1.0.6 → 1.1.0
npm version major     # Breaking changes: 1.0.6 → 2.0.0

# 2. Update CHANGELOG.md with the new version notes

# 3. Commit and push
git add CHANGELOG.md
git commit -m "docs: Update changelog for v$(node -p "require('./package.json').version")"
git push origin master --tags

# 4. GitHub Actions automatically creates the release! 🎉
```

## 📦 What Happens Automatically

When you push a tag like `v1.0.7`:
1. ✅ Tests run to ensure quality
2. 📦 VSIX package is built
3. 📝 Release notes are extracted from CHANGELOG.md
4. 🎉 GitHub Release is created
5. 💾 VSIX file is attached to the release

## 📥 Users Can Install Via

1. **GitHub Release** (manual)
   - Download from: https://github.com/GSejas/mermaid-export-pro/releases
   - Install: `code --install-extension mermaid-export-pro-1.0.7.vsix`

2. **VS Code Marketplace** (when published)
   - Search "Mermaid Export Pro" in VS Code Extensions
   - Or: `ext install GSejas.mermaid-export-pro`

## 🧪 Test Before Release

```bash
# Build and test locally
npm run package
code --install-extension mermaid-export-pro-$(node -p "require('./package.json').version").vsix

# Test features...

# Uninstall when done
code --uninstall-extension GSejas.mermaid-export-pro
```

## 📋 Pre-Release Checklist

- [ ] `npm test` passes
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] All changes committed
- [ ] Tag pushed to GitHub

## 🔧 Troubleshooting

**Release didn't trigger?**
- Check tag format: must be `v1.0.7` (lowercase v, semver)
- Verify workflow file: `.github/workflows/release.yml` exists
- Check Actions tab: https://github.com/GSejas/mermaid-export-pro/actions

**Want to publish to Marketplace?**
- See full guide: `docs/developers/RELEASE-PROCESS.md`
- Need Azure DevOps PAT token
- Uncomment marketplace job in `release.yml`

---

**For detailed documentation, see:** [RELEASE-PROCESS.md](./RELEASE-PROCESS.md)
