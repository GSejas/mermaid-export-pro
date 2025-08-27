# All Diagram Types - Test Suite

Comprehensive test file covering all 10 mermaid diagram types supported by the extension.

## 1. State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle : Extension Loaded
    
    Idle --> Analyzing : User Clicks Export
    Analyzing --> CLIAvailable : Check CLI
    Analyzing --> WebFallback : No CLI Found
    
    CLIAvailable --> Exporting : Use CLI Strategy
    WebFallback --> Exporting : Use Web Strategy
    
    Exporting --> Success : Export Complete
    Exporting --> Error : Export Failed
    
    Success --> [*]
    Error --> Retry : User Retry
    Retry --> Analyzing
    Error --> [*] : User Cancel
    
    state Exporting {
        [*] --> Rendering
        Rendering --> Saving
        Saving --> [*]
    }
```

## 2. Entity Relationship Diagram

```mermaid
erDiagram
    EXTENSION ||--o{ COMMAND : "registers"
    EXTENSION {
        string name PK
        string version
        date activated_at
        json configuration
    }
    
    COMMAND ||--|| STRATEGY : "uses"
    COMMAND {
        string id PK
        string name
        string description
        boolean enabled
    }
    
    STRATEGY ||--o{ EXPORT_RESULT : "produces"
    STRATEGY {
        string type PK
        string name
        json capabilities
        boolean is_available
    }
    
    EXPORT_RESULT {
        string id PK
        string strategy_type FK
        string format
        datetime created_at
        integer file_size
        boolean success
    }
    
    USER ||--o{ EXPORT_RESULT : "creates"
    USER {
        string workspace_id PK
        json preferences
        datetime last_active
    }
```

## 3. Gantt Chart

```mermaid
gantt
    title Extension Development Timeline
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    
    section Phase 1 - Core
    Project Setup          :done, setup, 2024-08-01, 3d
    CLI Strategy           :done, cli, after setup, 5d
    Web Strategy           :done, web, after cli, 7d
    Basic Testing          :done, test1, after web, 3d
    
    section Phase 2 - Polish  
    Status Bar UI          :done, ui, after test1, 4d
    Onboarding Flow        :done, onboard, after ui, 6d
    Debug Command          :done, debug, after onboard, 4d
    
    section Phase 3 - Release
    Documentation          :active, docs, after debug, 3d
    Final Testing          :testing, 2024-08-26, 2d
    Release Prep           :milestone, release, 2024-08-28, 0d
    
    section Future
    User Feedback          :feedback, after release, 7d
    Bug Fixes             :fixes, after feedback, 5d
    Feature Requests      :features, after fixes, 10d
```

## 4. Pie Chart

```mermaid
pie title Extension Usage by Strategy
    "CLI Export (Primary)" : 65
    "Web Export (Fallback)" : 28
    "Debug Testing" : 5
    "Configuration" : 2
```

## 5. Journey Map

```mermaid
journey
    title User's First Export Experience
    section Discovery
      Install Extension      : 5: User
      See Status Bar         : 4: User
      Read Getting Started   : 3: User
      
    section First Export
      Open Mermaid File      : 5: User
      Right-click Diagram    : 4: User
      Click Export Option    : 5: User
      See Onboarding        : 3: User
      
    section Setup Decision
      Choose Quick Setup     : 4: User
      Wait for CLI Check     : 2: User
      See Setup Results      : 5: User
      
    section Successful Export
      Try Export Again       : 5: User
      See Progress Bar       : 4: User
      Find Output File       : 5: User
      Celebrate Success      : 5: User
```

## 6. Git Graph

```mermaid
gitgraph
    commit id: "Initial Extension"
    commit id: "Add CLI Strategy"
    
    branch feature/web-export
    checkout feature/web-export
    commit id: "Add Web Strategy"
    commit id: "Fix Webview Issues"
    commit id: "Add Format Support"
    
    checkout main
    commit id: "Add Status Bar"
    
    branch feature/onboarding
    checkout feature/onboarding
    commit id: "Add Onboarding Manager"
    commit id: "System Detection"
    
    checkout main
    merge feature/web-export
    commit id: "Version 1.0.0" tag: "v1.0.0"
    
    checkout feature/onboarding
    commit id: "Polish Onboarding"
    
    checkout main
    merge feature/onboarding
    commit id: "Version 1.0.1" tag: "v1.0.1"
    
    branch feature/debug-testing
    checkout feature/debug-testing
    commit id: "Add Debug Command"
    commit id: "Comprehensive Testing"
    
    checkout main
    merge feature/debug-testing
    commit id: "Version 1.0.4" tag: "v1.0.4"
```

## 7. Mind Map

```mermaid
mindmap
  root((Mermaid Export Pro))
    Export Strategies
      CLI Strategy
        @mermaid-js/mermaid-cli
        Cross-platform
        High quality output
        PDF support
      Web Strategy
        VS Code webview
        Bundled mermaid.js
        No dependencies
        Fallback option
    User Experience
      Status Bar Integration
        Quick access
        Strategy indicator
        Theme cycling
      Onboarding Flow
        System detection
        Guided setup
        Installation help
      Context Menus
        Right-click export
        Format selection
        Batch operations
    Quality Assurance  
      Debug Testing
        All diagram types
        Multiple formats
        Strategy comparison
      Cross-platform
        Windows support
        macOS support  
        Linux support
      Error Handling
        Graceful degradation
        User feedback
        Recovery options
```

## Testing Instructions

### Manual Testing Steps:
1. **Open this file in VS Code** with the extension installed
2. **Test each diagram type**:
   - Right-click on each mermaid block
   - Select "Export Mermaid Diagram" 
   - Try different formats (SVG, PNG, JPG)
3. **Verify output quality**:
   - Check text readability
   - Verify shapes render correctly  
   - Ensure proper spacing and alignment
4. **Test both strategies**:
   - With CLI installed (primary)
   - Without CLI (web fallback)
5. **Run debug command**: `Ctrl+Shift+P` → "Mermaid Export Pro: Debug Export"

### Expected Results:
- All diagram types export successfully
- Both CLI and Web strategies work
- Output files are properly formatted
- No visual artifacts or corruption
- Reasonable file sizes for each format

### Known Limitations:
- PDF export requires CLI installation
- Some complex diagrams may render differently between strategies
- Web strategy doesn't support all advanced mermaid features