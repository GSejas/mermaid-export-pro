# Flowchart Examples

Test various flowchart scenarios to validate export functionality.

## Simple Decision Flow

```mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```

## Complex Software Development Flow

```mermaid
flowchart TB
    A[Feature Request] -->|Planning| B{Feasibility Check}
    B -->|Complex| C[Architecture Review]
    B -->|Simple| D[Direct Implementation]
    
    C --> E[Design Document]
    E --> F[Technical Spec]
    F --> G[Implementation]
    
    D --> G
    G --> H[Code Review]
    H -->|Changes Needed| I[Revisions]
    I --> H
    H -->|Approved| J[Testing]
    
    J --> K{Tests Pass?}
    K -->|No| L[Bug Fixes]
    L --> J
    K -->|Yes| M[Deployment]
    
    M --> N[Production]
    N --> O[Monitoring]
    O --> P{Issues?}
    P -->|Yes| Q[Hotfix]
    Q --> M
    P -->|No| R[Success]
    
    subgraph "Development Phase"
        G
        H
        I
    end
    
    subgraph "Quality Assurance"
        J
        K
        L
    end
    
    subgraph "Production"
        M
        N
        O
    end
```

## Export Test Instructions

1. Right-click on each diagram
2. Select "Export Mermaid Diagram"
3. Test different formats (SVG, PNG, JPG)
4. Verify output quality and file size