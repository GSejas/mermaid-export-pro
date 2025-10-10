/**
 * NYC (Istanbul) Configuration for Coverage Reporting
 *
 * This config is used for both unit and E2E test coverage collection.
 * Coverage is collected separately and then merged.
 *
 * @author Claude/Jorge
 * @version 1.0.0
 * @date 2025-10-10
 */

module.exports = {
  // Include all source files for coverage
  all: true,

  // Files to include in coverage
  include: [
    'src/**/*.ts',
    'dist/**/*.js'
  ],

  // Files to exclude from coverage
  exclude: [
    'src/test/**',
    'src/**/*.test.ts',
    'src/test/__mocks__/**',
    '**/webview/**',
    '**/*.min.js',
    '**/node_modules/**',
    'dist/webview/**',
    'scripts/**'
  ],

  // File extensions to cover
  extension: ['.ts', '.js'],

  // Reporters to generate
  reporter: [
    'text',        // Console output
    'text-summary', // Brief summary
    'lcov',        // LCOV format (for CI tools)
    'html',        // HTML report
    'json'         // JSON format (for merging)
  ],

  // Output directory for coverage reports
  'report-dir': './coverage-nyc',

  // Temp directory for coverage data
  'temp-dir': './.nyc_output',

  // Require these files before running tests
  require: [
    'ts-node/register',
    'source-map-support/register'
  ],

  // Enable source maps
  'source-map': true,
  'produce-source-map': true,

  // Don't check coverage thresholds (yet)
  'check-coverage': false,

  // Branch coverage (when enabled)
  branches: 80,
  lines: 80,
  functions: 80,
  statements: 80,

  // Cache coverage data
  cache: true,
  'cache-dir': './.nyc_cache',

  // Instrumentation settings
  instrument: true,
  'hook-require': true,
  'hook-run-in-context': true,
  'hook-run-in-this-context': true,

  // Clean temp files
  'clean': true,

  // Per-file coverage
  'per-file': true,

  // Skip empty files
  'skip-empty': true,

  // Skip coverage if files are empty
  'skip-full': false,

  // Compact output
  compact: false,

  // Show process tree
  'show-process-tree': false
};
