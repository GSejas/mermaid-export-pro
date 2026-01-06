import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

const vscodeMockPath = fileURLToPath(new URL('./src/test/unit/vscode-mock.ts', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Map imports of 'vscode' to our test mock
      vscode: vscodeMockPath
    }
  },
  test: {
    globals: true,
    environment: 'node',
    // Increase default timeout to accommodate longer integration-style unit tests
    testTimeout: 30000,
    include: ['src/test/unit/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      // TEMPORARY: Skip extension.test.ts due to mocking issues
      // See docs/developers/testing/EXTENSION-TEST-TODO.md for details
      // TODO: Fix in v1.0.8 - GitHub issue pending
      '**/extension.test.ts'
    ],
    setupFiles: ['./src/test/unit/vitest-setup.ts'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json']
    }
  }
});
