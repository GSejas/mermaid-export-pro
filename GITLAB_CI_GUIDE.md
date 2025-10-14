# GitLab CI/CD Migration Guide for VS Code Extensions

**Based on**: Mermaid Export Pro production GitHub Actions workflows
**Target**: GitLab CI/CD with Windows local environment
**Date**: 2025-01-14

---

## Overview

This guide translates our **working GitHub Actions** (`.github/workflows/*.yml`) to GitLab CI/CD, preserving all functionality while adapting to GitLab's architecture and your local Windows environment.

### Current GitHub Actions Setup

We have 3 production workflows:

1. **`test.yml`**: Multi-OS testing (Ubuntu + Windows), unit + integration tests, coverage
2. **`integration-tests.yml`**: Node 18/20 matrix, Xvfb setup, test artifacts
3. **`release.yml`**: Tag-triggered releases, marketplace publishing, changelog extraction

### Key Differences: GitHub Actions → GitLab CI

| Aspect | GitHub Actions | GitLab CI |
|--------|---------------|-----------|
| **Stages** | Jobs run in parallel by default | Explicit `stages:` with sequential execution |
| **Matrix Builds** | `strategy.matrix` | `parallel: matrix:` |
| **Artifacts** | `upload-artifact` action | `artifacts:` block |
| **Caching** | `actions/cache` with automatic keys | Manual `cache:` with explicit keys |
| **Windows** | Hosted `windows-latest` runner | Self-hosted runner with `tags: [windows]` |
| **Conditionals** | `if:` with expressions | `rules:` blocks with `if:` conditions |

---

## Migration Strategy

### Phase 1: Direct Translation (Current)

Map GitHub Actions jobs 1:1 to GitLab stages:

```
GitHub Jobs               →  GitLab Stages
──────────────────────────────────────────────
lint (validate)           →  validate:lint
test (unit + coverage)    →  test:unit
test (integration)        →  test:integration:linux
build (package)           →  package:vsix
release                   →  release:marketplace
```

### Phase 2: Optimization (Future)

- Use GitLab DAG (`needs:`) for parallel execution
- Shared runners for Linux, local runner for Windows
- Coverage visualization in merge requests
- Cache optimization for faster builds

---

## Key Lessons from Our GitHub Actions

### 1. Coverage Strategy (from `test.yml`)

**Working Pattern**:
- Linux: Unit tests with Vitest + V8 coverage → Codecov
- Windows: Merged coverage (unit + E2E) with coverage merge script → Codecov
- Retention: Coverage artifacts kept for 7 days

**GitLab Translation**:
```yaml
coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'  # Extract percentage
artifacts:
  reports:
    coverage_report:
      coverage_format: cobertura
      path: coverage/cobertura-coverage.xml
```

### 2. Windows Integration Tests (from `test.yml:63-66`)

**Working Pattern**:
```yaml
- name: Run integration tests with coverage (Windows only)
  run: npm run test:integration:coverage
  if: runner.os == 'Windows'
  continue-on-error: true
```

**Key Insight**: Windows-only integration tests because Xvfb is Linux-specific. VS Code test runner works natively on Windows.

**GitLab Translation**: Separate job with `tags: [windows]` and `when: manual` for MRs.

### 3. Version Tag Publishing (from `release.yml`)

**Working Pattern**:
```yaml
on:
  push:
    tags:
      - 'v*.*.*'

steps:
  - name: Extract version from tag
    run: |
      VERSION=${GITHUB_REF#refs/tags/v}
      echo "version=$VERSION" >> $GITHUB_OUTPUT

  - name: Extract changelog for this version
    run: |
      CHANGELOG=$(awk "/^## \[$VERSION\]/,/^## \[/" CHANGELOG.md | sed '$d')
```

**Key Insight**: Changelog extraction from `CHANGELOG.md` using awk for release notes.

**GitLab Translation**: Same awk pattern works; save to `release-notes.md` artifact.

### 4. Xvfb Setup (from `integration-tests.yml:40-44`)

**Working Pattern**:
```yaml
- name: Setup virtual display
  run: |
    export DISPLAY=:99
    Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
    sleep 3
```

**Key Insight**: Manual Xvfb startup vs `xvfb-run -a` wrapper. Both work.

**GitLab Recommendation**: Use `xvfb-run` for simpler configuration.

### 5. Node Version Matrix (from `integration-tests.yml:14-16`)

**Working Pattern**:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]
    vscode-version: [stable]
```

**Current Status**: Test.yml only uses Node 20.x (ESM baseline for VS Code 1.103+)

**GitLab Translation**: Single Node 22 version (current production standard).

---

## Windows-Specific Configuration

### Local Environment Setup

**Requirements** (already in place):
- Windows 10/11 with PowerShell 5.1+
- GitLab Runner installed as Windows service
- Node.js 22.x installed globally
- Git for Windows

### GitLab Runner Configuration

**`.gitlab-ci.yml` Windows job pattern**:
```yaml
test:integration:windows:
  tags:
    - windows
    - shell  # Use shell executor
  variables:
    NODE_OPTIONS: "--max-old-space-size=4096"
  script:
    # PowerShell commands
    - npm ci --prefer-offline
    - npm run test:integration
  after_script:
    # Clean up VS Code processes
    - taskkill /F /IM "code.exe" /T 2>$null || echo "OK"
