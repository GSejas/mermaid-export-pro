# Coverage Integration Guide - Unit + E2E Tests

**Status:** ⚠️ **PARTIAL** - E2E tests don't currently aggregate with unit test coverage
**Date:** 2025-10-10

---

## 📊 Current Coverage Setup

### Unit Tests (Vitest + V8)
**Status:** ✅ **WORKING**

**Configuration:**
- Tool: Vitest with V8 coverage provider
- Config: `vitest.config.ts`
- Output: `coverage/` directory
- Formats: text, lcov, json
- Current Coverage: **25.56%** (statements)

**Run:**
```bash
npm run test:unit:coverage
```

**Output:**
```
coverage/
├── lcov.info              # LCOV format for CI tools
├── coverage-final.json    # JSON format
└── lcov-report/           # HTML report
    └── index.html         # View in browser
```

### E2E/Integration Tests (Mocha + @vscode/test-electron)
**Status:** ❌ **NO COVERAGE** - Currently not instrumented

**Configuration:**
- Tool: Mocha (VS Code extension testing)
- Config: `src/test/integration/suite/index.ts`
- Output: Test results only (no coverage)
- Tests: 29 E2E tests across 3 suites

**Run:**
```bash
npm run test:integration
```

**Problem:** E2E tests execute in VS Code extension host environment, which is different from the unit test environment. Coverage instrumentation is not currently configured.

---

## ❌ **The Coverage Gap**

### What's NOT Being Measured

When you run E2E tests, they exercise production code but **coverage is not aggregated** because:

1. **Different test runners**
   - Unit tests: Vitest (can instrument code)
   - E2E tests: Mocha + VS Code extension host (no instrumentation)

2. **Different execution environments**
   - Unit tests: Node.js with mocked VS Code API
   - E2E tests: Real VS Code extension host

3. **No shared coverage collector**
   - Vitest coverage only tracks unit test execution
   - E2E tests run outside Vitest's instrumentation

### Impact

Your **actual** code coverage is **HIGHER than reported**:

| Test Type | Coverage Reported | Actual Lines Executed | Counted? |
|-----------|-------------------|----------------------|----------|
| Unit Tests | 25.56% | ~3,000 lines | ✅ YES |
| E2E Tests | 0% (not measured) | ~2,000+ lines | ❌ NO |
| **COMBINED** | **25.56%** | **~5,000 lines** | **❌ INCOMPLETE** |

**Real coverage is likely ~45-50%** but only 25.56% is measured.

---

## ✅ **Solution: NYC (Istanbul) for E2E Coverage**

To aggregate coverage from both unit and E2E tests, you need NYC (Istanbul).

### Option 1: NYC + Mocha (Recommended)

**Install:**
```bash
npm install --save-dev nyc @istanbuljs/nyc-config-typescript source-map-support ts-node
```

**Create nyc.config.js:**
```javascript
module.exports = {
  extends: '@istanbuljs/nyc-config-typescript',
  all: true,
  include: [
    'src/**/*.ts'
  ],
  exclude: [
    'src/test/**',
    'src/**/*.test.ts',
    '**/webview/**',
    '**/*.min.js',
    'dist/**'
  ],
  reporter: ['text', 'lcov', 'html', 'json'],
  'report-dir': './coverage-e2e',
  extension: ['.ts'],
  'check-coverage': false,
  'source-map': true,
  'temp-dir': './.nyc_output'
};
```

**Update package.json scripts:**
```json
{
  "scripts": {
    "test:integration": "nyc mocha --require ts-node/register --extensions ts --recursive src/test/integration/**/*.test.ts",
    "test:integration:coverage": "nyc --reporter=lcov --reporter=text npm run test:integration",
    "coverage:merge": "nyc merge .nyc_output coverage/coverage-final.json",
    "coverage:report": "nyc report --reporter=lcov --reporter=text --reporter=html"
  }
}
```

**Run with coverage:**
```bash
# E2E tests with coverage
npm run test:integration:coverage

# Unit tests with coverage
npm run test:unit:coverage

# Merge coverage reports
npm run coverage:merge

# Generate combined report
npm run coverage:report
```

---

### Option 2: C8 (Simpler Alternative)

**Install:**
```bash
npm install --save-dev c8
```

**Update package.json:**
```json
{
  "scripts": {
    "test:integration:coverage": "c8 --reporter=lcov --reporter=text npm run test:integration",
    "coverage:merge": "c8 merge coverage-unit coverage-e2e --output-dir=coverage-all"
  }
}
```

**Run:**
```bash
c8 npm run test:integration
```

---

### Option 3: VS Code Extension Testing Coverage (Advanced)

For true VS Code extension coverage, you need to:

**Create test/coverage-runner.ts:**
```typescript
import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
import * as NYC from 'nyc';

export async function run(): Promise<void> {
  // Create NYC instance
  const nyc = new NYC({
    cwd: path.join(__dirname, '..', '..'),
    reporter: ['text', 'html', 'lcov'],
    all: true,
    instrument: true,
    hookRequire: true,
    include: ['dist/**/*.js'],
    exclude: ['**/test/**']
  });

  await nyc.reset();
  await nyc.wrap();

  // Run Mocha tests
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000
  });

  const testsRoot = path.resolve(__dirname, '..');
  const files = await glob('**/**.test.js', { cwd: testsRoot });

  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

  return new Promise((resolve, reject) => {
    mocha.run(async (failures) => {
      // Write coverage
      await nyc.writeCoverageFile();
      await nyc.report();

      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
```

---

## 🎯 **Recommended Implementation Plan**

### Phase 1: Separate Coverage (Easy - 2 hours)

**Goal:** Measure E2E coverage separately from unit coverage

**Steps:**
1. Install NYC: `npm install --save-dev nyc @istanbuljs/nyc-config-typescript`
2. Create `nyc.config.js` (see above)
3. Update `package.json` with E2E coverage script
4. Run both: `npm run test:unit:coverage && npm run test:integration:coverage`
5. View reports:
   - Unit: `coverage/lcov-report/index.html`
   - E2E: `coverage-e2e/lcov-report/index.html`

**Result:** You'll see TWO coverage reports showing what each test type covers.

### Phase 2: Merged Coverage (Medium - 4 hours)

**Goal:** Single combined coverage report

**Steps:**
1. Configure NYC to output to same temp dir
2. Create merge script
3. Run unit → run E2E → merge → report
4. Upload combined LCOV to code coverage tools (Codecov, Coveralls, etc.)

**Result:** ONE coverage report showing combined coverage from both test types.

### Phase 3: CI/CD Integration (Easy - 2 hours)

**Goal:** Automated coverage in CI pipeline

**Steps:**
1. Add coverage commands to GitHub Actions / CI
2. Upload coverage to Codecov or Coveralls
3. Add coverage badge to README
4. Set up PR coverage comments

**Result:** Automated coverage reporting on every commit.

---

## 📝 **Quick Start: Add E2E Coverage Now**

**1. Install NYC:**
```bash
npm install --save-dev nyc @istanbuljs/nyc-config-typescript
```

**2. Create `nyc.config.js` in project root:**
```javascript
module.exports = {
  extends: '@istanbuljs/nyc-config-typescript',
  all: true,
  include: ['src/**/*.ts'],
  exclude: [
    'src/test/**',
    '**/webview/**',
    '**/*.min.js'
  ],
  reporter: ['text', 'lcov', 'html'],
  'report-dir': './coverage-e2e',
  extension: ['.ts']
};
```

**3. Update package.json:**
```json
{
  "scripts": {
    "test:integration:coverage": "nyc --reporter=text --reporter=lcov npm run test:integration"
  }
}
```

**4. Run:**
```bash
npm run test:integration:coverage
```

**5. View report:**
```bash
open coverage-e2e/lcov-report/index.html
```

---

## 📊 **Expected Coverage After Integration**

### Before (Current)
- **Unit Tests Only:** 25.56% (measured)
- **E2E Tests:** Not measured
- **Combined:** Unknown

### After E2E Coverage Integration
- **Unit Tests:** ~25.56% (same)
- **E2E Tests:** ~20-25% (new measurement)
- **Combined (with overlap):** **~45-50%** (realistic total)

### Why Not 50%?

- **Overlap:** Both unit and E2E tests cover some of the same code
- **Different paths:** Unit tests cover error paths, E2E covers happy paths
- **Realistic estimate:**
  - Unit tests: 25% unique coverage
  - E2E tests: 20% unique coverage
  - Overlap: ~10%
  - **Total: ~45%** (25 + 20 + 10)

---

## 🎯 **Action Items**

### This Week (High Priority)
- [ ] Install NYC and dependencies
- [ ] Create `nyc.config.js`
- [ ] Add `test:integration:coverage` script
- [ ] Run E2E tests with coverage
- [ ] View separate E2E coverage report

### Next Week (Medium Priority)
- [ ] Create coverage merge script
- [ ] Generate combined coverage report
- [ ] Document coverage workflow
- [ ] Update CI/CD to run both coverage types

### Future (Low Priority)
- [ ] Instrument dist/ folder for true extension coverage
- [ ] Add coverage trend tracking
- [ ] Set up automated coverage diff in PRs
- [ ] Configure coverage thresholds

---

## 📚 **Resources**

- [NYC Documentation](https://github.com/istanbuljs/nyc)
- [Istanbul Coverage](https://istanbul.js.org/)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Codecov](https://codecov.io/)
- [Coveralls](https://coveralls.io/)

---

## ✅ **Summary**

**Current State:**
- ❌ E2E tests don't contribute to coverage reports
- ✅ Unit tests have coverage (25.56%)
- ❌ Real coverage is underreported

**Solution:**
- Install NYC for E2E coverage instrumentation
- Run E2E tests with `nyc` wrapper
- Optionally merge unit + E2E coverage
- **Result:** Accurate ~45-50% combined coverage

**Estimated Effort:** 2-6 hours depending on complexity level chosen

---

**Last Updated:** 2025-10-10
**Status:** Awaiting implementation
**Next Step:** Install NYC and run first E2E coverage report
