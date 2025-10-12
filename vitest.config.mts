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
    setupFiles: ['./src/test/unit/vitest-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json']
    }
  }
});
