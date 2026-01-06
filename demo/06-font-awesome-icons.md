# Font Awesome Icons Test - Mermaid Export Pro

This file tests Font Awesome icon support in Mermaid Export Pro (Issue #3).

## Flowchart with Font Awesome Icons

```mermaid
flowchart TD
    Start[fa:fa-play Start] --> Auth[fa:fa-user-shield Authentication]
    Auth --> Check{fa:fa-check-circle Valid?}
    Check -->|Yes| Dashboard[fa:fa-chart-line Dashboard]
    Check -->|No| Error[fa:fa-exclamation-triangle Error]
    Dashboard --> Settings[fa:fa-cog Settings]
    Dashboard --> Profile[fa:fa-user Profile]
    Dashboard --> Data[fa:fa-database Data]
    Settings --> Save[fa:fa-save Save]
    Error --> Retry[fa:fa-redo Retry]
```

## Sequence Diagram with Icons

```mermaid
sequenceDiagram
    participant U as fa:fa-user User
    participant S as fa:fa-server Server
    participant DB as fa:fa-database Database
    
    U->>S: fa:fa-sign-in-alt Login Request
    S->>DB: fa:fa-search Query User
    DB-->>S: fa:fa-check User Data
    S-->>U: fa:fa-key Access Token
```

## Class Diagram with Icons

```mermaid
classDiagram
    class User {
        fa:fa-id-card id
        fa:fa-user name
        fa:fa-envelope email
        fa:fa-lock password
        +login()
        +logout()
    }
    
    class Admin {
        fa:fa-shield-alt privileges
        +deleteUser()
        +manageSystem()
    }
    
    class Database {
        fa:fa-database data
        fa:fa-server connection
        +query()
        +update()
    }
    
    User <|-- Admin
    Database --> User
```

## State Diagram with Icons

```mermaid
stateDiagram-v2
    [*] --> Idle: fa:fa-power-off Start
    Idle --> Loading: fa:fa-spinner Load
    Loading --> Ready: fa:fa-check Success
    Loading --> Error: fa:fa-times Fail
    Ready --> Processing: fa:fa-cog Process
    Processing --> Complete: fa:fa-check-double Done
    Error --> Idle: fa:fa-redo Retry
    Complete --> [*]: fa:fa-power-off End
```

## Entity Relationship Diagram with Icons

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        string fa_user_name
        string fa_envelope_email
        string fa_phone_phone
    }
    ORDER ||--|{ LINE-ITEM : contains
    ORDER {
        int fa_hashtag_order_number
        date fa_calendar_order_date
        string fa_credit_card_payment
    }
    PRODUCT ||--o{ LINE-ITEM : includes
    PRODUCT {
        string fa_box_name
        float fa_dollar_price
        int fa_warehouse_stock
    }
```

## Git Graph with Icons

```mermaid
gitGraph
    commit id: "fa:fa-code Initial Commit"
    commit id: "fa:fa-plus Add Feature"
    branch develop
    checkout develop
    commit id: "fa:fa-wrench Bug Fix"
    checkout main
    commit id: "fa:fa-file-code Update Docs"
    merge develop id: "fa:fa-code-branch Merge" tag: "v1.0"
    commit id: "fa:fa-rocket Deploy"
```

## Testing Instructions

1. **Export this file** using Quick Export or Export As
2. **Verify icons render** in the exported image
3. **Test both strategies**:
   - CLI Export (if @mermaid-js/mermaid-cli installed)
   - Web Export (fallback)
4. **Test custom CSS**:
   ```json
   {
     "mermaidExportPro.customCss": [
       "https://example.com/custom-icons.css"
     ]
   }
   ```
5. **Test disable Font Awesome**:
   ```json
   {
     "mermaidExportPro.fontAwesomeEnabled": false
   }
   ```

## Expected Results

✅ **With fontAwesomeEnabled = true (default)**:
- All fa:fa-* icons render as Font Awesome icons
- Icons appear in all diagram types
- Works with both export strategies

❌ **With fontAwesomeEnabled = false**:
- Icons show as text (e.g., "fa:fa-user")
- Fallback to standard mermaid rendering

## Common Font Awesome Icons for Diagrams

- **Users**: fa:fa-user, fa:fa-users, fa:fa-user-shield
- **Actions**: fa:fa-play, fa:fa-stop, fa:fa-pause, fa:fa-redo
- **Status**: fa:fa-check, fa:fa-times, fa:fa-exclamation, fa:fa-info
- **Data**: fa:fa-database, fa:fa-server, fa:fa-cloud, fa:fa-hdd
- **Navigation**: fa:fa-home, fa:fa-arrow-right, fa:fa-arrow-left
- **Settings**: fa:fa-cog, fa:fa-wrench, fa:fa-sliders, fa:fa-tools
- **Files**: fa:fa-file, fa:fa-folder, fa:fa-file-code, fa:fa-file-pdf
- **Communication**: fa:fa-envelope, fa:fa-phone, fa:fa-comment
- **Security**: fa:fa-lock, fa:fa-unlock, fa:fa-key, fa:fa-shield-alt

## Reference

- Font Awesome 6.2.0: https://fontawesome.com/icons
- Mermaid Icon Support: https://mermaid.js.org/config/icons.html
- GitHub Issue #3: https://github.com/GSejas/mermaid-export-pro/issues/3
