# GitHub Issue: Overwrite Mode for Auto-Export

**Copy this content when creating the GitHub issue**

---

## Title
`[FEATURE] Add overwrite mode for auto-export to maintain consistent filenames`

---

## Labels
- `enhancement`
- `good first issue` (once spec is complete)
- `user-requested`

---

## Issue Body

### Problem Statement

Users working with presentations (Marp, Reveal.js) or static site generators (Hugo, Jekyll) need **consistent filenames** that can be referenced in their content.

Currently, the auto-export feature creates **versioned files** with sequence numbers and content hashes:
```
diagram-01-a4b2c8ef.svg
diagram-02-b5c6d7e8.svg
diagram-03-c7d8e9f0.svg
```

This breaks references in presentations and documentation that expect a **fixed filename**:
```markdown
![Architecture](assets/diagram1.svg)
```

**Original Request**: https://github.com/GSejas/mermaid-export-pro/issues/XX (link to user's issue)

### Proposed Solution

Add a new configuration setting: **`mermaidExportPro.autoNaming.mode`**

**Three modes:**

1. **`versioned`** (current default)
   ```
   diagram-01-a4b2c8ef.svg
   diagram-02-b5c6d7e8.svg
   ```
   - Keeps export history with sequence + hash
   - Perfect for exploring design iterations

2. **`overwrite`** (NEW ✨)
   ```
   diagram1.svg
   ```
   - Simple, consistent filename
   - Overwrites on each export
   - Solves the presentation/static site use case

3. **`smart`** (future enhancement)
   ```
   diagram1.svg           (if content unchanged)
   diagram1-v2.svg        (if content changed)
   ```
   - Overwrites when content is identical
   - Versions only when diagram changes
   - Best of both worlds

### Use Cases

✅ **Marp Presentations**
```markdown
// presentation.md
![](assets/architecture.svg)  ← Fixed reference

// assets/architecture.mmd
graph TD; A-->B              ← Export overwrites architecture.svg
```

✅ **Hugo/Jekyll Blogs**
```markdown
// content/post.md
{{< figure src="/images/flowchart.svg" >}}  ← Static path

// diagrams/flowchart.mmd
flowchart LR; ...                            ← Export to /images/flowchart.svg
```

✅ **Git-Tracked Diagrams**
```bash
# Single file to track changes
git diff assets/diagram.svg
```

✅ **CI/CD Pipelines**
```yaml
# Predictable paths for automation
- export-diagrams
- publish assets/diagram.svg
```

### Implementation Details

Full specification: [OVERWRITE-MODE-FEATURE.md](../docs/features/OVERWRITE-MODE-FEATURE.md)

**Summary:**
- Add enum configuration `"versioned" | "overwrite" | "smart"`
- Update `AutoNaming.generateFileName()` to support modes
- Add `generateOverwriteName()` method
- Update export commands to pass mode
- Comprehensive unit + integration tests

**Estimated Effort**: 4 hours

**Code Changes**:
- `package.json` - Add configuration
- `src/utils/autoNaming.ts` - Add overwrite logic
- `src/commands/exportCommand.ts` - Pass mode
- `src/test/unit/utils/autoNaming.test.ts` - Tests

### Acceptance Criteria

- [ ] Configuration setting `mermaidExportPro.autoNaming.mode` added
- [ ] `overwrite` mode generates simple filenames (e.g., `diagram1.svg`)
- [ ] Existing files are overwritten (not versioned)
- [ ] Default behavior unchanged (`versioned` mode)
- [ ] Unit tests cover overwrite mode logic
- [ ] Integration tests verify mode switching
- [ ] Documentation updated (README, USER-GUIDE)
- [ ] Example with Marp presentation in `/demo`
- [ ] CHANGELOG entry added

### Alternative Solutions Considered

❌ **Separate hash toggle**: `includeHash: false`
- Less flexible, doesn't handle smart mode

❌ **Pattern template**: `"${baseName}.${format}"`
- Too complex for users, easy to misconfigure

✅ **Mode-based approach**: Simple, clear, extensible

### Additional Context

**User Workflow Example**:
```bash
# 1. Enable overwrite mode
"mermaidExportPro.autoNaming.mode": "overwrite"

# 2. Create diagram
assets/architecture.mmd

# 3. Export
→ generates assets/architecture.svg

# 4. Reference in presentation
![](assets/architecture.svg)

# 5. Update diagram and export again
→ overwrites assets/architecture.svg
→ presentation automatically shows new version
```

**Benefits**:
- ✅ No manual filename management
- ✅ No broken references in presentations
- ✅ Clean git history (one file to track)
- ✅ Simple mental model for users

### Priority & Effort

**Priority**: **High** (user-requested, clear use case)
**Effort**: **Medium** (~4 hours)
**Target Release**: v1.0.8

### Implementation Roadmap

**v1.0.8** - Implement `overwrite` mode
- Add configuration
- Update auto-naming logic
- Tests and documentation

**v1.1.0** - Add `smart` mode
- Content hash comparison
- Intelligent versioning
- Advanced tests

---

### For Contributors

Want to implement this feature?

1. Read the full spec: [OVERWRITE-MODE-FEATURE.md](../docs/features/OVERWRITE-MODE-FEATURE.md)
2. Comment on this issue to claim it
3. Create branch: `feature/overwrite-mode`
4. Follow the implementation checklist in the spec
5. Submit PR with tests and documentation

**Skills needed**: TypeScript, Node.js file I/O, VS Code extensions

---

**Ready for implementation** ✅
