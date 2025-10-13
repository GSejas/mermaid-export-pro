# Feature Request: Overwrite Mode for Auto-Export

**Status**: PROPOSED
**Priority**: HIGH (User-requested)
**Complexity**: MEDIUM
**Estimated Effort**: 3-4 hours

---

## 📋 Problem Statement

### User Request (GitHub Issue)

> "I would like an option to rewrite existing file name as feature request. My context is, I have a markdown presentation using Marp which I want to use a svg file generated from the mermaid-export-pro from the file `assets/diagram1.mmd`. But every time I do an export, it creates a new file instead of rewriting `diagram1.svg`."

### Current Behavior

**Auto-naming strategy** creates versioned files:
```
diagram-01-a4b2c8ef.svg  ← First export
diagram-02-b5c6d7e8.svg  ← Second export (content changed)
diagram-03-c7d8e9f0.svg  ← Third export
```

**Problem**: For presentations or documentation that reference specific filenames, users need:
```
diagram1.svg  ← Always same name, overwritten on each export
```

### Use Cases

1. **Marp Presentations**: Reference `![](assets/diagram1.svg)` in markdown
2. **Hugo/Jekyll Sites**: Static paths like `/images/architecture.svg`
3. **Documentation**: Consistent URLs across versions
4. **Version Control**: Single file to track changes via git diff
5. **CI/CD Pipelines**: Predictable file paths for automation

---

## 🎯 Proposed Solution

### Configuration Option

Add new setting: `mermaidExportPro.autoNaming.mode`

```json
{
  "mermaidExportPro.autoNaming.mode": "versioned" | "overwrite" | "smart"
}
```

### Mode Behaviors

#### 1. `versioned` (Current Default)
**Behavior**: Create new file with sequence and hash
```
diagram-01-a4b2c8ef.svg
diagram-02-b5c6d7e8.svg
diagram-03-c7d8e9f0.svg
```

**When to use**:
- Exploring design iterations
- Want history of exports
- Need to compare versions side-by-side
- Using auto-export on save extensively

#### 2. `overwrite` (New Feature)
**Behavior**: Always use same filename, overwrite if exists
```
diagram1.svg          ← Overwritten on each export
architecture.svg      ← Overwritten on each export
```

**When to use**:
- Presentation decks (Marp, Reveal.js)
- Static site generators (Hugo, Jekyll)
- Documentation with fixed URLs
- Git-tracked diagrams (one file to diff)

#### 3. `smart` (Future Enhancement)
**Behavior**: Check if content changed, overwrite if same hash
```
First export:  diagram1.svg
No changes:    diagram1.svg         ← Overwrite (same content)
With changes:  diagram1-v2.svg      ← New version (content changed)
```

**When to use**:
- Best of both worlds
- Avoid duplicate exports
- Track meaningful changes only

---

## 🔧 Implementation Details

### 1. Add Configuration

**File**: `package.json`

```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "mermaidExportPro.autoNaming.mode": {
          "type": "string",
          "enum": ["versioned", "overwrite", "smart"],
          "default": "versioned",
          "description": "File naming strategy for auto-export",
          "enumDescriptions": [
            "Create new file with sequence and hash (diagram-01-a4b2c8ef.svg)",
            "Overwrite existing file with simple name (diagram1.svg)",
            "Smart mode: overwrite if content unchanged, version if changed"
          ],
          "order": 25
        }
      }
    }
  }
}
```

### 2. Update AutoNaming Utility

**File**: `src/utils/autoNaming.ts`

Add new method:

```typescript
export interface AutoNameOptions {
  baseName: string;
  format: ExportFormat;
  content: string;
  outputDirectory: string;
  mode?: 'versioned' | 'overwrite' | 'smart';  // ← NEW
}

export class AutoNaming {
  /**
   * Generate filename based on naming mode
   */
  static async generateFileName(options: AutoNameOptions): Promise<string> {
    const mode = options.mode || 'versioned';

    switch (mode) {
      case 'overwrite':
        return this.generateOverwriteName(options);

      case 'smart':
        return this.generateSmartOverwriteName(options);

      case 'versioned':
      default:
        return this.generateSmartName(options);
    }
  }

  /**
   * Generate simple overwrite filename
   * Format: ${baseName}.${format}
   * Example: diagram1.svg
   */
  private static async generateOverwriteName(options: AutoNameOptions): Promise<string> {
    const { baseName, format, outputDirectory } = options;
    const fileName = `${baseName}.${format}`;
    return path.join(outputDirectory, fileName);
  }

  /**
   * Generate smart overwrite filename (checks content hash)
   * Format: ${baseName}.${format} if unchanged, ${baseName}-v${N}.${format} if changed
   */
  private static async generateSmartOverwriteName(options: AutoNameOptions): Promise<string> {
    const { baseName, format, content, outputDirectory } = options;

    // Generate hash of current content
    const currentHash = crypto.createHash('sha256')
      .update(content.trim())
      .digest('hex')
      .substring(0, 8);

    // Check if base file exists
    const baseFileName = `${baseName}.${format}`;
    const basePath = path.join(outputDirectory, baseFileName);

    try {
      // If file exists, check if content hash matches
      const existingContent = await fs.promises.readFile(basePath, 'utf8');
      const existingHash = crypto.createHash('sha256')
        .update(existingContent.trim())
        .digest('hex')
        .substring(0, 8);

      if (currentHash === existingHash) {
        // Same content, overwrite
        return basePath;
      } else {
        // Content changed, create versioned file
        const version = await this.getNextVersionNumber(baseName, outputDirectory, format);
        const versionedName = `${baseName}-v${version}.${format}`;
        return path.join(outputDirectory, versionedName);
      }
    } catch (error) {
      // File doesn't exist, create base file
      return basePath;
    }
  }

  /**
   * Get next version number for smart mode
   */
  private static async getNextVersionNumber(baseName: string, directory: string, format: ExportFormat): Promise<number> {
    try {
      const files = await fs.promises.readdir(directory);
      const pattern = new RegExp(`^${this.escapeRegex(baseName)}-v(\\d+)\\.${format}$`);

      let maxVersion = 0;
      files.forEach(file => {
        const match = file.match(pattern);
        if (match) {
          const version = parseInt(match[1], 10);
          maxVersion = Math.max(maxVersion, version);
        }
      });

      return maxVersion + 1;
    } catch (error) {
      return 1;
    }
  }
}
```

### 3. Update Export Command

**File**: `src/commands/exportCommand.ts`

Update to pass mode to auto-naming:

```typescript
// Get naming mode from configuration
const config = vscode.workspace.getConfiguration('mermaidExportPro');
const namingMode = config.get<'versioned' | 'overwrite' | 'smart'>('autoNaming.mode', 'versioned');

// Generate output path with mode
const outputPath = await AutoNaming.generateFileName({
  baseName,
  format: selectedFormat,
  content: mermaidContent,
  outputDirectory: fileDirectory,
  mode: namingMode  // ← PASS MODE
});
```

### 4. Update Configuration Manager

**File**: `src/services/configManager.ts`

Add getter for naming mode:

```typescript
export class ConfigManager {
  getNamingMode(): 'versioned' | 'overwrite' | 'smart' {
    return this.config.get<'versioned' | 'overwrite' | 'smart'>('autoNaming.mode', 'versioned');
  }
}
```

---

## 📊 User Experience

### Settings UI

Users can configure in VS Code settings:

```
Settings → Extensions → Mermaid Export Pro → Auto Naming: Mode
```

**Options**:
- ☑ **Versioned** (default) - Keep history with sequence and hash
- ☐ **Overwrite** - Simple name, always replace
- ☐ **Smart** - Overwrite if unchanged, version if changed

### Command Palette

Add new command for quick toggle:

```
Mermaid Export Pro: Switch Auto-Naming Mode
```

Shows quick pick:
```
> Versioned (current)    - Keep export history
  Overwrite              - Replace existing files
  Smart                  - Version only when changed
```

---

## 🧪 Testing Strategy

### Unit Tests

**File**: `src/test/unit/utils/autoNaming.test.ts`

Add new test suites:

