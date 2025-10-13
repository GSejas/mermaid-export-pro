# Telemetry Service - Test Coverage Documentation

**Created**: October 12, 2025  
**Last Updated**: October 12, 2025  
**Status**: Active  
**Category**: Testing

## Overview

This document describes the comprehensive test coverage for the TelemetryService implementation, including unit tests, integration tests, and privacy/security validation.

---

## Test Architecture

```
src/test/
├── unit/
│   └── telemetryService.test.ts      # Unit tests for TelemetryService
└── integration/
    └── telemetryCommands.test.ts     # Integration tests for telemetry commands
```

---

## Unit Tests (`src/test/unit/telemetryService.test.ts`)

### Test Framework
- **Framework**: Vitest 3.2.4
- **Mocking**: VS Code API mocked using `vi.mock('vscode')`
- **File System**: Mocked `fs` operations for isolated testing

### Coverage Areas

#### 1. Singleton Pattern
- ✅ Returns same instance across multiple calls
- ✅ Initializes correctly with context
- ✅ Handles multiple contexts appropriately

**Rationale**: TelemetryService must be a singleton to ensure consistent state across the extension lifecycle.

#### 2. Telemetry Enable/Disable
- ✅ Tracks events when enabled
- ✅ Does not track events when disabled
- ✅ Respects configuration changes
- ✅ Shows notification when enabling telemetry

**Rationale**: Privacy-first design requires opt-in functionality to work correctly.

#### 3. Export Tracking (`trackExport()`)
- ✅ Tracks successful exports with all parameters
- ✅ Tracks failed exports correctly
- ✅ Aggregates multiple exports by format
- ✅ Aggregates exports by strategy (CLI/Web)
- ✅ Includes system information in events
- ✅ Handles optional parameters gracefully

**Test Cases**:
- Single export success
- Single export failure
- Multiple exports aggregation
- Format tracking (PNG, SVG, PDF)
- Strategy tracking (CLI, Web)
- System metadata inclusion

**Rationale**: Export tracking is the primary telemetry use case and must work reliably for all export scenarios.

#### 4. Error Tracking (`trackError()`)
- ✅ Tracks errors with type, message, and action
- ✅ Does not track when disabled
- ✅ Aggregates errors by type
- ✅ Includes sanitized error messages

**Test Cases**:
- Single error tracking
- Multiple errors by type
- Error message sanitization
- System metadata inclusion

**Rationale**: Error tracking helps identify reliability issues without exposing sensitive user data.

#### 5. Command Tracking (`trackCommand()`)
- ✅ Tracks command execution by name
- ✅ Tracks command source (palette, context menu, codelens, status bar)
- ✅ Aggregates command usage statistics
- ✅ Does not track when disabled

**Test Cases**:
- Command from different sources
- Multiple command executions
- Command usage aggregation

**Rationale**: Understanding how users interact with the extension helps prioritize feature development.

#### 6. Health Check Tracking (`trackHealthCheck()`)
- ✅ Tracks CLI availability status
- ✅ Records Node.js version
- ✅ Calculates success rates over time
- ✅ Includes system information

**Test Cases**:
- CLI available scenarios
- CLI unavailable scenarios
- Success rate calculations

**Rationale**: Health monitoring helps identify environment-specific issues.

#### 7. Performance Tracking (`trackPerformance()`)
- ✅ Records operation duration
- ✅ Tracks additional performance metrics
- ✅ Calculates average performance statistics
- ✅ Does not track when disabled

**Test Cases**:
- Single performance event
- Multiple events with duration averaging
- Additional metadata tracking

**Rationale**: Performance data helps optimize export operations.

#### 8. Data Persistence
- ✅ Saves events to disk after debounce (5 seconds)
- ✅ Loads existing events on initialization
- ✅ Handles corrupted files gracefully
- ✅ Enforces event limit (10,000 events max)
- ✅ Creates storage directory if missing