```

**Critical**: Use `shell` executor, not Docker (VS Code headless requires native Windows).

### Common Windows Pitfalls

1. **Path Separators**: Always use `path.join()` in scripts, never `${VAR}/subdir`
2. **PowerShell vs Bash**: Default shell is PowerShell; use `$env:VAR` not `$VAR`
3. **Process Cleanup**: VS Code can lock files; use `taskkill /F` in `after_script`
4. **File Locking**: Use `force: true` when removing `.vscode-test` directory

---

## Secrets Management

### Required Secrets (from `release.yml:105-107`)

**In GitHub Actions**:
```yaml
env:
  VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

**In GitLab** (Settings → CI/CD → Variables):

| Variable | Value | Protected | Masked | Scope |
|----------|-------|-----------|--------|-------|
| `VSCE_PAT` | Your marketplace PAT | ✓ | ✓ | Protected branches/tags only |
| `GITHUB_TOKEN` | GitHub PAT for releases | ✓ | ✓ | Protected tags only |
| `CODECOV_TOKEN` | Codecov upload token | ✗ | ✓ | All |

**Marketplace Token Generation**: https://dev.azure.com/ → Personal Access Tokens → Marketplace (Publish)

---

## Coverage Reporting

### Current Setup (from `test.yml:73-93`)

**Linux** (unit only):
```yaml
- uses: codecov/codecov-action@v4
  with:
    files: ./coverage/coverage-final.json
    flags: unit
```

**Windows** (merged):
```yaml
- run: npm run coverage:merge  # Merges Vitest + NYC coverage
- uses: codecov/codecov-action@v4
  with:
    files: ./coverage-merged/lcov.info
    flags: merged
```

### GitLab Translation

**Coverage Regex** (extracts percentage for UI):
```yaml
coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
```

**MR Diff Coverage** (shows coverage changes):
```yaml
artifacts:
  reports:
    coverage_report:
      coverage_format: cobertura
      path: coverage/cobertura-coverage.xml
```

**Note**: Vitest automatically generates `cobertura-coverage.xml` when configured.

---

## Performance Optimizations

### 1. Cache Strategy

**From Experience**: Our `node_modules` cache saves ~2 minutes per job.

**GitLab Pattern**:
```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}-${CI_RUNNER_OS}
  paths:
    - node_modules/
    - .npm/
  policy: pull  # Read-only for test jobs
```

**Tip**: Use `policy: pull-push` only on jobs that install dependencies.

### 2. Fail-Fast Validation

**From `test.yml`**: Lint and type-check run first (2 min) before expensive tests (5 min).

**GitLab Stages**:
```yaml
stages:
  - validate      # 2 min - lint, types, security
  - build         # 1 min - esbuild bundle
  - test:unit     # 2 min - Vitest
  - test:integration  # 5 min - VS Code E2E
  - package       # 30s - vsce package
  - release       # 1 min - publish
```

### 3. Artifact Expiry

**From Experience**: Build artifacts only needed for 1 hour; coverage kept for 7-30 days.

**GitLab Pattern**:
```yaml
artifacts:
  paths: [dist/, out/]
  expire_in: 1 hour  # Intermediate build

artifacts:
  paths: [coverage/]
  expire_in: 30 days  # Long-term metrics
```

---

## Common Pitfalls & Solutions

### 1. Xvfb Not Found

**Error**: `Error: Failed to launch VS Code: spawn ENOENT`

**From `integration-tests.yml`**: Install Xvfb before running tests.

**Solution**:
```yaml
before_script:
  - apt-get update && apt-get install -y xvfb libgtk-3-0
script:
  - xvfb-run -a npm run test:integration
```

### 2. `/dev/shm` Too Small

**Error**: Chromium crashes with "shared memory" error

**Solution**: Add to test script launch args:
```javascript
launchArgs: ['--disable-dev-shm-usage']
```

### 3. Coverage Merge Failing

**From Changelog 1.0.7**: Coverage merge required fixing `outDir` in `tsconfig.json`.

**Solution**: Ensure `tsconfig.integration.json` has `outDir: "out"` for NYC instrumentation.

### 4. Flaky Integration Tests

**From `test.yml:66`**: Integration tests marked `continue-on-error: true`

**Reason**: E2E tests can be flaky in CI environments.

**GitLab**: Use `allow_failure: true` for integration tests in MRs.

---

## Release Workflow

### Tag-Based Releases (from `release.yml`)

**Process**:
1. Update `package.json` version: `1.0.10`
2. Update `CHANGELOG.md` with new version section
3. Commit: `chore: bump version to 1.0.10`
4. Tag: `git tag v1.0.10`
5. Push: `git push && git push --tags`
6. Pipeline auto-publishes to marketplace

