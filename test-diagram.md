# Test Mermaid Diagram

This is a test markdown file with mermaid diagrams to test the extension functionality.

## Simple Flowchart

```mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    C --> E[End]
    D --> B
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Extension
    participant CLI
    participant Web
    
    User->>Extension: Click Export
    Extension->>CLI: Try CLI Export
    CLI-->>Extension: Success/Failure
    alt CLI Success
        Extension->>User: Show exported file
    else CLI Failure
        Extension->>Web: Fallback to Web
        Web-->>Extension: SVG Result
        Extension->>User: Show exported file
    end
```

## Class Diagram

```mermaid
classDiagram
    class OnboardingManager {
        +maybeShowWelcome()
        +runSetup()
        +detectSystemCapabilities()
    }
    
    class StatusBarManager {
        +handleClick()
        +refresh()
        +updateVisibility()
    }
    
    class ExportStrategy {
        <<interface>>
        +export()
        +isAvailable()
    }
    
    OnboardingManager --> StatusBarManager
    StatusBarManager --> ExportStrategy
```

Open this file in VS Code and test the extension features!