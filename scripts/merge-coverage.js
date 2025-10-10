/**
 * Coverage Merge Script
 *
 * Merges coverage data from unit tests (Vitest V8) and E2E tests (NYC/Istanbul)
 * into a single combined coverage report.
 *
 * @author Claude/Jorge
 * @version 1.0.0
 * @date 2025-10-10
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const PROJECT_ROOT = path.join(__dirname, '..');
const COVERAGE_UNIT = path.join(PROJECT_ROOT, 'coverage', 'coverage-final.json');
const COVERAGE_E2E_DIR = path.join(PROJECT_ROOT, '.nyc_output-e2e');
const COVERAGE_MERGED_DIR = path.join(PROJECT_ROOT, '.nyc_output-merged');
const COVERAGE_REPORT_DIR = path.join(PROJECT_ROOT, 'coverage-merged');

console.log('🔄 Merging coverage data from unit and E2E tests...\n');

// Ensure output directories exist
if (!fs.existsSync(COVERAGE_MERGED_DIR)) {
  fs.mkdirSync(COVERAGE_MERGED_DIR, { recursive: true });
}

if (!fs.existsSync(COVERAGE_REPORT_DIR)) {
  fs.mkdirSync(COVERAGE_REPORT_DIR, { recursive: true });
}

// Check if unit coverage exists
const hasUnitCoverage = fs.existsSync(COVERAGE_UNIT);
if (hasUnitCoverage) {
  console.log('✅ Found unit test coverage (Vitest V8)');
} else {
  console.warn('⚠️  No unit test coverage found at:', COVERAGE_UNIT);
}

// Check if E2E coverage exists
const hasE2ECoverage = fs.existsSync(COVERAGE_E2E_DIR) &&
                        fs.readdirSync(COVERAGE_E2E_DIR).length > 0;
if (hasE2ECoverage) {
  console.log('✅ Found E2E test coverage (NYC)');
} else {
  console.warn('⚠️  No E2E test coverage found at:', COVERAGE_E2E_DIR);
}

if (!hasUnitCoverage && !hasE2ECoverage) {
  console.error('\n❌ No coverage data found! Run tests with coverage first:');
  console.error('   npm run test:unit:coverage');
  console.error('   npm run test:integration:coverage');
  process.exit(1);
}

console.log('\n📊 Processing coverage data...\n');

try {
  // Step 1: Copy unit test coverage to merged directory
  if (hasUnitCoverage) {
    console.log('1️⃣  Copying unit test coverage...');
    const unitCoverage = JSON.parse(fs.readFileSync(COVERAGE_UNIT, 'utf8'));
    const mergedFile = path.join(COVERAGE_MERGED_DIR, 'vitest-coverage.json');
    fs.writeFileSync(mergedFile, JSON.stringify(unitCoverage, null, 2));
    console.log('   ✓ Unit coverage copied');
  }

  // Step 2: Copy E2E test coverage files to merged directory
  if (hasE2ECoverage) {
    console.log('2️⃣  Copying E2E test coverage...');
    const e2eFiles = fs.readdirSync(COVERAGE_E2E_DIR);
    let copiedCount = 0;

    e2eFiles.forEach(file => {
      if (file.endsWith('.json')) {
        const sourcePath = path.join(COVERAGE_E2E_DIR, file);
        const destPath = path.join(COVERAGE_MERGED_DIR, `e2e-${file}`);
        fs.copyFileSync(sourcePath, destPath);
        copiedCount++;
      }
    });

    console.log(`   ✓ Copied ${copiedCount} E2E coverage file(s)`);
  }

  // Step 3: Generate merged report using NYC
  console.log('3️⃣  Generating merged coverage report...');

  const nycCommand = `npx nyc report --reporter=text --reporter=html --reporter=lcov --reporter=json-summary --report-dir=${COVERAGE_REPORT_DIR} --temp-dir=${COVERAGE_MERGED_DIR}`;

  execSync(nycCommand, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  });

  console.log('   ✓ Merged report generated');

  // Step 4: Read and display summary
  const summaryPath = path.join(COVERAGE_REPORT_DIR, 'coverage-summary.json');
  if (fs.existsSync(summaryPath)) {
    console.log('\n📈 Coverage Summary:\n');

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const total = summary.total;

    const formatPercent = (pct) => {
      const num = pct.toFixed(2);
      if (pct >= 80) return `\x1b[32m${num}%\x1b[0m`; // Green
      if (pct >= 50) return `\x1b[33m${num}%\x1b[0m`; // Yellow
      return `\x1b[31m${num}%\x1b[0m`; // Red
    };

    console.log(`   Lines:      ${formatPercent(total.lines.pct)} (${total.lines.covered}/${total.lines.total})`);
    console.log(`   Statements: ${formatPercent(total.statements.pct)} (${total.statements.covered}/${total.statements.total})`);
    console.log(`   Functions:  ${formatPercent(total.functions.pct)} (${total.functions.covered}/${total.functions.total})`);
    console.log(`   Branches:   ${formatPercent(total.branches.pct)} (${total.branches.covered}/${total.branches.total})`);
  }

  console.log('\n✅ Coverage merge complete!\n');
  console.log('📁 Reports generated:');
  console.log(`   - HTML: ${path.relative(PROJECT_ROOT, path.join(COVERAGE_REPORT_DIR, 'lcov-report', 'index.html'))}`);
  console.log(`   - LCOV: ${path.relative(PROJECT_ROOT, path.join(COVERAGE_REPORT_DIR, 'lcov.info'))}`);
  console.log(`   - JSON: ${path.relative(PROJECT_ROOT, path.join(COVERAGE_REPORT_DIR, 'coverage-summary.json'))}`);

  console.log('\n💡 To view the HTML report, run:');
  console.log('   npm run coverage:view\n');

} catch (error) {
  console.error('\n❌ Error merging coverage:', error.message);
  process.exit(1);
}