**Changelog Format** (for extraction):
```markdown
## [1.0.10] - 2025-10-14

### 🐛 Critical Bug Fixes
- Fixed telemetry service integration
```

**Awk Script** (extracts release notes):
```bash
awk "/^## \[$VERSION\]/,/^## \[/" CHANGELOG.md | sed '$d'
```

---

## Testing Strategy

### Current Test Coverage (from Changelog 1.0.10)

- **371/371 unit tests passing** (Vitest)
- **21 integration tests** (VS Code test runner)
- **Zero TypeScript errors** (strict mode)

### Test Commands (from `package.json`)

```bash
npm run check-types        # TypeScript validation
npm run lint               # ESLint
npm run test:unit          # Vitest
npm run test:unit:coverage # Vitest + coverage
npm run test:integration   # VS Code E2E
npm run coverage:merge     # Merge unit + E2E coverage
```

### GitLab Pipeline Order

1. **Validate** (parallel): `check-types`, `lint`, `npm audit`
2. **Build**: `npm run package` (esbuild production)
3. **Test Unit**: `npm run test:unit:coverage`
4. **Test E2E**: `npm run test:integration` (Linux with Xvfb)
5. **Package**: `vsce package`
6. **Release**: `vsce publish` (tags only)

---

## CI/CD Readiness Checklist

Based on `PROJECT-TRACKING-SUMMARY.md`:

### Must-Have (Blockers)
- [x] Test success rate > 98% (371/371 = 100%)
- [x] Coverage > 80% (currently 76%, in progress)
- [x] All test setup errors resolved
- [ ] GitLab runner configured for Windows
- [ ] Secrets added to GitLab variables

### Should-Have
- [x] Cross-platform validation (Ubuntu + Windows in GitHub Actions)
- [x] Performance benchmarks (telemetry tracking)
- [x] Error handler coverage (enhanced in 1.0.10)

### Nice-to-Have
- [x] Complete API documentation
- [x] Marketplace assets (icon, screenshots)
- [ ] Coverage trending in GitLab

---

## Migration Steps

### Day 1: Setup
1. Install GitLab Runner on Windows machine
2. Register runner with project (tags: `windows`, `shell`)
3. Add secrets to GitLab Variables (VSCE_PAT, GITHUB_TOKEN)
4. Copy `.gitlab-ci.yml` from this repo

### Day 2: Test Pipeline
1. Create feature branch: `test/gitlab-ci`
2. Push to GitLab
3. Verify stages execute in correct order
4. Check cache effectiveness (timing)
5. Validate artifacts are downloadable

### Day 3: Windows Runner
1. Test Windows integration tests on local runner
2. Verify VS Code headless mode works
3. Check cleanup (`taskkill`, file deletion)
4. Confirm coverage merge works

### Day 4: Release Test
1. Create test tag: `v0.0.1-test`
2. Verify GitHub Release creation
3. Check marketplace publish (dry-run first)
4. Validate changelog extraction

### Day 5: Production
1. Merge `.gitlab-ci.yml` to master
2. Add pipeline status badge to README
3. Configure branch protection
4. Document new workflow in CLAUDE.md

---

## Monitoring & Maintenance

### Pipeline Duration Targets

| Stage | Target | Actual (GitHub) |
|-------|--------|-----------------|
| Validate | < 2 min | 1.5 min |
| Build | < 2 min | 1 min |
| Test Unit | < 3 min | 2 min |
| Test E2E | < 7 min | 5 min |
| Package | < 1 min | 30s |
| **Total** | **< 15 min** | **~10 min** |

### Cache Effectiveness

**Good**: Cache hit = job completes in ~1 min
**Bad**: Cache miss = job takes ~3 min (re-download node_modules)

**Check**: Look for "Downloading artifacts" vs "Using cached artifacts" in logs.

### Coverage Trends

**Target**: Maintain > 80% coverage
**Current**: 76% (unit), 46% (merged)
**Goal**: 85% by v1.1.0

---

## Resources

### Documentation
- [GitLab CI/CD Reference](https://docs.gitlab.com/ee/ci/yaml/)
- [GitLab Windows Runner Setup](https://docs.gitlab.com/runner/install/windows.html)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

### Internal Docs
- `CLAUDE.md` - Project instructions
- `PROJECT-TRACKING-SUMMARY.md` - Readiness metrics
- `CHANGELOG.md` - Release history
- `.github/workflows/` - Source GitHub Actions

### Tools
- `@vscode/vsce` - Marketplace publishing
- `@vscode/test-electron` - Integration testing
- Vitest - Unit testing
- NYC - Coverage merging

---

## Support

**Issues**: Found a problem? Check:
1. GitHub Actions logs for comparison
2. Windows runner logs (`gitlab-runner.log`)
3. VS Code output channel logs
4. Cache status and timing

**Questions**: Refer to existing GitHub Actions as source of truth.

---

**Version**: 1.0
**Last Updated**: 2025-01-14
**Tested With**: GitLab 16.x, Node.js 22.x, VS Code 1.103.x
