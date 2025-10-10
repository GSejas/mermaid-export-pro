# CI/CD Implementation Plan - Mermaid Export Pro

**Goal**: Implement robust CI/CD pipeline starting simple, building toward automated releases with quality badges.

**Current State**: 
- ✅ 30.63% test coverage with 313 passing tests
- ✅ TypeScript compilation working
- ✅ ESLint configured
- ✅ Package scripts ready (test, lint, compile)

---

## 🎯 Phase 1: Basic CI Pipeline (START HERE) ⭐

**Timeline**: 1-2 hours  
**Complexity**: Low  
**Value**: High - Immediate quality assurance

### Goals
- Run tests automatically on every push/PR
- Validate TypeScript compilation
- Check code quality with ESLint
- Generate coverage reports
- **Add badges to README** 🏅

### Implementation Steps

#### Step 1.1: Create Basic Test Workflow
```yaml
# .github/workflows/test.yml
```

**What it does**:
- ✅ Runs on push to `master` and all PRs
- ✅ Tests on Node.js 18.x
- ✅ Runs `npm test` to validate all tests pass
- ✅ Runs TypeScript compilation check
- ✅ Runs ESLint
- ✅ Generates coverage report

**Estimated time**: 30 minutes

#### Step 1.2: Add Coverage Reporting
**Tool**: Codecov or Coveralls
**What it does**:
- ✅ Uploads coverage to service
- ✅ Generates coverage badge
- ✅ Shows coverage diff on PRs

**Estimated time**: 20 minutes

#### Step 1.3: Add Badges to README
```markdown
[![Tests](https://github.com/GSejas/mermaid-export-pro/workflows/Tests/badge.svg)](...)
[![Coverage](https://codecov.io/gh/GSejas/mermaid-export-pro/branch/master/graph/badge.svg)](...)
[![License](https://img.shields.io/github/license/GSejas/mermaid-export-pro)](...)
```

**Estimated time**: 10 minutes

### Success Criteria
- [ ] Green checkmark on all commits
- [ ] Tests run automatically on PRs
- [ ] Coverage badge shows 30%+ coverage
- [ ] Failed tests block merging (optional)

---

## 🔒 Phase 2: Quality Gates (NEXT)

**Timeline**: 2-3 hours  
**Complexity**: Medium  
**Value**: Medium - Prevents regressions

### Goals
- Enforce minimum coverage threshold (e.g., 30%)
- Block PRs with failing tests
- Add code quality metrics
- Multi-platform testing (Windows, macOS, Linux)

### Implementation Steps

#### Step 2.1: Add Coverage Threshold
```yaml
- name: Check coverage threshold
  run: |
    npm run test:coverage
    npx nyc check-coverage --lines 30 --branches 70 --functions 50
```

#### Step 2.2: Branch Protection Rules
**GitHub Settings**:
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Require tests workflow to pass