```typescript
describe('AutoNaming - Overwrite Mode', () => {
  it('should generate simple filename for overwrite mode', async () => {
    const result = await AutoNaming.generateFileName({
      baseName: 'diagram1',
      format: 'svg',
      content: 'graph TD; A-->B',
      outputDirectory: '/test',
      mode: 'overwrite'
    });

    expect(result).toBe('/test/diagram1.svg');
  });

  it('should overwrite existing file with same name', async () => {
    // Create file
    await fs.promises.writeFile('/test/diagram1.svg', 'old content');

    // Export again with overwrite mode
    const result = await AutoNaming.generateFileName({
      baseName: 'diagram1',
      format: 'svg',
      content: 'new content',
      outputDirectory: '/test',
      mode: 'overwrite'
    });

    expect(result).toBe('/test/diagram1.svg');

    // Verify file gets overwritten (tested in integration)
  });
});

describe('AutoNaming - Smart Mode', () => {
  it('should overwrite if content unchanged', async () => {
    const content = 'graph TD; A-->B';

    // First export
    await AutoNaming.generateFileName({
      baseName: 'diagram1',
      format: 'svg',
      content,
      outputDirectory: '/test',
      mode: 'smart'
    });

    // Second export with same content
    const result = await AutoNaming.generateFileName({
      baseName: 'diagram1',
      format: 'svg',
      content, // Same content
      outputDirectory: '/test',
      mode: 'smart'
    });

    expect(result).toBe('/test/diagram1.svg'); // Same file
  });

  it('should create version if content changed', async () => {
    // First export
    await AutoNaming.generateFileName({
      baseName: 'diagram1',
      format: 'svg',
      content: 'graph TD; A-->B',
      outputDirectory: '/test',
      mode: 'smart'
    });

    // Second export with different content
    const result = await AutoNaming.generateFileName({
      baseName: 'diagram1',
      format: 'svg',
      content: 'graph TD; A-->C', // Changed
      outputDirectory: '/test',
      mode: 'smart'
    });

    expect(result).toBe('/test/diagram1-v1.svg'); // Versioned
  });
});
```

### Integration Tests

Test real export scenarios:

1. Overwrite mode preserves filename across exports
2. Smart mode detects content changes correctly
3. Configuration changes apply immediately
4. Works with Marp presentations

---

## 📝 Documentation Updates

### README.md

Add section under "Extension Settings":

```markdown
### Auto-Naming Modes

Control how exported files are named:

- **Versioned** (default): `diagram-01-a4b2c8ef.svg`, `diagram-02-b5c6d7e8.svg`
  - Keeps export history with sequence numbers and content hashes
  - Perfect for exploring design iterations

- **Overwrite**: `diagram1.svg` (same name always)
  - Simple, predictable filenames
  - Ideal for presentations (Marp, Reveal.js) and static sites
  - Files are replaced on each export

- **Smart**: `diagram1.svg` → `diagram1-v2.svg` (only if changed)
  - Overwrites if content is identical
  - Creates new version only when diagram changes
  - Best of both worlds

Configure via: `mermaidExportPro.autoNaming.mode`
```

### USER-GUIDE.md

Add workflow example:

```markdown
## Using Overwrite Mode for Presentations

Perfect for Marp presentations where you reference specific filenames:

1. **Enable overwrite mode**:
   ```json
   "mermaidExportPro.autoNaming.mode": "overwrite"
   ```

2. **Create your diagram**:
   ```markdown
   // assets/architecture.mmd
   graph TD
     A[Frontend] --> B[API]
     B --> C[Database]
   ```

3. **Reference in presentation**:
   ```markdown
   // presentation.md
   # Architecture
   ![](assets/architecture.svg)
   ```

4. **Export and refresh**:
   - Export diagram → generates `assets/architecture.svg`
   - Update diagram content
   - Export again → overwrites `assets/architecture.svg`
   - Presentation always shows latest version

No need to update references!
```

---

## 🚀 Release Plan

### v1.0.8 (Quick Win)

**Focus**: Implement overwrite mode only

- Add `overwrite` option
- Update AutoNaming utility
- Add configuration setting
- Write unit tests
- Update documentation

**Estimated Effort**: 3-4 hours

### v1.1.0 (Enhanced)

