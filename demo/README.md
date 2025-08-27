# Demo Test Files

This folder contains comprehensive test scenarios for the Mermaid Export Pro extension.

## 📁 File Structure

### Test Files by Category

| File | Purpose | Diagram Types |
|------|---------|---------------|
| `01-flowchart-examples.md` | Basic and complex flowcharts | Flowchart |
| `02-sequence-examples.md` | API calls and microservices flows | Sequence |
| `03-class-diagram-examples.md` | Software architecture modeling | Class |
| `04-all-diagram-types.md` | **Complete test suite** | All 10 types |
| `05-edge-cases.md` | Stress tests and error scenarios | Various |
| `test-diagram.md` | Original simple test file | Mixed |
| `test.mmd` | Basic .mmd file test | Flowchart |

### Legacy Files
- `test-diagram.md` - Original test file with extension architecture
- `test.mmd` - Simple mermaid file for basic testing

## 🧪 Testing Strategy

### 1. **Start Here: Complete Test Suite**
Open `04-all-diagram-types.md` for comprehensive testing of all features:
- All 10 mermaid diagram types
- Simple and complex examples
- Manual testing instructions
- Expected results documentation

### 2. **Focused Testing**
Use individual files for specific diagram types:
- `01-flowchart-examples.md` - Decision flows, complex processes
- `02-sequence-examples.md` - API interactions, microservices
- `03-class-diagram-examples.md` - Software architecture

### 3. **Stress Testing**
Use `05-edge-cases.md` for challenging scenarios:
- Very large diagrams
- Unicode characters
- Long text content
- Nested structures
- Error conditions

## 📋 Manual Testing Checklist

### Basic Functionality
- [ ] Right-click export works on all diagram types
- [ ] Status bar shows correct export strategy
- [ ] Progress notifications appear during export
- [ ] Output files are created in correct location

### Format Testing
- [ ] SVG exports are clean and scalable
- [ ] PNG exports have transparent backgrounds
- [ ] JPG exports have white backgrounds (not black)
- [ ] File sizes are reasonable

### Strategy Testing
- [ ] CLI strategy works when mermaid-cli is installed
- [ ] Web strategy works as fallback
- [ ] Debug command compares both strategies
- [ ] Onboarding guides setup correctly

### Cross-Platform Testing
- [ ] Windows: PowerShell and Command Prompt
- [ ] macOS: Terminal and integrated shell
- [ ] Linux: Various distributions

## 🤖 Automated Testing

### Debug Command
Run the comprehensive debug test:
1. Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Mermaid Export Pro: Debug Export"
3. Wait for all tests to complete
4. Review results in `debug-exports/` folder

### Expected Debug Results
- **60 test combinations** (10 diagrams × 2 complexity × 3 formats × 2 strategies)
- **CLI vs Web comparison** for each scenario
- **Performance metrics** and file size analysis
- **Success/failure rates** with error details

## 🎯 Demo Scenarios

### For Presentations
1. **Quick Demo**: Use `test.mmd` for basic functionality
2. **Feature Demo**: Use `04-all-diagram-types.md` to show variety
3. **Reliability Demo**: Run debug command to show testing

### For Development
1. **Regression Testing**: Run all files after changes
2. **Performance Testing**: Use edge cases with large diagrams
3. **Error Handling**: Test invalid syntax scenarios

## 📊 Visual Quality Comparison

### CLI vs Web Strategy
| Aspect | CLI Export | Web Export |
|--------|------------|------------|
| **Quality** | High (official renderer) | Good (browser-based) |
| **Speed** | Slower (process spawn) | Faster (webview) |
| **Formats** | SVG, PNG, JPG, PDF | SVG, PNG, JPG |
| **Dependencies** | Requires Node.js + CLI | None (bundled) |
| **Reliability** | May fail if setup issues | Always available |

### Format Recommendations
- **SVG**: Best for presentations, web use, scalability
- **PNG**: Good for documents, maintains transparency
- **JPG**: Smallest files, good for sharing
- **PDF**: Documents, printing (CLI only)

## 🔧 Troubleshooting Test Issues

### Common Problems
1. **CLI not found**: Install `@mermaid-js/mermaid-cli` globally
2. **Web exports fail**: Check VS Code webview permissions
3. **Large diagrams timeout**: Increase timeout in settings
4. **Unicode issues**: Check VS Code encoding settings

### Debug Information
The debug command provides detailed diagnostics:
- System capability detection
- Strategy availability checks
- Performance measurements
- Error logs with specific guidance

## 📝 Contributing Test Cases

When adding new test scenarios:
1. Follow existing file naming pattern
2. Include both simple and complex examples
3. Add testing instructions and expected results
4. Update this README with new files
5. Test on multiple platforms before committing

---

**Happy Testing!** 🚀 These test files ensure the Mermaid Export Pro extension works reliably across all scenarios and platforms.