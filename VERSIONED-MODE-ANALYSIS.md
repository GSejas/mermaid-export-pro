# Versioned Mode Analysis

## Problem Statement
User reports: "it's actually overwriting i think, when config=versioned"

## Current Implementation

### 1. **Versioned Mode Flow**

```
User Export Request
  ↓
generateFileName(mode='versioned')
  ↓
generateSmartName()
  ├─ Calculate content hash (SHA256, 8 chars)
  ├─ findFileByHash() - check if hash exists
  │  ├─ Found: Return existing path (e.g., diagram-01-abc123.svg)
  │  └─ Not found: getNextSequenceNumber() → diagram-02-def456.svg
  ↓
shouldSkipExport(outputPath, content)
  ├─ File exists + has hash pattern → TRUE (skip)
  └─ File doesn't exist → FALSE (export)
  ↓
If Skip: Show message, DON'T write
If Export: Write file
```

### 2. **Key Functions**

#### `generateSmartName()` (autoNaming.ts:73-96)
- Hashes content
- Searches for existing file with same hash
- Returns existing file OR creates new numbered file

#### `shouldSkipExport()` (autoNaming.ts:169-202)
- Checks if file exists
- For versioned: assumes hash in filename = content match
- Returns TRUE → skip export

#### `getNextSequenceNumber()` (autoNaming.ts:147-167)
- Finds highest sequence number in directory
- Returns max + 1

## Potential Issues

### Issue #1: ⚠️ **Missing Mode Awareness in shouldSkipExport**

**Problem**: `shouldSkipExport()` doesn't know which mode is being used!

```typescript
// Current code - MISSING mode parameter
static async shouldSkipExport(filePath: string, content: string): Promise<boolean>
```

**Impact**: 
- Function assumes versioned pattern detection is sufficient
- Can't enforce different behaviors for versioned vs overwrite modes

### Issue #2: ⚠️ **Decoupling Problem**

The logic is split between multiple places:
1. **generateFileName** - routes to versioned/overwrite
2. **generateSmartName** - handles deduplication
3. **shouldSkipExport** - decides whether to actually export

This creates **tight coupling** where:
- `generateSmartName` returns a path
- `shouldSkipExport` must *infer* the mode from the path format
- No explicit mode tracking

### Issue #3: ⚠️ **Test Coverage Gap**

Current tests (autoNaming.test.ts):
- ✅ Tests generateFileName with both modes
- ✅ Tests overwrite mode consistency
- ❌ **Missing: Integration test showing versioned mode creating new files for different content**
- ❌ **Missing: Test showing versioned mode reusing files for same content**
- ❌ **Missing: Test for shouldSkipExport behavior**

## Reproduction Scenarios

### Expected Behavior (Versioned Mode)

```
Test 1: First Export
Content: "graph TD; A-->B"
Expected: diagram-01-abc12345.svg (CREATED) ✓

Test 2: Same Content
Content: "graph TD; A-->B"
Expected: "Using existing export: diagram-01-abc12345.svg" (SKIPPED) ✓

Test 3: Different Content
Content: "graph TD; A-->B-->C"
Expected: diagram-02-def67890.svg (CREATED) ✓

Test 4: Back to First Content
Content: "graph TD; A-->B"
Expected: "Using existing export: diagram-01-abc12345.svg" (SKIPPED) ✓
```

### Possible Bug Scenario

```
Config: mode = 'versioned'

Export 1: Content A → diagram-01-abc.svg CREATED
Export 2: Content A → Message "using existing" BUT file might be OVERWRITTEN?

Hypothesis: The file write happens AFTER shouldSkipExport check, but something
bypasses the skip logic, causing the file to be written anyway.
```

## Architectural Issues

### 1. **Two-Phase Process Creates Race Condition**

```typescript
// Phase 1: Generate filename
const outputPath = await AutoNaming.generateFileName({...});

// Phase 2: Decide whether to skip
const shouldSkip = await AutoNaming.shouldSkipExport(outputPath, content);

// Phase 3: Export (if not skipped)
if (!shouldSkip) {
  const buffer = await strategy.export(...);
  await fs.promises.writeFile(outputPath, buffer);
}
```

**Problem**: Between Phase 1 and Phase 3, the file could be:
- Deleted by user
- Modified externally
- Created by another export operation

### 2. **Versioned vs Overwrite Logic Duplication**

Both modes have similar but different logic:

**Versioned**:
- Check hash → reuse or increment sequence
- Skip if file exists with matching hash

**Overwrite**:
- Use simple name
- Always export (overwrite)

**Issue**: The skip logic can't distinguish between modes clearly.

## Proposed Solutions

