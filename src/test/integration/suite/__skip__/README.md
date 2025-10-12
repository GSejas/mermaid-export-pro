# Skipped Integration Tests

This directory contains integration tests that are **intentionally excluded** from CI runs and standard test execution.

## Files in This Directory

### batch-export.test.ts
**Why skipped**: Batch export workflow requires 14+ different dialog interactions (format selection, output directory, theme, background, naming, organization, advanced options, etc.). Converting these to dialog-free testing would require:
- Creating a test-specific `_testBatchExport` command
- Passing all configuration as parameters (complex options object)
- Significant refactoring of `batchExportCommand.v2.ts`

**Status**: Deferred for future work. Manual testing recommended for batch export functionality.

**Recommendation**: When implementing CI for batch exports:
1. Create `_testBatchExport(options: BatchExportTestOptions)` command
2. Accept all configuration via options parameter
3. Skip all dialogs when `options` is provided
4. Update batch-export.test.ts to use new command
5. Move back to main suite directory

### debug-*.test.ts (3 files)
**Why skipped**: These are diagnostic/debugging tools used during development to:
- Test dialog mocking behavior
- Verify `exportCurrent` command behavior
- Test `exportAs` command with various parameters
- Debug test infrastructure issues

**Status**: Kept for future debugging sessions but not part of regular test suite.

**Recommendation**: Keep in __skip__ folder for developer use. Not needed in CI.

### diagnostic-param-test.test.ts
**Why skipped**: This is a developer tool for testing parameter passing to commands. Not a functional test of export behavior.

**Status**: Kept for debugging parameter-related issues.

**Recommendation**: Keep in __skip__ folder for developer use. Not needed in CI.

## How Tests Are Excluded

Tests in this directory are excluded via `tsconfig.json`:
```json
{
  "exclude": [
    "src/test/integration/suite/__skip__/**"
  ]
}
```

This prevents TypeScript from compiling these files, effectively skipping them during test execution.

## Running Skipped Tests Manually

To run these tests for development/debugging:

1. Temporarily remove `__skip__` from `tsconfig.json` exclusions
2. Run `npm run compile` to build the tests
3. Run the test suite or specific test file
4. Re-add `__skip__` exclusion when done

## CI Strategy

The main CI test suite includes:
- ✅ `export-strategies.test.ts` - Single file export workflows (dialog-free)
- ✅ `advanced-features.test.ts` - Performance and error handling (dialog-free for core tests)
- ✅ `minimal-dialog-test.test.ts` - Reference implementation for dialog-free pattern

These tests use the `_testExport` command with explicit output paths, requiring no user interaction.

---

**Last Updated**: 2025-10-11  
**Maintainer**: Claude/Jorge
