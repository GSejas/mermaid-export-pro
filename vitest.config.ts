import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Map imports of 'vscode' to our test mock
      vscode: path.resolve(__dirname, 'src/test/unit/vscode-mock.ts')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/unit/**/*.test.ts'],
    setupFiles: ['./src/test/unit/vitest-setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'lcov']
    }
  }
});