**Test Cases**:
- Successful save after debounce
- Loading from existing file
- Corrupted file handling
- Event limit enforcement
- Directory creation

**Rationale**: Persistent storage ensures telemetry data survives extension restarts.

#### 9. Data Export (`exportData()`)
- ✅ Exports data as JSON to user-specified location
- ✅ Includes summary statistics
- ✅ Includes raw events (when enabled)
- ✅ Includes system metadata
- ✅ Creates unique filename per export

**Test Cases**:
- Export to file
- Multiple exports create separate files
- Export structure validation
- Empty data export

**Rationale**: Users must be able to review their data before sharing.

#### 10. Data Clearing (`clearData()`)
- ✅ Clears all in-memory events
- ✅ Deletes telemetry file from disk
- ✅ Shows confirmation message
- ✅ Allows new tracking after clearing

**Test Cases**:
- Clear with existing data
- Clear empty data
- Tracking resumes after clear

**Rationale**: Users must have full control to delete their data.

#### 11. Summary Generation (`generateSummary()`)
- ✅ Generates empty summary for new service
- ✅ Calculates correct statistics from events
- ✅ Aggregates by format, strategy, diagram type
- ✅ Calculates success rates
- ✅ Calculates average durations
- ✅ Includes session information

**Test Cases**:
- Empty summary
- Summary with mixed events
- Statistical accuracy verification

**Rationale**: Summary provides high-level insights without exposing raw events.

#### 12. Display Summary (`showSummary()`)
- ✅ Formats summary as markdown
- ✅ Opens in new VS Code document
- ✅ Includes all statistics sections
- ✅ Shows telemetry status (enabled/disabled)

**Test Cases**:
- Markdown format validation
- Content completeness
- Empty data display

**Rationale**: Users need readable view of their telemetry data.

#### 13. Edge Cases & Error Handling
- ✅ Handles concurrent tracking calls
- ✅ Handles missing optional parameters
- ✅ Handles file system errors gracefully
- ✅ Handles configuration changes dynamically
- ✅ Handles dispose during pending saves

**Test Cases**:
- 50+ concurrent tracking calls
- Missing optional parameters
- File system write failures
- Configuration change listeners
- Dispose with unsaved data

**Rationale**: Production environment requires robust error handling.

---

## Integration Tests (`src/test/integration/telemetryCommands.test.ts`)