### Option A: ✅ **Add Mode Parameter to shouldSkipExport**

```typescript
static async shouldSkipExport(
  filePath: string, 
  content: string,
  mode: AutoNamingMode  // ADD THIS
): Promise<boolean> {
  const fileExists = await fs.promises.access(filePath)
    .then(() => true)
    .catch(() => false);
    
  if (!fileExists) {
    return false; // File doesn't exist, must export
  }

  // Explicit mode handling
  switch (mode) {
    case 'versioned':
      // In versioned mode, if file exists with hash pattern, content matches
      const versionedPattern = /-\d{2}-[a-f0-9]{8}\./;
      return versionedPattern.test(path.basename(filePath));
      
    case 'overwrite':
      // In overwrite mode, always export to ensure fresh output
      return false;
      
    default:
      return false;
  }
}
```

**Benefits**:
- Explicit mode awareness
- No more pattern detection guessing
- Clear separation of concerns

### Option B: 🔄 **Combine Generation and Skip Logic**

```typescript
interface FileNameResult {
  path: string;
  shouldExport: boolean;
  reason: string;
}

static async generateFileName(options: AutoNameOptions): Promise<FileNameResult> {
  const mode = options.mode || 'versioned';
  
  switch (mode) {
    case 'versioned':
      return this.generateVersionedFile(options);
    case 'overwrite':
      return this.generateOverwriteFile(options);
  }
}
```

**Benefits**:
- Single source of truth
- No separate skip check needed
- Atomic decision making

### Option C: 🎯 **Strategy Pattern (Most Robust)**

```typescript
interface NamingStrategy {
  generatePath(options: AutoNameOptions): Promise<string>;
  shouldExport(filePath: string, content: string): Promise<boolean>;
}

class VersionedNamingStrategy implements NamingStrategy {
  async generatePath(options): Promise<string> { /* ... */ }
  async shouldExport(filePath, content): Promise<boolean> { /* ... */ }
}

class OverwriteNamingStrategy implements NamingStrategy {
  async generatePath(options): Promise<string> { /* ... */ }
  async shouldExport(filePath, content): Promise<boolean> { /* ... */ }
}
```

**Benefits**:
- Complete decoupling
- Each mode fully self-contained
- Easy to add new modes
- Clear contracts via interfaces

## Recommended Action

### Immediate Fix: Option A
**Why**: Minimal code change, fixes the mode ambiguity immediately.

**Changes needed**:
1. Add `mode` parameter to `shouldSkipExport`
2. Update all callers to pass mode
3. Add tests for both modes

### Long-term: Option C
**Why**: Better architecture for future extensibility.

**When**: After validating Option A works correctly.

## Test Cases Needed

```typescript
describe('shouldSkipExport', () => {
  describe('versioned mode', () => {
    it('returns false if file does not exist', async () => {
      const result = await AutoNaming.shouldSkipExport(
        '/output/diagram-01-abc123.svg',
        'graph TD; A-->B',
        'versioned'
      );
      expect(result).toBe(false);
    });

    it('returns true if file exists with matching hash', async () => {
      // Create file first
      await fs.promises.writeFile('/output/diagram-01-abc123.svg', 'data');
      
      const result = await AutoNaming.shouldSkipExport(
        '/output/diagram-01-abc123.svg',
        'graph TD; A-->B',
        'versioned'
      );
      expect(result).toBe(true);
    });
  });

  describe('overwrite mode', () => {
    it('returns false even if file exists', async () => {
      // Create file first
      await fs.promises.writeFile('/output/diagram1.svg', 'data');
      
      const result = await AutoNaming.shouldSkipExport(
        '/output/diagram1.svg',
        'graph TD; A-->B',
        'overwrite'
      );
      expect(result).toBe(false); // Always export in overwrite mode
    });
  });
});
```

## Questions for User

1. **Can you reproduce the overwriting behavior?** 
   - Steps: What exact sequence of exports shows the problem?
   - Config: Is `mermaidExportPro.autoNaming.mode` set to `"versioned"`?

2. **What do you see?**
   - Same filename being reused for different content?
   - New numbered files being created but old ones overwritten?
   - Export skipping when it shouldn't?

3. **Expected vs Actual**
   - What do you expect versioned mode to do?
   - What is it actually doing?

## Conclusion

The current implementation **should work correctly** based on code analysis, but:
1. Lacks explicit mode parameter in `shouldSkipExport`
2. Missing comprehensive integration tests
3. Could benefit from clearer architectural separation

**Next Steps**:
1. User confirms the specific bug behavior
2. Add mode parameter to `shouldSkipExport` (Option A)
3. Add comprehensive tests
4. Consider Strategy Pattern refactor (Option C) for v2.0
