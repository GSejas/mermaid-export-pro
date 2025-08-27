# Edge Cases and Stress Tests

Test scenarios for edge cases, error conditions, and stress testing.

## Very Large Flowchart (Stress Test)

```mermaid
flowchart TD
    Start([Application Start]) --> Config{Load Configuration}
    Config -->|Success| Auth[Authentication Check]
    Config -->|Fail| Error1[Config Error]
    Error1 --> Exit1[Exit with Code 1]
    
    Auth -->|Authenticated| Dashboard[Load Dashboard]
    Auth -->|Not Authenticated| Login[Show Login Form]
    
    Login --> ValidateUser{Validate Credentials}
    ValidateUser -->|Valid| SetSession[Set User Session]
    ValidateUser -->|Invalid| LoginError[Show Login Error]
    ValidateUser -->|Network Error| NetworkError[Network Error]
    ValidateUser -->|Timeout| TimeoutError[Request Timeout]
    
    LoginError --> Login
    NetworkError --> Retry1{Retry?}
    TimeoutError --> Retry2{Retry?}
    Retry1 -->|Yes| Login
    Retry1 -->|No| Exit2[Exit Application]
    Retry2 -->|Yes| Login  
    Retry2 -->|No| Exit2
    
    SetSession --> Dashboard
    Dashboard --> LoadModules[Load Application Modules]
    
    LoadModules --> Module1[User Management]
    LoadModules --> Module2[Data Analytics]
    LoadModules --> Module3[Reporting Engine]
    LoadModules --> Module4[System Settings]
    LoadModules --> Module5[API Integration]
    
    Module1 --> UserList[Display User List]
    Module1 --> UserCreate[Create New User]
    Module1 --> UserEdit[Edit Existing User]
    Module1 --> UserDelete[Delete User]
    
    Module2 --> DataCollect[Collect Analytics Data]
    Module2 --> DataProcess[Process Data]
    Module2 --> DataVisualize[Create Visualizations]
    
    Module3 --> ReportGen[Generate Reports]
    Module3 --> ReportSchedule[Schedule Reports]
    Module3 --> ReportExport[Export Reports]
    
    Module4 --> SysConfig[System Configuration]
    Module4 --> UserPrefs[User Preferences]
    Module4 --> Security[Security Settings]
    
    Module5 --> APIConnect[Connect to APIs]
    Module5 --> APISync[Sync Data]
    Module5 --> APIMonitor[Monitor API Health]
    
    UserList --> UserActions{User Action}
    UserCreate --> Validation1{Validate Input}
    UserEdit --> Validation2{Validate Changes}
    UserDelete --> Confirm1{Confirm Delete}
    
    UserActions -->|View| UserDetail[Show User Details]
    UserActions -->|Edit| UserEdit
    UserActions -->|Delete| UserDelete
    UserActions -->|Back| Dashboard
    
    Validation1 -->|Valid| CreateUser[Create User Record]
    Validation1 -->|Invalid| ErrorMsg1[Show Validation Error]
    Validation2 -->|Valid| UpdateUser[Update User Record]
    Validation2 -->|Invalid| ErrorMsg2[Show Validation Error]
    
    CreateUser --> Success1[Show Success Message]
    UpdateUser --> Success2[Show Success Message]
    Confirm1 -->|Yes| DeleteUser[Delete User Record]
    Confirm1 -->|No| UserList
    DeleteUser --> Success3[Show Success Message]
    
    Success1 --> UserList
    Success2 --> UserList  
    Success3 --> UserList
    ErrorMsg1 --> UserCreate
    ErrorMsg2 --> UserEdit
    
    subgraph "Error Handling"
        Error1
        LoginError
        NetworkError
        TimeoutError
        ErrorMsg1
        ErrorMsg2
    end
    
    subgraph "Exit Points"
        Exit1
        Exit2
    end
    
    subgraph "User Management Module"
        UserList
        UserCreate
        UserEdit
        UserDelete
        UserDetail
        CreateUser
        UpdateUser
        DeleteUser
    end
    
    style Start fill:#90EE90
    style Exit1 fill:#FFB6C1
    style Exit2 fill:#FFB6C1
    style Error1 fill:#FFA07A
    style LoginError fill:#FFA07A
    style NetworkError fill:#FFA07A
    style TimeoutError fill:#FFA07A
```

