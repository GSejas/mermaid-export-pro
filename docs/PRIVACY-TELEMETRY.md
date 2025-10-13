# Privacy & Telemetry Guide

## Overview

Mermaid Export Pro includes **optional, opt-in** anonymous usage statistics to help improve the extension. This document explains what data is collected, how it's stored, and how you control it.

## Key Principles

✅ **Opt-In Only**: Telemetry is **disabled by default**. You must explicitly enable it.
✅ **Anonymous**: No personal information is ever collected.
✅ **Local Storage**: All data stays on your machine until you choose to share it.
✅ **Full Control**: View, export, or delete your data at any time.
✅ **Transparent**: This document fully discloses what is collected.

## What Is Collected

When telemetry is enabled, the following anonymous data is tracked:

### Export Events
- Export format used (svg, png, pdf, etc.)
- Export strategy (CLI or web)
- Export duration (performance metric)
- File size of exported diagram
- Diagram type (flowchart, sequence, etc.)
- Success/failure status

### Error Events
- Error type (e.g., "CLI_NOT_FOUND", "EXPORT_TIMEOUT")
- Sanitized error message (personal info removed)
- Action that caused the error

### Command Usage
- Command executed (e.g., "exportCurrent", "batchExport")
- Source of command (palette, context menu, codelens, status bar)

### System Health
- Whether CLI is available
- Node.js version (if applicable)
- Platform (Windows, macOS, Linux)
- VS Code version
- Extension version

### Performance Metrics
- Operation durations
- Batch export statistics
- Resource usage patterns

## What Is NOT Collected

❌ **File Names**: We never track your file or folder names
❌ **File Paths**: No directory structures are recorded
❌ **Diagram Content**: Your actual mermaid code is never collected
❌ **Personal Information**: No usernames, emails, or identifying data
❌ **IP Addresses**: No network information is collected
❌ **Workspace Information**: No project or folder names

## Data Storage

### Local Storage
- All telemetry data is stored locally in your VS Code global storage directory
- Typically: `~/.config/Code/User/globalStorage/GSejas.mermaid-export-pro/telemetry.json`
- Limited to 10,000 events to prevent excessive disk usage
- Can be deleted at any time

### No Cloud Upload
- By default, telemetry data **never leaves your machine**
- Only you can export and share your data (for bug reports)
- No automatic transmission to remote servers

## How to Enable Telemetry

### Option 1: Settings UI
1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "mermaid telemetry"
3. Check ✅ **Mermaid Export Pro › Telemetry: Enabled**

### Option 2: settings.json
Add to your `settings.json`:
```json
{
  "mermaidExportPro.telemetry.enabled": true
}
```

### Option 3: Command Palette
1. `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Search for "Preferences: Open Settings (UI)"
3. Search for "mermaid telemetry"
4. Enable the setting

## Managing Your Data

### View Your Statistics

**Command**: `Mermaid Export Pro: Show Usage Statistics`

This opens a markdown document showing:
- Total exports by format and strategy
- Average export times
- Command usage patterns
- Error statistics
- Success rates

**Example Output:**
```markdown
## Summary
- Total Exports: 142
- Total Errors: 3
- Sessions: 12
- Average Export Time: 1,234ms

## Export Statistics by Format
- svg: 87 exports
- png: 42 exports
- pdf: 13 exports