#### Step 2.3: Multi-Platform Testing
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [18.x, 20.x]
```

#### Step 2.4: Code Quality Checks
- Add SonarCloud or CodeQL
- Add dependency security scanning (Dependabot)
- Add PR size checks

### Success Criteria
- [ ] Tests run on Windows, macOS, Linux
- [ ] PRs blocked if coverage drops below threshold
- [ ] Security vulnerabilities detected automatically
- [ ] Code quality score visible

---

## 🚀 Phase 3: Automated Publishing (LATER)

**Timeline**: 4-6 hours  
**Complexity**: High  
**Value**: High - Reduces manual release work

### Goals
- Automated VSIX building
- Semantic versioning with conventional commits
- GitHub releases with changelogs
- VS Code Marketplace publishing
- Release badges

### Implementation Steps

#### Step 3.1: Semantic Release Setup
```bash
npm install --save-dev semantic-release @semantic-release/git @semantic-release/changelog
```

**What it does**:
- Analyzes commit messages (conventional commits)
- Determines next version number
- Generates CHANGELOG.md
- Creates Git tag and GitHub release

#### Step 3.2: Build and Publish Workflow
```yaml
# .github/workflows/release.yml
```

**Triggers**:
- Manual workflow dispatch
- Push to `master` with version tag
- Scheduled releases (e.g., weekly)

**What it does**:
- ✅ Builds VSIX package
- ✅ Runs all tests
- ✅ Creates GitHub release with assets
- ✅ Publishes to VS Code Marketplace
- ✅ Updates version badges

#### Step 3.3: VS Code Marketplace Token
**Setup**:
1. Create Personal Access Token on Azure DevOps
2. Add as GitHub Secret: `VSCE_PAT`
3. Configure `vsce publish` in workflow

#### Step 3.4: Release Badges
```markdown
[![Version](https://img.shields.io/visual-studio-marketplace/v/GSejas.mermaid-export-pro)](...)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/GSejas.mermaid-export-pro)](...)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/GSejas.mermaid-export-pro)](...)
```

### Success Criteria
- [ ] `git push --tags` triggers automated release
- [ ] Changelog generated automatically
- [ ] VSIX published to marketplace
- [ ] GitHub release created with notes
- [ ] Version badge updates automatically

---

## 📊 Phase 4: Advanced Features (OPTIONAL)

**Timeline**: Ongoing  
**Complexity**: Medium-High  
**Value**: Medium - Polish and optimization

### Goals
- Performance benchmarking
- Integration tests in real VS Code
- Automated dependency updates
- Release preview/beta channel
- Download statistics tracking

### Implementation Steps

#### Step 4.1: Performance Benchmarks
- Track test execution time
- Monitor VSIX bundle size
- Alert on performance regressions

#### Step 4.2: Integration Testing
```yaml
- name: Run VS Code Integration Tests
  run: xvfb-run -a npm run test:integration
```

#### Step 4.3: Dependabot Configuration
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

#### Step 4.4: Beta Channel
- Pre-release versions on every master commit
- Separate marketplace listing for beta testers
- Automated rollback on failures

### Success Criteria
- [ ] Performance tracked over time
- [ ] Dependencies auto-updated weekly
- [ ] Beta channel available for early adopters
- [ ] Integration tests run on real VS Code

---

## 📋 Implementation Checklist

### Phase 1: Basic CI (DO FIRST) ✅
- [ ] Create `.github/workflows/test.yml`
- [ ] Configure test job (test, compile, lint)
- [ ] Set up coverage reporting (Codecov)
- [ ] Add badges to README.md
- [ ] Test workflow with a dummy PR
- [ ] Verify badges display correctly

### Phase 2: Quality Gates
- [ ] Add multi-platform matrix testing
- [ ] Configure branch protection rules
- [ ] Add coverage threshold checks
- [ ] Set up Dependabot
- [ ] Add code quality scanning (SonarCloud/CodeQL)

### Phase 3: Automated Publishing
- [ ] Install semantic-release
- [ ] Create `.github/workflows/release.yml`
- [ ] Get VS Code Marketplace token
- [ ] Add `VSCE_PAT` secret to GitHub
- [ ] Test release process manually first
- [ ] Configure automatic releases on tag push
- [ ] Update README with release badges

### Phase 4: Advanced Features
- [ ] Add performance benchmarks
- [ ] Set up integration testing
- [ ] Configure automated dependency updates
- [ ] Create beta release channel
- [ ] Add download statistics

---

## 🛠️ Tools & Services Required

### Free Services
- ✅ **GitHub Actions**: Included with GitHub repo (2000 min/month free)
- ✅ **Codecov**: Free for public repos
- ✅ **Dependabot**: Built into GitHub
- ✅ **Shields.io**: Free badge generation

### Optional Paid Services
- **SonarCloud**: Free for public repos, paid for private
- **Better Uptime**: Marketplace availability monitoring
- **Sentry**: Error tracking (free tier available)

### VS Code Marketplace
- **Publishing**: Free
- **Azure DevOps PAT**: Free to create

---

## 📈 Expected Outcomes

### After Phase 1 (Basic CI)
- ✨ Professional appearance with badges
- 🛡️ Automatic test validation
- 📊 Visible code coverage
- ⚡ Faster PR reviews (automated checks)

### After Phase 2 (Quality Gates)
- 🚫 Prevention of broken code merges
- 🌍 Cross-platform compatibility verified
- 🔒 Security vulnerabilities caught early
- 📉 Reduced manual testing effort

### After Phase 3 (Automated Publishing)
- 🚀 One-command releases
- 📝 Auto-generated changelogs
- ⏱️ 90% reduction in release time
- 🎯 Consistent versioning

### After Phase 4 (Advanced Features)
- 📊 Performance metrics tracked
- 🧪 Full integration test coverage
- 🔄 Zero-effort dependency management
- 🎭 Beta testing channel for power users

---

## 🎯 Recommended Starting Point

**Week 1: Phase 1 Only**
1. ✅ Create test workflow (30 min)
2. ✅ Set up Codecov (20 min)
3. ✅ Add badges to README (10 min)
4. ✅ Test with a PR (10 min)

**Total Time**: ~1 hour  
**Impact**: Immediate professional appearance + quality assurance

---

## 📚 Resources

### GitHub Actions Documentation
- [Quickstart Guide](https://docs.github.com/en/actions/quickstart)
- [Node.js Workflows](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

### Badge Generators
- [Shields.io](https://shields.io/)
- [Badgen](https://badgen.net/)

### Coverage Tools
- [Codecov](https://codecov.io/)
- [Coveralls](https://coveralls.io/)

### Semantic Release
- [semantic-release](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 🎬 Next Steps

1. **Review this plan** - Adjust phases based on priorities
2. **Start Phase 1** - Basic CI is quick win
3. **Create workflows** - See implementation files in `.github/workflows/`
4. **Test thoroughly** - Use draft PRs to test workflows
5. **Iterate** - Add features incrementally

---

**Last Updated**: 2025-10-10  
**Status**: Ready for Implementation  
**Owner**: Development Team