## Unicode and Special Characters

```mermaid
flowchart LR
    A["🚀 Start Process"] --> B{"✅ Is Valid?"}
    B -->|Yes ✓| C["📊 Process Data"]
    B -->|No ❌| D["⚠️ Show Error"]
    C --> E["💾 Save Results"]
    D --> F["🔄 Retry Process"]
    F --> A
    E --> G["🎉 Success!"]
    
    subgraph "Émojis & Ünıçøðé"
        H["Ñoñ-ÄSCII çharàcters"]
        I["数据处理 (Chinese)"]
        J["Обработка данных (Russian)"]
        K["معالجة البيانات (Arabic)"]
    end
    
    G --> H
    H --> I
    I --> J  
    J --> K
```

## Very Long Text Content

```mermaid
sequenceDiagram
    participant VeryLongParticipantNameThatExceedsNormalLimits as "Very Long Participant Name That Exceeds Normal Display Limits"
    participant AnotherExtremelyLongParticipantNameForTesting as "Another Extremely Long Participant Name For Testing Purposes"
    
    VeryLongParticipantNameThatExceedsNormalLimits->>AnotherExtremelyLongParticipantNameForTesting: This is an extremely long message that contains a lot of text to test how the sequence diagram handles very long messages that might wrap or cause display issues in different export formats
    
    Note over VeryLongParticipantNameThatExceedsNormalLimits: This is a very long note that spans multiple lines and contains detailed information about the process being executed. It includes technical details, explanations, and other verbose content that might cause rendering issues.
    
    AnotherExtremelyLongParticipantNameForTesting-->>VeryLongParticipantNameThatExceedsNormalLimits: Response message with equally long content that includes technical specifications, error codes, status information, and other detailed response data that applications typically exchange
```

## Nested and Complex Structures

```mermaid
flowchart TB
    subgraph "Level 1 - Application Layer"
        subgraph "Level 2 - Authentication"
            subgraph "Level 3 - OAuth Flow"
                A1[Authorization Request]
                A2[User Consent]
                A3[Authorization Code]
            end
            subgraph "Level 3 - Token Management"
                B1[Access Token]
                B2[Refresh Token]  
                B3[Token Validation]
            end
        end
        
        subgraph "Level 2 - Business Logic"
            subgraph "Level 3 - User Operations"
                C1[Create User]
                C2[Update Profile]
                C3[Delete Account]
            end
            subgraph "Level 3 - Data Operations"
                D1[Query Database]
                D2[Cache Results]
                D3[Sync External APIs]
            end
        end
    end
    
    subgraph "Level 1 - Infrastructure Layer"
        subgraph "Level 2 - Database"
            E1[Primary DB]
            E2[Read Replicas]
            E3[Backup Systems]
        end
        subgraph "Level 2 - External Services"
            F1[Payment Gateway]
            F2[Email Service]
            F3[Analytics Platform]
        end
    end
    
    A1 --> A2
    A2 --> A3
    A3 --> B1
    B1 --> B3
    
    C1 --> D1
    C2 --> D1
    C3 --> D1
    
    D1 --> E1
    D2 --> E2
    D3 --> F1
    D3 --> F2
    D3 --> F3
```

## Empty and Minimal Diagrams

```mermaid
graph TD
    A[Single Node]
```

```mermaid
sequenceDiagram
    A->>B: Simple message
```

## Error Testing Scenarios

### Invalid Mermaid Syntax (Should be handled gracefully)
```
This is not valid mermaid syntax
graph TD
    A --> 
    --> B
```

### Mixed Content
```mermaid
graph TD
    A[Valid] --> B[Node]
sequenceDiagram
    participant Invalid
```

## Testing Checklist for Edge Cases

- [ ] Very large diagrams export without memory issues
- [ ] Unicode characters display correctly in all formats
- [ ] Long text doesn't cause layout problems
- [ ] Deeply nested subgraphs render properly
- [ ] Minimal diagrams don't cause errors
- [ ] Invalid syntax shows appropriate error messages
- [ ] Export doesn't hang or crash on complex diagrams
- [ ] File sizes are reasonable even for large diagrams
- [ ] Both CLI and Web strategies handle edge cases
- [ ] Error recovery works when exports fail