**Focus**: Add smart mode

- Implement content hash comparison
- Add version numbering for smart mode
- More comprehensive tests
- Usage analytics for mode preferences

**Estimated Effort**: 2-3 hours (incremental)

---

## 💡 Alternative Approaches

### Option 1: Separate Setting for Hash
```json
"mermaidExportPro.autoNaming.includeHash": false
```
**Pros**: Simpler
**Cons**: Less flexible than mode-based approach

### Option 2: File Pattern Template
```json
"mermaidExportPro.autoNaming.pattern": "${baseName}.${format}"
```
**Pros**: Ultimate flexibility
**Cons**: Complex for users, easy to misconfigure

### Option 3: Per-File Configuration
**Pros**: Fine-grained control
**Cons**: Too complex, hard to maintain

**Recommended**: Mode-based approach (versioned/overwrite/smart) ✅

---

## 📋 Checklist for Implementation

### Phase 1: Configuration (30 min)
- [ ] Add `autoNaming.mode` to package.json
- [ ] Update ConfigManager with getter
- [ ] Test configuration loading

### Phase 2: Auto-Naming Utility (1.5 hours)
- [ ] Add `generateOverwriteName()` method
- [ ] Update `generateFileName()` dispatcher
- [ ] Add mode parameter to interfaces
- [ ] Update existing tests

### Phase 3: Integration (1 hour)
- [ ] Update `exportCommand.ts` to use mode
- [ ] Update `batchExportCommand.ts` to use mode
- [ ] Update `exportFileUri()` helper
- [ ] Test with real exports

### Phase 4: Testing (1 hour)
- [ ] Unit tests for overwrite mode
- [ ] Integration tests for mode switching
- [ ] Manual testing with Marp presentation
- [ ] Edge case testing (permissions, etc.)

### Phase 5: Documentation (30 min)
- [ ] Update README.md
- [ ] Update USER-GUIDE.md
- [ ] Add CHANGELOG entry
- [ ] Create examples folder with Marp demo

**Total Estimated Time**: 4.5 hours

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ Users can set `mermaidExportPro.autoNaming.mode = "overwrite"`
- ✅ Overwrite mode generates simple filenames (e.g., `diagram1.svg`)
- ✅ Existing files are overwritten (not versioned)
- ✅ Marp presentations work with fixed filenames
- ✅ Configuration persists across sessions

### Non-Functional Requirements
- ✅ No breaking changes to existing behavior (versioned is default)
- ✅ Performance: Overwrite mode is faster (no sequence scanning)
- ✅ Clear documentation and examples
- ✅ Comprehensive test coverage

### User Satisfaction
- ✅ Solves reported GitHub issue
- ✅ Works with Marp, Hugo, Jekyll use cases
- ✅ Easy to configure (single setting)
- ✅ Predictable behavior

---

## 📌 GitHub Issue Template

```markdown
## Feature: Overwrite Mode for Auto-Export

**Requested by**: @username (GitHub Issue #XX)

### Problem
Users want to maintain consistent filenames for presentations and static sites, but current auto-naming creates versioned files (e.g., `diagram-01-a4b2c8ef.svg`) instead of overwriting a single file.

### Solution
Add `mermaidExportPro.autoNaming.mode` configuration:
- `versioned` (default) - Current behavior
- `overwrite` - Simple filename, always replace
- `smart` (future) - Version only when content changes

### Use Cases
- Marp presentations: `![](assets/diagram1.svg)`
- Static site generators: `/images/architecture.svg`
- Git-tracked diagrams: Single file to diff

### Implementation Details
See: [OVERWRITE-MODE-FEATURE.md](docs/features/OVERWRITE-MODE-FEATURE.md)

### Checklist
- [ ] Add configuration option
- [ ] Update AutoNaming utility
- [ ] Integration with export commands
- [ ] Unit + integration tests
- [ ] Documentation updates
- [ ] Examples with Marp

**Estimated Effort**: 4 hours
**Target Release**: v1.0.8
```

---

**Status**: Ready for implementation
**Next Step**: Create GitHub issue and start Phase 1 (Configuration)

---

*Feature designed with care for user workflows and backward compatibility.*
