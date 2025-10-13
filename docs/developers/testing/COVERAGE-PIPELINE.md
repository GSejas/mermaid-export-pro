# Coverage Pipeline - Mermaid Export Pro

**Status**: ✅ ACTIVE - Merged coverage in CI
**Updated**: 2025-10-12
**Coverage Target**: 45%+ (currently ~46%)

---

## Overview

The project uses a **dual coverage pipeline** that merges unit test coverage (Vitest V8) and E2E test coverage (NYC/Istanbul) into a single comprehensive report.

### Why Two Coverage Tools?

| Test Type | Tool | Reason |
|-----------|------|--------|
| **Unit Tests** | Vitest V8 | Native ESM support, fast, modern |
| **E2E Tests** | NYC (Istanbul) | Works with VS Code integration tests |

**Challenge**: Different tools = incompatible coverage formats
**Solution**: Merge script that combines both into unified report

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Coverage Pipeline                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────┐          ┌──────────────────┐
│  Unit Tests     │          │  E2E Tests       │
│  (Vitest)       │          │  (NYC)           │
│                 │          │                  │
│  343 tests      │          │  29 tests        │
│  27 files       │          │  3 suites        │
└────────┬────────┘          └────────┬─────────┘
         │                            │
         │ V8 Format                  │ Istanbul Format
         │                            │
         ▼                            ▼
    coverage/                    .nyc_output-e2e/
    ├─ coverage-final.json      ├─ process-*.json
    └─ lcov.info                └─ out/
                                    └─ *.js.map
         │                            │
         └────────────┬───────────────┘
                      │
                      │ scripts/merge-coverage.js
                      ▼
              .nyc_output-merged/
              ├─ vitest-coverage.json
              └─ e2e-*.json
                      │
                      │ NYC report generator
                      ▼
              coverage-merged/
              ├─ lcov.info          ← Upload to Codecov
              ├─ lcov-report/       ← HTML report
              ├─ coverage-summary.json
              └─ coverage-final.json

┌─────────────────────────────────────────────────────────┐
│  Final Result: Unified coverage across all test types   │
│  Unit: ~42%  +  E2E: ~4%  =  Total: ~46%               │
└─────────────────────────────────────────────────────────┘
```

---

## NPM Scripts Reference

### Running Tests with Coverage

```bash
# Unit tests only (fast, runs on all platforms)
npm run test:unit:coverage
# Output: coverage/coverage-final.json

# E2E tests only (slow, Windows only)
npm run test:integration:coverage
# Output: coverage-e2e/

# Both + merge (complete coverage)
npm run test:coverage
# Output: coverage-merged/lcov.info
```

### Coverage Utilities

```bash
# Clean all coverage data
npm run coverage:clean

# Merge existing coverage (no re-run)
npm run coverage:merge

# Generate HTML report from merged data
npm run coverage:report

# Open HTML report in browser
npm run coverage:view
```

---

## CI/CD Integration

### GitHub Actions Workflow

The CI runs coverage in **two modes** depending on platform:

#### Linux (Ubuntu)
```yaml
- Run unit tests with coverage
- Upload unit coverage to Codecov (flag: unit)
```

**Why**: E2E tests don't run on Linux (VS Code display server issues)

#### Windows
```yaml
- Run unit tests with coverage
- Run E2E tests with coverage
- Merge coverage reports
- Upload merged coverage to Codecov (flag: merged)
```

**Why**: E2E tests require Windows for full VS Code integration

### Coverage Upload Strategy

| Platform | Upload | Flag | File |
|----------|--------|------|------|
| Linux | Unit only | `unit` | `coverage/coverage-final.json` |
| Windows | Merged | `merged` | `coverage-merged/lcov.info` |

**Result**: Codecov shows the most complete coverage (Windows merged)

### CI Workflow Code

From [.github/workflows/test.yml](../.github/workflows/test.yml):

```yaml
- name: Run unit tests with coverage
  run: npm run test:unit:coverage
  continue-on-error: false

- name: Run integration tests with coverage (Windows only)
  run: npm run test:integration:coverage
  if: runner.os == 'Windows'
  continue-on-error: true

- name: Merge coverage reports (Windows only)
  run: npm run coverage:merge
  if: runner.os == 'Windows'
  continue-on-error: true

- name: Upload unit coverage to Codecov (Linux)
  uses: codecov/codecov-action@v4
  if: matrix.os == 'ubuntu-latest'
  with:
    files: ./coverage/coverage-final.json
    flags: unit