### Test Framework
- **Framework**: Mocha (VS Code's test runner)
- **Assertions**: Chai
- **Environment**: Real VS Code extension host

### Coverage Areas

#### 1. Show Telemetry Command (`mermaidExportPro.showTelemetry`)
- ✅ Opens new document with telemetry summary
- ✅ Displays markdown content
- ✅ Shows statistics for tracked events
- ✅ Shows empty summary for new installation
- ✅ Works when telemetry is disabled

**Test Workflow**:
1. Track sample events (export, command, error)
2. Execute `mermaidExportPro.showTelemetry`
3. Verify document opens with correct content
4. Verify markdown formatting
5. Verify statistics accuracy

**Rationale**: Users need easy access to review their telemetry data.

#### 2. Export Telemetry Command (`mermaidExportPro.exportTelemetry`)
- ✅ Exports telemetry data to JSON file
- ✅ Creates export directory if missing
- ✅ Generates unique filename per export
- ✅ Includes summary and raw events
- ✅ Sanitizes sensitive data
- ✅ Works when telemetry is disabled

**Test Workflow**:
1. Track sample events
2. Execute `mermaidExportPro.exportTelemetry`
3. Verify file created in `~/mermaid-export-pro-telemetry/`
4. Verify JSON structure
5. Verify data accuracy
6. Verify privacy sanitization

**Rationale**: Users must be able to export data for sharing/analysis.

#### 3. Clear Telemetry Command (`mermaidExportPro.clearTelemetry`)
- ✅ Clears all telemetry data
- ✅ Shows confirmation message
- ✅ Allows new tracking after clearing
- ✅ Does not affect future tracking

**Test Workflow**:
1. Track sample events
2. Verify data exists
3. Execute `mermaidExportPro.clearTelemetry`
4. Verify data is cleared
5. Track new events
6. Verify new tracking works

**Rationale**: Users must have full control to delete their data at any time.

#### 4. Complete Telemetry Workflow
- ✅ Track → View → Export → Clear workflow
- ✅ All operations work end-to-end
- ✅ Data consistency throughout workflow

**Test Workflow**:
1. Track multiple event types
2. View summary (verify display)
3. Export data (verify file)
4. Clear data (verify deletion)
5. Verify workflow completion

**Rationale**: Real-world usage involves multiple operations in sequence.

#### 5. Settings Integration
- ✅ Tracking stops when telemetry is disabled
- ✅ Tracking resumes when re-enabled
- ✅ Configuration changes are detected
- ✅ Existing data is preserved when disabling

**Test Workflow**:
1. Enable telemetry → Track events
2. Disable telemetry → Verify no new tracking
3. Re-enable telemetry → Verify tracking resumes
4. Verify existing data persists

**Rationale**: Users must be able to control telemetry dynamically.

#### 6. Privacy & Security
- ✅ File paths are sanitized in exported data
- ✅ Email addresses are sanitized
- ✅ Usernames are removed from paths
- ✅ No personal identifiable information (PII) in exports

**Test Workflow**:
1. Track events with sensitive data (paths, emails)
2. Export telemetry data
3. Verify sensitive data is redacted
4. Verify `[PATH]` and `[EMAIL]` placeholders used

**Rationale**: Privacy-first design requires automatic PII removal.

---

## Test Coverage Summary

### Unit Tests
- **Total Test Suites**: 13
- **Total Test Cases**: 50+
- **Coverage Focus**: Service methods, data handling, persistence, error handling

### Integration Tests
- **Total Test Suites**: 6
- **Total Test Cases**: 20+
- **Coverage Focus**: Commands, workflows, settings, privacy

### Code Coverage Targets
- **Target Coverage**: >80% line coverage
- **Critical Paths**: 100% coverage (privacy sanitization, data persistence)
- **Edge Cases**: Comprehensive error scenario coverage

---

## Running the Tests

### Unit Tests (Vitest)
```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit -- --coverage

# Run in watch mode
npm run test:unit -- --watch

# Run specific test file
npm run test:unit src/test/unit/telemetryService.test.ts
```

### Integration Tests (VS Code Test Runner)
```bash
# Run all tests (including integration)
npm run test

# Run only integration tests
npm run test:integration

# Run with VS Code UI
code --extensionDevelopmentPath=. --extensionTestsPath=./dist/test/integration
```

---

## Test Data Fixtures

### Sample Telemetry Events
```typescript
// Export Success
{
  timestamp: '2025-10-12T10:30:00.000Z',
  eventType: 'export',
  action: 'export_success',
  details: {
    format: 'png',
    strategy: 'cli',
    duration: 1500,
    fileSize: 2048,
    diagramType: 'flowchart'
  },
  sessionId: 'session-12345-abc'
}

// Export Failure
{
  timestamp: '2025-10-12T10:31:00.000Z',
  eventType: 'error',
  action: 'export_failure',
  details: {
    format: 'svg',
    strategy: 'web',
    duration: 2000,
    errorType: 'timeout'
  },
  sessionId: 'session-12345-abc'
}

// Command Execution
{
  timestamp: '2025-10-12T10:32:00.000Z',
  eventType: 'command',
  action: 'command_executed',
  details: {
    command: 'export',
    source: 'palette'
  },
  sessionId: 'session-12345-abc'
}
```

---

## Privacy Testing Scenarios

### 1. File Path Sanitization
**Input**: `C:\Users\JohnDoe\Documents\diagram.mmd`  
**Expected Output**: `[PATH]`

**Input**: `/home/janedoe/projects/diagram.mmd`  
**Expected Output**: `[PATH]`

### 2. Email Sanitization
**Input**: `Failed to send to john.doe@example.com`  
**Expected Output**: `Failed to send to [EMAIL]`

### 3. Multi-Pattern Sanitization
**Input**: `Error at C:\Users\Admin\file.mmd for user@email.com`  
**Expected Output**: `Error at [PATH] for [EMAIL]`

---

## Performance Testing

### Debounced Save Performance
- **Test**: Track 100 events rapidly
- **Expected**: Single save after 5-second debounce
- **Verification**: `fs.writeFileSync` called once

### Event Limit Enforcement
- **Test**: Track 10,001 events
- **Expected**: Only 10,000 events stored (oldest removed)
- **Verification**: Array length === 10,000

### Concurrent Tracking
- **Test**: 50 concurrent `trackExport()` calls
- **Expected**: All events tracked without data loss
- **Verification**: 50 events in storage

---

## Continuous Integration

### Test Execution in CI
```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:unit -- --coverage

- name: Run Integration Tests
  run: xvfb-run -a npm run test
```

### Coverage Requirements
- **Minimum Coverage**: 80% overall
- **Critical Methods**: 100% coverage
  - `sanitizeErrorMessage()`
  - `trackExport()`
  - `exportData()`
  - `clearData()`

---

## Test Maintenance

### Adding New Tests
1. **Unit Tests**: Add to `src/test/unit/telemetryService.test.ts`
2. **Integration Tests**: Add to `src/test/integration/telemetryCommands.test.ts`
3. **Update Coverage Tracker**: Add to `docs/developers/testing/test-coverage-tracker.csv`
4. **Update This Document**: Document new test scenarios

### When to Add Tests
- New telemetry event types
- New command implementations
- Privacy sanitization rules
- Bug fixes (regression tests)
- Performance optimizations

---

## Known Limitations

### Mocking Challenges
- **VS Code API**: Heavily mocked, may not catch all edge cases
- **File System**: Mocked in unit tests, real in integration tests
- **Timers**: Debounced saves require `setTimeout` in tests

### Integration Test Dependencies
- **Extension Activation**: Requires full VS Code environment
- **Settings Persistence**: May affect other tests
- **File System Cleanup**: Manual cleanup required in teardown

---

## Future Test Improvements

### Planned Enhancements
- [ ] Add E2E tests with real export operations
- [ ] Add performance benchmarks
- [ ] Add fuzzing tests for sanitization
- [ ] Add load testing (10,000+ events)
- [ ] Add network failure simulation
- [ ] Add multi-workspace scenarios

### Test Infrastructure
- [ ] Automated coverage reporting in CI
- [ ] Visual regression testing for summary display
- [ ] Automated test data generation
- [ ] Performance regression tracking

---

## Related Documentation

- **Testing Strategy**: [TESTING-STRATEGY-2025.md](./TESTING-STRATEGY-2025.md)
- **Test Scenarios**: [TEST-SCENARIOS.md](./TEST-SCENARIOS.md)
- **Privacy Documentation**: [../../PRIVACY-TELEMETRY.md](../../PRIVACY-TELEMETRY.md)
- **Telemetry Implementation**: [../../TELEMETRY-IMPLEMENTATION-SUMMARY.md](../../TELEMETRY-IMPLEMENTATION-SUMMARY.md)

---

## Conclusion

The telemetry service has comprehensive test coverage across both unit and integration levels, ensuring:
- ✅ **Privacy**: All sensitive data is sanitized
- ✅ **Reliability**: Error handling for all failure modes
- ✅ **Usability**: Commands work in real-world scenarios
- ✅ **Performance**: Efficient data handling and persistence
- ✅ **Security**: No PII leakage in exported data

**Test Coverage Status**: ✅ **Comprehensive** (50+ unit tests, 20+ integration tests)

---

**Last Reviewed**: October 12, 2025  
**Reviewer**: AI Development Agent  
**Status**: Ready for Production
