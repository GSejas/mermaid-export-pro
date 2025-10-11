# Testing Scenarios for GIF Creation

This file documents the key testing scenarios that should be captured in GIF demos for documentation and marketing.

## 🎬 GIF Scenario 1: Basic Export Flow

**Duration**: 15-20 seconds  
**File**: `test.mmd`  

### Steps to Record:
1. Open VS Code with `test.mmd`
2. Right-click on the mermaid diagram
3. Select "Export Mermaid Diagram"
4. Choose SVG format
5. Show the exported file opening
6. Display the clean SVG output

**Key Points to Highlight**:
- Simple right-click workflow
- Format selection dialog
- Quick export completion
- Clean output quality

---

## 🎬 GIF Scenario 2: Status Bar Integration

**Duration**: 10-15 seconds  
**File**: `01-flowchart-examples.md`

### Steps to Record:
1. Open file with multiple mermaid diagrams
2. Show status bar indicator (strategy, theme)
3. Click status bar to see options
4. Click "Export Current" from status bar
5. Show export progress notification

**Key Points to Highlight**:
- Status bar integration
- Quick access to export
- Progress feedback
- Strategy indicator

---

## 🎬 GIF Scenario 3: Onboarding Experience

**Duration**: 30-40 seconds  
**Setup**: Fresh VS Code install (or reset extension state)

### Steps to Record:
1. Install extension (or reset onboarding state)
2. Open any mermaid file
3. Try to export → onboarding appears
4. Choose "Quick Setup"
5. Show system detection progress
6. Display setup completion
7. Retry export → success

**Key Points to Highlight**:
- Automatic onboarding trigger
- System capability detection
- Guided setup process
- Successful resolution

---

## 🎬 GIF Scenario 4: Fallback Strategy Demo

**Duration**: 25-30 seconds  
**Setup**: System without mermaid CLI installed

### Steps to Record:
1. Show status bar indicating "Web Strategy"
2. Right-click export on complex diagram
3. Show "Using Web fallback" message
4. Display export progress
5. Show successful output
6. Compare with CLI output side-by-side

**Key Points to Highlight**:
- Automatic fallback when CLI unavailable
- Seamless user experience
- Quality comparison
- No user intervention needed

---

## 🎬 GIF Scenario 5: Debug Command Demo

**Duration**: 45-60 seconds  
**File**: Any test file

### Steps to Record:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Mermaid Export Pro: Debug"
3. Select "Debug Export" 
4. Show progress through different diagram types
5. Display completion notification
6. Open debug results folder
7. Show comparison files (CLI vs Web)
8. Open the generated debug report

**Key Points to Highlight**:
- Comprehensive testing capability
- Strategy comparison
- Professional debugging tools
- Detailed reporting

---

## 🎬 GIF Scenario 6: Multiple Format Export

**Duration**: 20-25 seconds  
**File**: `02-sequence-examples.md` (complex sequence)

### Steps to Record:
1. Right-click on complex sequence diagram
2. Export as SVG → show result
3. Export same diagram as PNG → show result  
4. Export same diagram as JPG → show result
5. Quick file size comparison
6. Show all three files open

**Key Points to Highlight**:
- Multiple format support
- Consistent quality across formats
- Appropriate file sizes
- Professional output

---

## 🎬 GIF Scenario 7: Export Folder (Future)

**Duration**: 20-30 seconds  
**File**: `04-all-diagram-types.md`

### Steps to Record:
1. Open file with multiple diagrams
2. Select multiple mermaid blocks
3. Right-click → "Export Folder"
4. Choose format and destination
5. Show progress for multiple exports
6. Display folder with all exported files

**Key Points to Highlight**:
- Efficiency for multiple diagrams
- Batch processing capability
- Consistent naming and organization

---

## 🎬 GIF Scenario 8: Error Recovery

**Duration**: 20-25 seconds  
**File**: Create file with invalid mermaid syntax

### Steps to Record:
1. Open file with broken mermaid syntax
2. Try to export → error appears
3. Show helpful error message
4. Fix the syntax
5. Retry export → success
6. Show final output

**Key Points to Highlight**:
- Graceful error handling
- Helpful error messages
- Easy recovery process
- User-friendly experience

---

## 📋 Recording Setup Guidelines

### Technical Requirements:
- **Screen Resolution**: 1920×1080 minimum
- **Recording Area**: Focus on VS Code window
- **Frame Rate**: 30 FPS for smooth playback
- **Duration**: Keep under 60 seconds per GIF
- **File Size**: Target under 10MB per GIF

### VS Code Setup:
- **Theme**: Use default VS Code theme for consistency
- **Font Size**: Increase to 14px for readability
- **Window Size**: Standard VS Code layout
- **Panel**: Hide terminal/output panels unless needed

### Recording Best Practices:
1. **Slow deliberate movements** - cursor movements should be visible
2. **Pause between actions** - let each step complete before next
3. **Highlight important elements** - cursor should draw attention
4. **Show results clearly** - ensure output is visible
5. **Clean workspace** - close unnecessary tabs and panels

### Tools for Recording:
- **Windows**: OBS Studio, ScreenToGif, LICEcap
- **macOS**: Kap, CleanShot X, Gifox
- **Linux**: Peek, SimpleScreenRecorder + ffmpeg

### File Naming Convention:
```
scenario-01-basic-export.gif
scenario-02-status-bar.gif  
scenario-03-onboarding.gif
scenario-04-fallback-strategy.gif
scenario-05-debug-command.gif
scenario-06-multiple-formats.gif
scenario-07-batch-export.gif
scenario-08-error-recovery.gif
```

## 📁 Storage and Organization

### Folder Structure:
```
demo/
├── gifs/
│   ├── scenario-01-basic-export.gif
│   ├── scenario-02-status-bar.gif
│   └── ...
├── screenshots/
│   ├── onboarding-welcome.png
│   ├── export-dialog.png
│   └── ...
└── raw-recordings/
    ├── scenario-01-raw.mp4
    └── ...
```

### Usage in Documentation:
- **README.md**: Show basic export flow (Scenario 1)
- **Feature docs**: Use specific scenarios per feature
- **Troubleshooting**: Error recovery scenarios
- **Marketing**: Onboarding and debug command demos

---

**Recording Tips**: 
- Test each scenario multiple times before recording
- Keep movements smooth and deliberate  
- Show clear cause-and-effect relationships
- Focus on user value, not technical details
- Ensure all text is readable in the final GIF