- name: Upload merged coverage to Codecov (Windows)
  uses: codecov/codecov-action@v4
  if: runner.os == 'Windows'
  with:
    files: ./coverage-merged/lcov.info
    flags: merged
```

---

## Merge Script Details

**Location**: [scripts/merge-coverage.js](../../../scripts/merge-coverage.js)

### What It Does

1. **Finds Coverage Data**
   - Unit: `coverage/coverage-final.json` (V8 format)
   - E2E: `.nyc_output-e2e/*.json` (Istanbul format)

2. **Copies to Merge Directory**
   - Unit → `.nyc_output-merged/vitest-coverage.json`
   - E2E → `.nyc_output-merged/e2e-*.json`

3. **Runs NYC Report Generator**
   ```bash
   nyc report \
     --reporter=text \
     --reporter=html \
     --reporter=lcov \
     --reporter=json-summary \
     --report-dir=coverage-merged \
     --temp-dir=.nyc_output-merged
   ```

4. **Outputs Unified Reports**
   - `coverage-merged/lcov.info` - For Codecov
   - `coverage-merged/lcov-report/index.html` - For viewing
   - `coverage-merged/coverage-summary.json` - For badges

### Error Handling

The script handles:
- ✅ Missing unit coverage (continues with E2E only)
- ✅ Missing E2E coverage (continues with unit only)
- ❌ No coverage at all (exits with error)

### Output Example

```
🔄 Merging coverage data from unit and E2E tests...

✅ Found unit test coverage (Vitest V8)
✅ Found E2E test coverage (NYC)

📊 Processing coverage data...

1️⃣  Copying unit test coverage...
   ✓ Unit coverage copied
2️⃣  Copying E2E test coverage...
   ✓ Copied 5 E2E coverage file(s)
3️⃣  Generating merged coverage report...
   ✓ Merged report generated

📈 Coverage Summary:

   Lines:      46.23% (1850/4000)
   Statements: 45.87% (1920/4188)
   Functions:  42.15% (180/427)
   Branches:   38.92% (310/797)

✅ Coverage merge complete!

📁 Reports generated:
   - HTML: coverage-merged/lcov-report/index.html
   - LCOV: coverage-merged/lcov.info
   - JSON: coverage-merged/coverage-summary.json
```

---

## Coverage Targets

### Current Coverage (v1.0.7)

| Metric | Unit | E2E | **Merged** | Target |
|--------|------|-----|------------|--------|
| Lines | ~42% | ~4% | **~46%** | 45%+ ✅ |
| Statements | ~41% | ~5% | **~46%** | 45%+ ✅ |
| Functions | ~40% | ~2% | **~42%** | 40%+ ✅ |
| Branches | ~36% | ~3% | **~39%** | 35%+ ✅ |

**Status**: ✅ All targets met

### Coverage Goals

| Version | Target | Focus |
|---------|--------|-------|
| v1.0.7 | 45% | Baseline with merge pipeline |
| v1.0.8 | 50% | Fix extension tests (+5%) |
| v1.1.0 | 60% | Add E2E command tests (+10%) |
| v2.0.0 | 75% | Comprehensive coverage (+15%) |

---

## Local Development

### Running Coverage Locally

```bash
# Full pipeline (recommended)
npm run test:coverage

# Open HTML report
npm run coverage:view
# Opens: coverage-merged/lcov-report/index.html
```

### Viewing Coverage

**HTML Report** (Best for exploration):
```bash
npm run coverage:view
```

**Terminal Output**:
```bash
npm run coverage:merge
# Shows summary in terminal with colors
```

**VS Code Extension** (Optional):
Install "Coverage Gutters" extension to see coverage inline in editor.

---

## Troubleshooting

### Problem: "No coverage data found"

**Cause**: Tests haven't run with coverage enabled

**Solution**:
```bash
npm run coverage:clean
npm run test:unit:coverage
npm run test:integration:coverage  # Windows only
npm run coverage:merge
```

### Problem: "E2E coverage missing"

**Cause**: E2E tests only run on Windows

**Solution**: This is expected on Linux/Mac. The merge script will continue with unit coverage only.

### Problem: "Coverage percentage seems low"

**Cause**: Extension activation code (759 lines) is not tested

**Solution**: See [EXTENSION-TEST-TODO.md](EXTENSION-TEST-TODO.md) - planned for v1.0.8

### Problem: "Merge script fails"

**Check**:
1. Did unit tests run? `ls coverage/coverage-final.json`
2. Did E2E tests run? `ls .nyc_output-e2e/`
3. Is NYC installed? `npm list nyc`

**Debug**:
```bash
DEBUG=* npm run coverage:merge
```

---

## File Locations

### Coverage Output Directories

```
mermaid-export-pro/
├── coverage/                    # Unit test coverage (Vitest V8)
│   ├── coverage-final.json     # Raw V8 coverage
│   ├── lcov.info               # LCOV format
│   └── lcov-report/            # HTML report (unit only)
│
├── coverage-e2e/                # E2E test coverage (NYC)
│   └── (only generated on Windows)
│
├── .nyc_output-e2e/            # E2E raw coverage data
│   ├── process-*.json          # Per-process coverage
│   └── out/                    # Instrumented files
│
├── .nyc_output-merged/         # Merge working directory
│   ├── vitest-coverage.json   # Copied from unit
│   └── e2e-*.json             # Copied from E2E
│
└── coverage-merged/            # 🎯 FINAL MERGED COVERAGE
    ├── lcov.info              # ← Upload to Codecov
    ├── lcov-report/           # HTML report (merged)
    │   └── index.html         # View in browser
    ├── coverage-summary.json  # For badges
    └── coverage-final.json    # Raw merged data
```

### Scripts

- [scripts/merge-coverage.js](../../../scripts/merge-coverage.js) - Merge script
- [scripts/test-integration.js](../../../scripts/test-integration.js) - E2E test runner

### Configuration

- [package.json](../../../package.json) - NPM scripts
- [.github/workflows/test.yml](../../../.github/workflows/test.yml) - CI workflow
- [vitest.config.mts](../../../vitest.config.mts) - Vitest config
- [.nycrc.json](../../../.nycrc.json) - NYC config (if exists)

---

## Codecov Integration

### Flags

The project uses two Codecov flags:

1. **`unit`** - Unit test coverage only (Linux)
2. **`merged`** - Complete merged coverage (Windows)

### Badges

Add to README.md:

```markdown
[![Coverage](https://codecov.io/gh/GSejas/mermaid-export-pro/branch/master/graph/badge.svg?flag=merged)](https://codecov.io/gh/GSejas/mermaid-export-pro)
```

### Configuration

Codecov automatically:
- Accepts both uploads
- Shows merged coverage as primary
- Tracks coverage trends
- Comments on PRs with coverage diff

---

## Best Practices

### For Contributors

1. **Always run coverage locally before PR**
   ```bash
   npm run test:coverage
   npm run coverage:view
   ```

2. **Check coverage impact**
   - New features should include tests
   - Coverage should not drop below 45%

3. **Don't commit coverage artifacts**
   - `coverage/`, `coverage-e2e/`, `coverage-merged/` are in .gitignore
   - Only source code and tests go in git

### For Maintainers

1. **Monitor Codecov on each PR**
   - Check coverage change
   - Ensure no major drops

2. **Update coverage targets quarterly**
   - Review coverage goals
   - Adjust thresholds in CI

3. **Keep merge script updated**
   - Test after NYC version updates
   - Verify format compatibility

---

## Future Improvements

### Short Term (v1.0.8)
- [ ] Fix extension tests to boost coverage by ~5%
- [ ] Add coverage threshold checks in CI
- [ ] Generate coverage badge in README

### Medium Term (v1.1.0)
- [ ] Add E2E command execution tests (+10% coverage)
- [ ] Instrument provider code better
- [ ] Add visual regression tests

### Long Term (v2.0.0)
- [ ] Achieve 75% coverage target
- [ ] Add performance benchmarks to CI
- [ ] Generate coverage trends dashboard

---

## Related Documentation

- [EXTENSION-TEST-TODO.md](EXTENSION-TEST-TODO.md) - Extension test refactoring plan
- [CI-READINESS-FINAL.md](../../../reports/CI-READINESS-FINAL.md) - CI/CD status
- [TELEMETRY-TEST-COVERAGE.md](TELEMETRY-TEST-COVERAGE.md) - Telemetry coverage analysis

---

**Last Updated**: 2025-10-12
**Maintained By**: Development Team
**Status**: ✅ Production Ready

---

*This pipeline was designed to provide comprehensive coverage visibility while handling the complexity of dual test frameworks (Vitest + VS Code E2E).*
