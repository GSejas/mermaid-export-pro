# Sequence Diagram Examples

Test sequence diagrams with different complexities and features.

## Simple API Call

```mermaid
sequenceDiagram
    participant Usersh
    participant App
    participant API
    
    User->>App: Login Request
    App->>API: POST /auth/login
    API-->>App: JWT Token
    App-->>User: Login Success
```

## Complex Microservices Authentication

```mermaid
sequenceDiagram
    participant Browser
    participant Gateway
    participant Auth
    participant User
    participant Cache
    participant DB
    participant Logger
    
    Browser->>+Gateway: POST /login
    Gateway->>+Auth: Validate Credentials
    
    Auth->>+User: Get User Info
    User->>+DB: Query User Table
    DB-->>-User: User Record
    User-->>-Auth: User Details
    
    Auth->>+Cache: Check Failed Attempts
    Cache-->>-Auth: Attempt Count
    
    alt Too Many Failed Attempts
        Auth-->>Gateway: Rate Limited
        Gateway-->>Browser: 429 Too Many Requests
    else Valid Login
        Auth->>+DB: Update Last Login
        DB-->>-Auth: Success
        
        Auth->>Cache: Clear Failed Attempts
        Auth->>+Logger: Log Successful Login
        Logger-->>-Auth: Logged
        
        Auth-->>-Gateway: JWT + Refresh Token
        Gateway-->>-Browser: Login Success + Cookies
    end
    
    Note over Browser,Logger: Authentication Flow Complete
    Note right of Cache: Session expires in 24h
    Note left of Logger: All logins are audited
```

## Testing Notes

- Test with long participant names
- Verify arrow types render correctly
- Check note positioning and text wrapping
- Validate alt/else block rendering