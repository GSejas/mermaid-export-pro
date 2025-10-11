# Vitest Config ESM Fix

**Date:** 2025-10-10
**Issue:** CI/CD failing with `ERR_REQUIRE_ESM` error
**Status:** ✅ FIXED

## Problem

GitHub Actions CI/CD was failing with this error:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module
/home/runner/work/.../node_modules/vite/dist/node/index.js
from .../node_modules/vitest/dist/config.cjs not supported.
```

## Root Cause

The `vitest.config.ts` file uses ES Module syntax (`import`/`export`) but in CI/CD environments without `"type": "module"` in package.json, TypeScript files with `.ts` extension can be ambiguous about their module format.

In CI/CD (Linux), Vitest's loader treated the config as CommonJS and failed when it encountered `import` statements.

## Solution

Renamed `vitest.config.ts` → `vitest.config.mts`

The `.mts` extension explicitly marks the file as an ES Module, regardless of package.json settings.

## Files Changed

**Renamed:**
- `vitest.config.ts` → `vitest.config.mts`

**No other changes needed:**
- Vitest automatically detects `vitest.config.{ts,mts,js,mjs}` files
- All npm scripts continue to work without modification
- No package.json changes required

## Validation

**Before (Failed in CI):**
```bash
npm run test:unit:coverage
# Error [ERR_REQUIRE_ESM]
```

**After (Works in CI):**
```bash
npm run test:unit:coverage
# ✓ All 194 tests passing
```

## Why This Works

TypeScript file extensions:
- `.ts` - Ambiguous (follows package.json `"type"` field)
- `.mts` - **Always ES Module** (explicit)
- `.cts` - Always CommonJS (explicit)

Since our config uses `import`/`export` syntax, `.mts` is the correct extension.

## Impact

- ✅ CI/CD builds now work on Linux
- ✅ Local development still works on Windows/macOS
- ✅ No breaking changes to existing scripts
- ✅ Coverage pipeline now fully functional in GitHub Actions

## References

- [TypeScript Module Extensions](https://www.typescriptlang.org/docs/handbook/esm-node.html)
- [Vitest Config Guide](https://vitest.dev/config/)
- [Node.js ESM Detection](https://nodejs.org/api/packages.html#determining-module-system)

---

**Status:** ✅ RESOLVED
**Validated:** 2025-10-10 (Windows local + GitHub Actions)
