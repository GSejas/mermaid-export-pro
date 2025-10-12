# Dialog-Free Integration Testing

## Overview
This document describes the infrastructure for running integration tests without user interaction or dialogs.

## Problem
VS Code integration tests run in a real VS Code instance, and VS Code dialogs (file pickers, format selectors, confirmation messages) **cannot be mocked** due to:
- Extension bundling creates separate module instances
- Dialog APIs are deeply integrated into VS Code's window service
- Headless testing environments cannot interact with native OS dialogs

## Solution: Test-Specific Command Pattern

### Architecture
We created a **test-only command** `mermaidExportPro._testExport` that:
1. Accepts explicit parameters (output path) instead of showing dialogs
2. Bypasses all user interaction points
3. Returns immediately after export completes
4. Is **not exposed** in `package.json` (internal only)

### Command Signature
```typescript
mermaidExportPro._testExport(resource?: vscode.Uri, outputPath: string): Promise<void>
```

**Parameters:**
- `resource` - Optional URI of file to export (defaults to active editor)
- `outputPath` - **Required** absolute path where export should be saved (format inferred from extension)

### Implementation Details

#### 1. Extension Command Registration (`src/extension.ts`)
```typescript
const testExportCommand = vscode.commands.registerCommand(
  'mermaidExportPro._testExport',
  async (resource: vscode.Uri | undefined, outputPath: string) => {
    if (!outputPath || typeof outputPath !== 'string') {
      throw new Error('_testExport requires explicit outputPath parameter');
    }
    await runExportCommand(context, false, resource, outputPath);
  }
);
```

#### 2. Export Command Logic (`src/commands/exportCommand.ts`)
The `runExportCommand` function has three modes:

```typescript
export async function runExportCommand(
  context: vscode.ExtensionContext,
  preferAuto: boolean,
  resource?: vscode.Uri,
  testOutputPath?: string  // NEW: Test mode parameter
): Promise<void>
```

**Execution Modes:**
1. **Test Mode** (`testOutputPath` provided):
   - Format derived from file extension
   - No format dialog shown
   - No save file dialog shown
   - No success message dialog shown
   - Returns immediately after file written

2. **Auto Mode** (`preferAuto=true`):
   - Format from user preferences
   - Output path auto-generated
   - No save file dialog
   - Success message shown

3. **Interactive Mode** (default):
   - Format picker dialog shown
   - Save file dialog shown
   - Success message with actions shown

**Key Code Sections:**
```typescript
// Test mode: Skip all dialogs
if (testOutputPath) {
  const ext = path.extname(testOutputPath).slice(1) as ExportFormat;
  exportOptions = {
    format: ext === 'jpeg' ? 'jpg' : ext,
    theme: 'default',
    // ...defaults
  };
  outputPath = testOutputPath;
}

// Skip success dialog in test mode
if (!testOutputPath) {
  const action = await vscode.window.showInformationMessage(...);
  // Handle actions...
} else {
  console.log('[DEBUG exportCommand] Test mode - skipping success dialog');
}
```

### Test Helper API

#### VSCodeTestHelper.executeTestExport()
Simplified helper method for tests:

```typescript
/**
 * Execute test export command (bypasses all dialogs)
 * @param outputPath - Full path where export should be saved
 * @param resource - Optional resource URI (defaults to active editor)
 */
async executeTestExport(outputPath: string, resource?: vscode.Uri): Promise<void> {
  await this.executeCommand('mermaidExportPro._testExport', resource, outputPath);
}
```

**Usage in Tests:**
```typescript
// Open file in editor
const editor = await vscodeHelper.openFile(diagramPath);

// Define output path (format inferred from extension)
const outputPath = diagramPath.replace('.mmd', '.svg');

// Execute test export (NO DIALOGS!)
await vscodeHelper.executeTestExport(outputPath);

// Wait for completion
await vscodeHelper.sleep(5000);

// Verify file created
assert.ok(fs.existsSync(outputPath));
```

## Conversion Guide: Updating Existing Tests

### Before (Dialog-Based)
```typescript
test('should export diagram', async () => {
  await vscodeHelper.openFile(diagramPath);
  
  // ❌ Shows format picker dialog
  await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');
  
  // ❌ User must interact with save dialog
  // ❌ User must dismiss success message
  
  await vscodeHelper.sleep(10000);
  
  // ⚠️ Don't know where file was saved!
});
```

### After (Dialog-Free)
```typescript
test('should export diagram', async () => {
  await vscodeHelper.openFile(diagramPath);
  
  const outputPath = diagramPath.replace('.mmd', '.svg');
  
  // ✅ No dialogs - fully automated
  await vscodeHelper.executeTestExport(outputPath);
  
  await vscodeHelper.sleep(5000);
  
  // ✅ Know exact output location
  assert.ok(fs.existsSync(outputPath));
});
```

