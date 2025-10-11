/**
 * CI Helper - Detect CI environment and conditionally skip tests
 * 
 * Some tests require user interaction (dialogs) and cannot run in CI.
 * This helper provides utilities to skip those tests in CI while keeping
 * them enabled for local development.
 */

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.TRAVIS ||
    process.env.CIRCLECI ||
    process.env.GITLAB_CI ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE ||
    process.env.TF_BUILD // Azure Pipelines
  );
}

/**
 * Conditionally skip a test if running in CI
 * 
 * Usage:
 * ```typescript
 * skipInCI('should show save dialog', async function(this: Mocha.Context) {
 *   this.timeout(20000);
 *   // This test requires manual dialog interaction
 *   await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');
 * });
 * ```
 */
export function skipInCI(testName: string, testFn: (this: Mocha.Context) => Promise<void>): Mocha.Test {
  if (isCI()) {
    return test.skip(`${testName} [SKIPPED IN CI - requires manual dialog]`, testFn);
  }
  return test(testName, testFn);
}

/**
 * Get a descriptive reason for skipping
 */
export function skipReason(reason: string): string {
  if (isCI()) {
    return `[SKIPPED IN CI: ${reason}]`;
  }
  return '';
}
