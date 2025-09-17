#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');
const { runTests } = require('@vscode/test-electron');
const { mkdtempSync, rmSync } = require('fs');

async function compileTests() {
  // Prefer existing npm script that compiles tests; fall back to tsc
  try {
    const { execSync } = require('child_process');
    execSync('npm run compile-tests', { stdio: 'inherit' });
  } catch (err) {
    console.warn('npm run compile-tests failed; attempting tsc -p .');
    const { execSync } = require('child_process');
    execSync('tsc -p .', { stdio: 'inherit' });
  }
}

async function main() {
  const cwd = process.cwd();
  const extensionDevelopmentPath = cwd;
  const extensionTestsPath = path.join(cwd, 'out', 'test', 'integration', 'suite', 'index.js');

  if (!fs.existsSync(extensionTestsPath)) {
    console.log('Compiled integration test entry not found at', extensionTestsPath);
    console.log('Compiling tests...');
    await compileTests();
    if (!fs.existsSync(extensionTestsPath)) {
      console.error('Failed to compile integration tests to', extensionTestsPath);
      process.exit(2);
    }
  }

  const tmpBase = os.tmpdir();
  const userDataDir = mkdtempSync(path.join(tmpBase, 'vscode-user-data-'));
  const extensionsDir = path.join(userDataDir, 'extensions');
  fs.mkdirSync(extensionsDir, { recursive: true });

  try {
    await runTests({
      version: process.env.VSCODE_TEST_VERSION || 'stable',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        `--user-data-dir=${userDataDir}`,
        `--extensions-dir=${extensionsDir}`,
        '--disable-telemetry',
        '--disable-gpu',
      ],
    });
    console.log('Integration tests finished successfully');
  } catch (err) {
    console.error('Integration tests failed:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {
      // ignore cleanup errors
    }
  }
}

main();