## Test Status

### ✅ Converted Tests (Dialog-Free)
- `minimal-dialog-test.test.ts` - Basic SVG export
- `export-strategies.test.ts` (partial):
  - TC-E2E-007: Single File Export (SVG)
  - TC-E2E-007: PNG Format Export

### ⏸️ Tests Requiring Conversion
Tests still using `exportCurrent` command (show dialogs):
- TC-E2E-008: Markdown Integration
- TC-E2E-008: Strategy Selection  
- TC-E2E-009: Theme Options
- TC-E2E-010: Multiple Format Export
- TC-E2E-011: Error Recovery
- TC-E2E-012: Complex Diagrams

**Action Required:** Convert these tests to use `executeTestExport()` with explicit output paths.

### 🚫 Tests That Cannot Be Automated
Some tests **intentionally** test user interaction flows:
- Format picker UI behavior
- Save dialog cancellation
- Success message button actions

**Recommendation:** Mark these with `skipInCI()` wrapper and document as "manual testing required".

## CI/CD Integration

### GitHub Actions Configuration
```yaml
- name: Run Integration Tests
  run: npm run test:integration
  env:
    CI: true  # CI detection flag
```

Tests wrapped with `skipInCI()` will automatically skip in CI:
```typescript
skipInCI('should show format picker dialog', async () => {
  // This test requires user interaction - skip in CI
  await vscodeHelper.executeCommand('mermaidExportPro.exportCurrent');
});
```

## Debugging Test-Specific Code

### Enable Debug Logs
Debug logs are prefixed with markers:
- `[TEST COMMAND]` - Test command handler logs
- `[DEBUG exportCommand]` - Export command execution flow

**View logs in test output:**
```bash
npm run test:integration 2>&1 | Select-String "\[TEST COMMAND\]|\[DEBUG"
```

### Common Issues

#### Test Timeout
**Symptom:** Test times out after 20 seconds  
**Cause:** Command not returning (waiting for dialog)  
**Fix:** Ensure `testOutputPath` parameter is passed correctly

#### File Not Created
**Symptom:** `fs.existsSync(outputPath)` returns false  
**Cause:** Export failed silently  
**Check:** Look for error logs in test output

#### Wrong Format Exported
**Symptom:** Created file has wrong extension  
**Cause:** Format inference logic error  
**Fix:** Ensure output path has correct extension (`.svg`, `.png`, `.pdf`, `.jpg`)

## Best Practices

### 1. Always Provide Absolute Paths
```typescript
// ✅ Good
const outputPath = path.join(workspaceDir, 'output.svg');
await vscodeHelper.executeTestExport(outputPath);

// ❌ Bad
await vscodeHelper.executeTestExport('output.svg');
```

### 2. Derive Format from Extension
```typescript
// ✅ Format inferred automatically
const outputPath = diagramPath.replace('.mmd', '.png');  // PNG export

// ❌ Don't specify format separately
```

### 3. Use Appropriate Wait Times
```typescript
// ✅ 5 seconds usually enough for single export
await vscodeHelper.sleep(5000);

// ⚠️ Complex diagrams may need more
await vscodeHelper.sleep(10000);
```

### 4. Clean Up Test Files
```typescript
teardown(async () => {
  await fixtureManager.cleanup();  // Removes temp files
  await vscodeHelper.closeAllEditors();
});
```

## Future Enhancements

### Possible Improvements
1. **Progress Callback**: Return progress updates instead of waiting blindly
2. **Promise Resolution**: Resolve when export completes (eliminate `sleep()`)
3. **Batch Test Export**: Export multiple files in one command call
4. **Format Override**: Allow format parameter separate from output path

### Not Recommended
- ❌ Trying to mock VS Code dialogs (fragile, breaks with bundling)
- ❌ Using external automation tools (Puppeteer, Playwright) - overkill for extension tests
- ❌ Patching VS Code window service (breaks encapsulation)

## Related Documentation
- [Test Coverage Analysis](./TEST-COVERAGE-ANALYSIS.md)
- [Test Scenarios](./TEST-SCENARIOS.md)
- [CI Helper Documentation](../../src/test/integration/helpers/ci-helper.ts)

## Conclusion
The test-specific command pattern provides a **clean**, **maintainable** solution for dialog-free integration testing. By accepting explicit parameters instead of relying on user interaction, tests become:
- ✅ Fully automated
- ✅ Deterministic (no dialog timing issues)
- ✅ CI-friendly (no headless browser needed)
- ✅ Fast (no waiting for dialog animations)

**Recommendation:** Convert all existing dialog-based tests to use `executeTestExport()` where possible.
