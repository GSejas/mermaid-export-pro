# Class Diagram Examples

Test class diagrams with inheritance, composition, and complex relationships.

## Simple Animal Hierarchy

```mermaid
classDiagram
    class Animal {
        +String namesssssss
        +int age
        +makeSound()
        +eat()
    }
    
    class Dog {
        +String breed
        +bark()
        +wagTail()
    }
    
    class Cat {
        +Boolean indoor
        +meow()
        +purr()
    }
    
    Animal <|-- Dog
    Animal <|-- Cat
```

## Complex Software Architecture

```mermaid
classDiagram
    class MermaidExportPro {
        +ExtensionContext context
        +activate()
        +deactivate()
    }
    
    class OnboardingManager {
        -ExtensionContext context
        -boolean onboardingCompleted
        +maybeShowWelcome() Promise~void~
        +runQuickSetup() Promise~void~
        +detectSystemCapabilities() Promise~SystemCapabilities~
        -showAnalysisResults() Promise~boolean~
        -executeInstallation(method) Promise~void~
    }
    
    class StatusBarManager {
        -StatusBarItem statusBarItem
        -ExportStrategy[] strategies
        +refresh() void
        +handleClick() void
        +updateVisibility() void
        -updateStatusText() void
        -updateTooltip() void
    }
    
    class ExportStrategy {
        <<interface>>
        +name String
        +export(content, options) Promise~Buffer~
        +isAvailable() Promise~boolean~
        +getRequiredDependencies() String[]
        +getSupportedFormats() String[]
    }
    
    class CLIExportStrategy {
        -string cliPath
        +export(content, options) Promise~Buffer~
        +isAvailable() Promise~boolean~
        +getVersion() Promise~string~
        -executeCommand(args) Promise~Buffer~
        -validateOutput(path) boolean
    }
    
    class WebExportStrategy {
        -ExtensionContext context
        -WebviewPanel panel
        +export(content, options) Promise~Buffer~
        +isAvailable() Promise~boolean~
        -renderWithHandshake() Promise~string~
        -createWebviewHTML() string
        -convertSvgToFormat() Promise~Buffer~
    }
    
    class ExportOptions {
        +ExportFormat format
        +MermaidTheme theme
        +number width
        +number height
        +string backgroundColor
        +string outputPath
    }
    
    class SystemCapabilities {
        +boolean hasNodeJs
        +boolean hasMermaidCli
        +boolean hasNpm
        +string nodeVersion
        +string mermaidVersion
    }
    
    MermaidExportPro --> OnboardingManager
    MermaidExportPro --> StatusBarManager
    StatusBarManager --> ExportStrategy
    ExportStrategy <|.. CLIExportStrategy
    ExportStrategy <|.. WebExportStrategy
    OnboardingManager ..> SystemCapabilities : creates
    ExportStrategy ..> ExportOptions : uses
    
    CLIExportStrategy : +List~String~ supportedFormats
    WebExportStrategy : +List~String~ supportedFormats
    
    note for ExportStrategy "Strategy pattern for\ndifferent export methods"
    note for OnboardingManager "Guides users through\ninitial setup process"
    note for CLIExportStrategy "Primary export method\nusing mermaid-cli"
    note for WebExportStrategy "Fallback method using\nVS Code webview"
```

## Testing Checklist

- [ ] Class names render properly
- [ ] Method signatures display correctly  
- [ ] Inheritance arrows point in right direction
- [ ] Composition diamonds appear
- [ ] Interface stereotypes show
- [ ] Notes are positioned well
- [ ] Long method names don't overflow boxes
- [ ] Generic types display properly