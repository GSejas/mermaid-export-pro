"use strict";
/**
 * CI Helper - Detect CI environment and conditionally skip tests
 *
 * Some tests require user interaction (dialogs) and cannot run in CI.
 * This helper provides utilities to skip those tests in CI while keeping
 * them enabled for local development.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCI = isCI;
exports.skipInCI = skipInCI;
exports.skipReason = skipReason;
/**
 * Check if running in CI environment
 */
function isCI() {
    return !!(process.env.CI ||
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
function skipInCI(testName, testFn) {
    if (isCI()) {
        return test.skip(`${testName} [SKIPPED IN CI - requires manual dialog]`, testFn);
    }
    return test(testName, testFn);
}
/**
 * Get a descriptive reason for skipping
 */
function skipReason(reason) {
    if (isCI()) {
        return `[SKIPPED IN CI: ${reason}]`;
    }
    return '';
}
//# sourceMappingURL=ci-helper.js.map