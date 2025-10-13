# Release Process Guide

This document outlines the release process for Mermaid Export Pro.

## 📦 Automated Release Workflow

The project uses GitHub Actions to automate the release process. When you push a version tag, it automatically:

1. ✅ Runs all tests to ensure stability
2. 📦 Builds the VSIX package
3. 📝 Extracts changelog for the version
4. 🎉 Creates a GitHub Release with the VSIX attached
5. 💾 Archives the VSIX as a GitHub artifact (90 days retention)

## 🚀 How to Create a Release

### Step 1: Update Version and Changelog

```bash
# Update version in package.json (use npm version command)
npm version patch   # 1.0.6 → 1.0.7 (bug fixes)
npm version minor   # 1.0.6 → 1.1.0 (new features)
npm version major   # 1.0.6 → 2.0.0 (breaking changes)

# This creates a git commit and tag automatically
```

### Step 2: Update CHANGELOG.md

Add an entry for the new version:

```markdown
## [1.0.7] - 2025-10-12

### Added
- New feature X
- New feature Y

### Fixed
- Bug fix A
- Bug fix B

### Changed
- Improvement C
```

### Step 3: Push to GitHub

```bash
# Commit the changelog
git add CHANGELOG.md
git commit -m "docs: Update changelog for v1.0.7"

# Push commits and tags
git push origin master
git push origin --tags
```

### Step 4: Automated Release

The GitHub Actions workflow automatically:
- Detects the version tag (e.g., `v1.0.7`)
- Runs tests to ensure quality
- Builds the VSIX package
- Creates a GitHub Release
- Attaches the VSIX file to the release

## 📥 Installation Options

Users can install your extension in three ways:

1. **VS Code Marketplace** (when published)
   ```
   ext install GSejas.mermaid-export-pro
   ```

2. **GitHub Release** (manual download)
   - Go to: https://github.com/GSejas/mermaid-export-pro/releases
   - Download the `.vsix` file
   - Install: `code --install-extension mermaid-export-pro-1.0.7.vsix`

3. **Direct from GitHub** (latest release)
   ```bash
   # Download latest release
   curl -L https://github.com/GSejas/mermaid-export-pro/releases/latest/download/mermaid-export-pro-*.vsix -o extension.vsix
   code --install-extension extension.vsix
   ```

## 🏪 Publishing to VS Code Marketplace (Optional)

To publish to the official marketplace, you need to:

### One-Time Setup

1. **Create a Publisher Account**
   - Go to: https://marketplace.visualstudio.com/manage
   - Sign in with Microsoft/Azure account
   - Create a publisher ID (e.g., "GSejas")

2. **Generate Personal Access Token (PAT)**
   - Go to: https://dev.azure.com/{your-org}/_usersSettings/tokens
   - Create new token with **Marketplace > Manage** scope
   - Copy the token (you won't see it again!)

3. **Add Token to GitHub Secrets**
   - Go to: https://github.com/GSejas/mermaid-export-pro/settings/secrets/actions
   - Click "New repository secret"
   - Name: `VSCE_PAT`
   - Value: (paste your Azure DevOps PAT)

### Enable Marketplace Publishing

Uncomment the `publish-marketplace` job in `.github/workflows/release.yml`:

```yaml
publish-marketplace:
  needs: release
  runs-on: ubuntu-latest
  if: success()
  
  steps:
    - name: Checkout repository
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Publish to VS Code Marketplace
      run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
```

## 🧪 Testing a Release Locally

Before pushing a tag, you can test the release process:

```bash
# Build the VSIX
npm run package

# Install locally
code --install-extension mermaid-export-pro-1.0.7.vsix

# Test the extension
# ... verify features work ...

# Uninstall
code --uninstall-extension GSejas.mermaid-export-pro
```

## 📊 Release Checklist

Before creating a release:

- [ ] All tests passing (`npm test`)
- [ ] TypeScript compiles without errors (`npm run check-types`)
- [ ] ESLint passes (`npm run lint`)
- [ ] CHANGELOG.md updated with version notes
- [ ] package.json version bumped
- [ ] README.md reflects new features (if applicable)
- [ ] Demo files updated (if new diagram types supported)
- [ ] Documentation updated (if API changed)

## 🔄 Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

- **PATCH** (1.0.X): Bug fixes, performance improvements, minor tweaks
- **MINOR** (1.X.0): New features, backward-compatible changes
- **MAJOR** (X.0.0): Breaking changes, major refactors

## 📁 Release Artifacts

Each release includes:

1. **GitHub Release Page**
   - Release notes from CHANGELOG.md
   - Auto-generated commit summary
   - Attached VSIX file for download

2. **GitHub Actions Artifacts**
   - VSIX package (90-day retention)
   - Test results (if any failures)
   - Coverage reports

## 🛠️ Rollback Procedure

If a release has critical issues:

1. **Delete the GitHub Release** (keeps the tag)
   ```bash
   # Via GitHub UI or gh cli
   gh release delete v1.0.7
   ```

2. **Create a patch release**
   ```bash
   npm version patch
   # Update CHANGELOG.md with fix
   git push origin master --tags
   ```

## 📝 Example Release Flow

```bash
# 1. Start from clean state
git checkout master
git pull origin master

# 2. Create a feature branch
git checkout -b feature/new-export-format

# ... make changes ...

# 3. Run tests
npm test

# 4. Merge to master
git checkout master
git merge feature/new-export-format

# 5. Bump version
npm version minor  # Creates commit + tag

# 6. Update changelog
nano CHANGELOG.md
git add CHANGELOG.md
git commit -m "docs: Update changelog for v1.1.0"

# 7. Push everything
git push origin master
git push origin --tags

# 8. GitHub Actions automatically creates the release!
```

## 🎯 Best Practices

1. **Never commit VSIX files to the repo** - They're build artifacts
2. **Always test locally first** - Install the VSIX before releasing
3. **Keep CHANGELOG.md updated** - Makes release notes automatic
4. **Use semantic versioning** - Helps users understand impact
5. **Tag format: `v1.0.7`** - Consistent tagging scheme
6. **Test on multiple platforms** - CI runs on Ubuntu and Windows
7. **Archive old releases** - Keep last 3-5 major versions

## 🔗 Useful Links

- **GitHub Releases**: https://github.com/GSejas/mermaid-export-pro/releases
- **VS Code Publishing**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **Marketplace**: https://marketplace.visualstudio.com/vscode
- **CI Status**: https://github.com/GSejas/mermaid-export-pro/actions

---

**Happy Releasing! 🎉**