## Success Rates
- CLI Success Rate: 98.5%
- Web Success Rate: 100%
```

### Export Your Data

**Command**: `Mermaid Export Pro: Export Usage Data (for bug reports)`

This creates a JSON file containing:
- Summary statistics
- Raw event log (if telemetry is enabled)
- System information
- Export timestamp

**Output Location:**
```
~/mermaid-export-pro-telemetry/telemetry-export-[timestamp].json
```

**Use Cases:**
- Attach to bug reports for better debugging
- Share with maintainers when requesting features
- Analyze your own usage patterns

### Clear Your Data

**Command**: `Mermaid Export Pro: Clear Usage Data`

This permanently deletes all stored telemetry events.

⚠️ **Warning**: This action cannot be undone.

## Privacy Safeguards

### Automatic Sanitization

All error messages are automatically sanitized to remove:
- File paths → replaced with `[PATH]`
- Email addresses → replaced with `[EMAIL]`
- Long messages → truncated to 500 characters

**Example:**
```
Before: "Export failed: Cannot write to C:\Users\John\Documents\diagram.svg"
After: "Export failed: Cannot write to [PATH]"
```

### No Identifiers

- No user IDs
- No machine IDs
- No session tokens
- Anonymous session IDs are generated per VS Code session

### Platform Detection Only

System information is limited to:
- OS type (Windows, macOS, Linux)
- VS Code version (e.g., "1.103.0")
- Extension version (e.g., "1.0.6")

## Sharing Data with Maintainers

When filing bug reports or feature requests, sharing your telemetry data can help maintainers:

✅ **Understand your use case** - See which formats and features you use most
✅ **Reproduce bugs** - Know which operations failed and when
✅ **Prioritize features** - See which commands are most popular
✅ **Optimize performance** - Identify slow operations

### How to Share

1. Enable telemetry and use the extension normally
2. When ready to report an issue:
   ```
   Command: Mermaid Export Pro: Export Usage Data (for bug reports)
   ```
3. Locate the exported JSON file
4. Attach to your GitHub issue or email

### What to Review Before Sharing

Open the JSON file and verify:
- No personal file paths (should show `[PATH]`)
- No sensitive error messages
- No unexpected data

## Disabling Telemetry

### Disable at Any Time

1. Open Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "mermaid telemetry"
3. Uncheck **Mermaid Export Pro › Telemetry: Enabled**

**Or via settings.json:**
```json
{
  "mermaidExportPro.telemetry.enabled": false
}
```

### What Happens When Disabled

- ✅ All tracking stops immediately
- ✅ Existing data remains stored locally (not deleted)
- ✅ You can still export/view your data
- ✅ No new events are recorded

### Delete Data After Disabling

To completely remove telemetry data:
```
Command: Mermaid Export Pro: Clear Usage Data
```

## Frequently Asked Questions

### Why is telemetry opt-in?

**Privacy first.** We believe users should explicitly choose to share data, not be tracked by default.

### Can I use the extension without telemetry?

**Yes!** All features work normally with telemetry disabled. It has zero impact on functionality.

### Will telemetry slow down the extension?

**No.** Telemetry tracking is asynchronous and has negligible performance impact (< 1ms overhead).

### How long is data stored?

**Indefinitely**, until you clear it or the extension is uninstalled. However, only the most recent 10,000 events are kept.

### Can I see the telemetry code?

**Yes!** The extension is open source:
- Telemetry implementation: `src/services/telemetryService.ts`
- GitHub repository: https://github.com/GSejas/mermaid-export-pro

### What if I find a privacy issue?

**Report immediately** to: jsequeira03@gmail.com

We take privacy seriously and will address concerns promptly.

## Transparency Commitment

This extension is committed to:

1. **Honest Communication**: This document fully discloses data collection practices
2. **User Control**: You decide what data is collected and when
3. **Open Source**: Telemetry code is public and auditable
4. **No Surprises**: Changes to telemetry practices will be documented in release notes

## Example Telemetry Events

### Export Success Event
```json
{
  "timestamp": "2025-10-12T10:30:00.000Z",
  "eventType": "export",
  "action": "export_success",
  "details": {
    "format": "svg",
    "strategy": "cli",
    "duration": 1234,
    "fileSize": 45678,
    "diagramType": "flowchart",
    "platform": "win32",
    "vscodeVersion": "1.103.0",
    "extensionVersion": "1.0.6"
  },
  "sessionId": "session-1697123456789-abc123"
}
```

### Error Event
```json
{
  "timestamp": "2025-10-12T10:31:00.000Z",
  "eventType": "error",
  "action": "export_failure",
  "details": {
    "errorType": "CLI_TIMEOUT",
    "errorMessage": "Export operation timed out after 30000ms",
    "platform": "win32",
    "vscodeVersion": "1.103.0",
    "extensionVersion": "1.0.6"
  },
  "sessionId": "session-1697123456789-abc123"
}
```

### Command Usage Event
```json
{
  "timestamp": "2025-10-12T10:32:00.000Z",
  "eventType": "command",
  "action": "command_executed",
  "details": {
    "command": "exportCurrent",
    "source": "palette",
    "platform": "win32"
  },
  "sessionId": "session-1697123456789-abc123"
}
```

## Contact & Questions

For questions about telemetry or privacy:
- **Email**: jsequeira03@gmail.com
- **GitHub Issues**: https://github.com/GSejas/mermaid-export-pro/issues
- **Privacy Concerns**: Include "PRIVACY" in the subject line

---

**Last Updated**: October 12, 2025
**Effective Version**: 1.0.7+

Thank you for helping improve Mermaid Export Pro! 🎉
