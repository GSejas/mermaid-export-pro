# VS Code Mock Fix - URGENT CI Blocker

**Date:** 2025-10-12  
**Status:** � MITIGATION ONLY (follow-up required)

---

## Problem

CI intermittently fails with `Cannot find module 'vscode'` even though the Vitest alias is defined. The failure occurs whenever compiled `src/**/*.js` artifacts sit beside the `.ts` sources. Node/Vitest prefers the `.js` file, skips our mock, and tries to load the real VS Code API.

```
Error: Cannot find module 'vscode'
Require stack:
- /home/runner/work/.../src/extension.js
```

### Root Cause (updated 2025-10-12)
- Renaming `vitest.config.ts` → `vitest.config.mts` removed `__dirname`. We patched the config with `import.meta.url`, but the deeper issue is **in-source JavaScript output**.
- When TypeScript emits `.js` next to `.ts`, Node resolves the `.js` files first. Those compiled files still `require('vscode')`.
- Deleting the compiled files returns Vitest to a green state, but the problem resurfaces the moment someone runs `tsc` locally.

---

## Current Status

| Metric | 2025-10-10 | 2025-10-12 |
|--------|------------|------------|
| Unit tests failing | 23 / 27 | 0 / 27 *if `src/**/*.js` removed* |
| Integration tests | Many blocked by dialogs | Core suites skipped pending export fix |
| Release impact | 🔴 blocked v1.0.7 | 🟠 block on "full test suite" gate |

Unit tests are presently green in CI after purging the compiled JS, but we need automation to keep the folder clean.

---

## Fixes Implemented

**File:** `vitest.config.mts`

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const vscodeMock = fileURLToPath(new URL('./src/test/unit/vscode-mock.ts', import.meta.url));
const srcDir = fileURLToPath(new URL('./src/', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      vscode: vscodeMock,
      '@': srcDir,
    },
  },
  test: {
    includeSource: ['src/**/*.{ts,tsx}'],
  },
});
```

- ✅ Uses `import.meta.url` for ESM-safe path resolution
- ✅ Forces Vitest to pre-bundle `.ts` files via `includeSource`
- ⚠️ Still depends on `src/` containing *only* TypeScript

---

## Recommended Hardening Steps

1. **Stop emitting JavaScript into `src/`.**
   - Update `tsconfig.json`:
     ```json
     {
       "compilerOptions": {
         "outDir": "dist",
         "rootDir": "src",
         "noEmit": false
       }
     }
     ```
   - Update build scripts so packaging consumes `dist/`.
2. **Use `noEmit` when running tests.**
   - Add a test-specific tsconfig or invoke `tsc --noEmit` before Vitest.
3. **Add an automatic cleanup.**
   - Example `package.json` script: `"clean:compiled": "rimraf \"src/**/*.js\" \"src/**/*.js.map\""` and run it in the test pipeline.
4. **Verify CI caches.**
   - Ensure GitHub Actions never restores an artifact that includes compiled `src/**/*.js`.

---

## Immediate To-Do List

- [ ] Land tsconfig `outDir` change (CI-142)
- [ ] Wire `npm run clean:compiled` into `npm run test:unit`
- [ ] Re-run Vitest locally and in CI to confirm zero deps on `.js`
- [ ] Remove temporary skips once export pipeline issues are resolved
- [ ] Add regression test ensuring `src/extension.js` is absent before Vitest

---

## Lessons Learned

1. **ESM configs need `import.meta.url`.** No more ad-hoc `__dirname` shims.
2. **Keep source directories source-only.** Emitted JS inside `src/` undermines tooling (Node, Vitest, ts-node, etc.).
3. **CI parity matters.** Windows tolerates `.js` next to `.ts`; Linux runners do not.
4. **Automate cleanup.** Manual removal is unsustainable; scripts must guard against regressions.

---

**Status:** Mitigated locally; blocked until build output is separated and automation enforces a clean `src/` tree. Track follow-up work under **CI-142 – “Lock Vitest to TS sources.”**
