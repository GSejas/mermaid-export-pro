# Dialog-Free Testing Architecture

## Summary of Changes

### Problem

Integration tests were blocked by VS Code dialogs (format picker, save dialog) that couldn't be mocked due to esbuild module bundling issues.

### Solution

Instead of fighting with mocking, we **added a test-specific command** that bypasses all dialogs:

1. **New `_testExport` command** - Hidden command for testing that accepts explicit output path
2. **Modified `runExportCommand()`** - Added optional `testOutputPath` parameter
3. **Smart format detection** - When `testOutputPath` is provided:
   - Derives format from file extension (`.png` → PNG, `.svg` → SVG, etc.)
   - Validates format and normalizes (`.jpeg` → `.jpg`)
   - Skips format/theme picker dialogs
   - Skips save dialog (uses provided path directly)

### Changes Made

**`src/commands/exportCommand.ts`:**

- Added `testOutputPath?: string` parameter to `runExportCommand()`
- Added logic to derive `ExportOptions` from file extension when in test mode
- Added format validation to prevent invalid extensions
- Added bypass for save dialog when `testOutputPath` is provided

**`src/extension.ts`:**

- Registered `mermaidExportPro._testExport` command for test-only usage
- Command signature: `(resource?: vscode.Uri, outputPath: string)`
- Added parameter validation

**`src/test/integration/suite/export-strategies.test.ts`:**

- Updated tests to use `_testExport` instead of `exportCurrent`
- Removed `skipInCI()` wrappers (tests now work in all environments)
- Removed mock dialog setup (no longer needed)

### Benefits

✅ Tests run without user interaction (no dialogs)
✅ Works in both CI and local environments  
✅ No complex mocking infrastructure needed
✅ Clean separation of test vs production code paths
✅ Command is hidden (`_` prefix) so users don't see it
✅ Format validation prevents invalid test configurations

### Architecture

**Export Modes** (in priority order):

1. **Test Mode** (`testOutputPath` provided)
   - Derives format from file extension
   - Uses default theme/dimensions
   - No dialogs shown

2. **Auto Mode** (`preferAuto=true`)
   - Generates smart filename
   - No save dialog
   - Still shows format/theme picker

3. **Interactive Mode** (default)
   - Shows format/theme picker
   - Shows save dialog
   - Full user interaction

**Design Decisions:**

- ✅ Single function handles all modes (DRY principle)
- ✅ Test mode is opt-in and explicit
- ✅ Production code paths unchanged
- ✅ Underscore prefix indicates internal command
- ⚠️  Slight violation of SRP (acceptable trade-off for simplicity)

### Usage

```typescript
// Test can specify exact output path - no dialogs!
await vscode.commands.executeCommand(
  'mermaidExportPro._testExport',
  undefined,  // resource (optional)
  '/path/to/output.svg'  // exact output path (required)
);
```

This approach is cleaner, more reliable, and follows VS Code testing best practices for integration tests.

