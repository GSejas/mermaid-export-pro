import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CLIExportStrategy } from '../strategies/cliExportStrategy';
import { WebExportStrategy } from '../strategies/webExportStrategy';
import { ErrorHandler } from '../ui/errorHandler';
import { PathUtils } from '../utils/pathUtils';
import { ExportOptions } from '../types';

// Premium testing imports (only loaded when feature flag is enabled)
let VisualEnhancementManager: any = null;

interface DebugResult {
  strategy: string;
  success: boolean;
  duration: number;
  error?: string;
  outputFiles: string[];
  version?: string;
  stdout?: string;
  stderr?: string;
}

export async function runDebugExport(context: vscode.ExtensionContext): Promise<void> {
  ErrorHandler.logInfo('Starting debug export command...');

  const testDiagrams = [
    {
      name: 'flowchart',
      simple: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
      complex: `flowchart TB
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]
    D --> G[Result one]
    E --> G
    F --> G
    G --> H{Another decision}
    H -->|Choice 1| I[Option A]
    H -->|Choice 2| J[Option B]
    H -->|Choice 3| K[Option C]
    I --> L((Final))
    J --> L
    K --> L
    L --> M[End Process]
    
    subgraph "Subprocess"
        N[Sub Start] --> O{Sub Decision}
        O -->|Yes| P[Sub Action]
        O -->|No| Q[Alternative]
        P --> R[Sub End]
        Q --> R
    end
    
    M --> N`
    },
    {
      name: 'sequence',
      simple: `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: Great!`,
      complex: `sequenceDiagram
    participant Browser
    participant API Gateway
    participant Auth Service
    participant User Service
    participant Database
    participant Cache
    
    Browser->>+API Gateway: Login Request
    API Gateway->>+Auth Service: Validate Credentials
    Auth Service->>+Database: Query User
    Database-->>-Auth Service: User Data
    Auth Service->>+Cache: Store Session
    Cache-->>-Auth Service: Session ID
    Auth Service-->>-API Gateway: JWT Token
    API Gateway-->>-Browser: Login Success
    
    Browser->>+API Gateway: Get Profile
    API Gateway->>+Auth Service: Validate JWT
    Auth Service->>+Cache: Check Session
    Cache-->>-Auth Service: Valid Session
    Auth Service-->>-API Gateway: Authorized
    API Gateway->>+User Service: Get User Profile
    User Service->>+Database: Query Profile
    Database-->>-User Service: Profile Data
    User Service-->>-API Gateway: Profile Response
    API Gateway-->>-Browser: User Profile
    
    Note over Browser,Database: Authentication Flow
    Note right of Cache: Session expires in 24h
    
    loop Health Check
        API Gateway->>Database: ping
        Database-->>API Gateway: pong
    end`
    },
    {
      name: 'classDiagram',
      simple: `classDiagram
    class Animal {
        +String name
        +makeSound()
    }
    class Dog {
        +bark()
    }
    Animal <|-- Dog`,
      complex: `classDiagram
    class Animal {
        +String name
        +int age
        +String species
        +makeSound() String
        +calculateLifeExpectancy() Integer
        +updateHealthRecord(record) Boolean
        +getMedicalHistory() List~MedicalRecord~
    }
    
    class Dog {
        +String breed
        +String ownerName
        +Boolean isTrainingComplete
        +bark() String
        +fetchBall() Boolean
        +performTrick(trickName) String
        +calculateWalkDistance() Double
    }
    
    class Cat {
        +Boolean indoor
        +String favoriteSpot
        +Integer huntingSkillLevel
        +meow() String
        +purr() Boolean
        +huntMice() Integer
        +climbTree() Boolean
    }
    
    class VeterinaryRecord {
        +Date lastCheckup
        +List~String~ vaccinations
        +String veterinarianName
        +Double weight
        +generateReport() String
        +scheduleNextAppointment() Date
        +updateVaccination(vaccine) Boolean
    }
    
    class Owner {
        +String fullName
        +String phoneNumber
        +String email
        +Address homeAddress
        +scheduleAppointment() Boolean
        +payBill(amount) Boolean
    }
    
    class MedicalRecord {
        +Date recordDate
        +String diagnosis
        +String treatment
        +String notes
        +Double cost
    }
    
    Animal <|-- Dog
    Animal <|-- Cat
    Animal --> VeterinaryRecord
    Owner --> Animal
    VeterinaryRecord --> MedicalRecord
    
    Dog : +List~Toy~ favoriteToys
    Cat : +List~String~ scratchingPosts`
    },
    {
      name: 'stateDiagram',
      simple: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`,
      complex: `stateDiagram-v2
    [*] --> Idle : System Start
    
    Idle --> Loading : User Action
    Loading --> Idle : Cancel
    Loading --> Processing : Data Ready
    
    Processing --> Success : Valid Data
    Processing --> Error : Invalid Data
    Processing --> Timeout : Time Exceeded
    
    Success --> Idle : Reset
    Error --> Idle : Reset
    Error --> Retry : User Retry
    Timeout --> Retry : Auto Retry
    
    Retry --> Processing : Attempt Again
    Retry --> Failed : Max Retries Reached
    Failed --> Idle : Reset
    
    state Processing {
        [*] --> Validating
        Validating --> Transforming : Valid
        Validating --> [*] : Invalid
        Transforming --> Saving
        Saving --> [*] : Complete
    }
    
    state Error {
        [*] --> NetworkError
        [*] --> ValidationError
        [*] --> ServerError
        NetworkError --> [*]
        ValidationError --> [*]
        ServerError --> [*]
    }`
    },
    {
      name: 'erDiagram',
      simple: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`,
      complex: `erDiagram
    CUSTOMER ||--o{ ORDER : "places"
    CUSTOMER {
        string customer_id PK
        string first_name
        string last_name
        string email UK
        string phone
        date created_at
        date updated_at
        boolean is_active
    }
    
    ORDER ||--|{ ORDER_ITEM : "contains"
    ORDER {
        string order_id PK
        string customer_id FK
        date order_date
        decimal total_amount
        string status
        string shipping_address
        date shipped_at
        string tracking_number
    }
    
    ORDER_ITEM }|--|| PRODUCT : "references"
    ORDER_ITEM {
        string order_item_id PK
        string order_id FK
        string product_id FK
        integer quantity
        decimal unit_price
        decimal line_total
    }
    
    PRODUCT ||--o{ PRODUCT_CATEGORY : "belongs to"
    PRODUCT {
        string product_id PK
        string name
        string description
        decimal price
        integer stock_quantity
        string sku UK
        boolean is_active
        date created_at
    }
    
    PRODUCT_CATEGORY {
        string category_id PK
        string name
        string description
        string parent_category_id FK
    }
    
    CUSTOMER }|..|{ DELIVERY_ADDRESS : "uses"
    DELIVERY_ADDRESS {
        string address_id PK
        string customer_id FK
        string street_address
        string city
        string state
        string zip_code
        string country
        boolean is_default
    }
    
    ORDER }|--|| PAYMENT : "processed by"
    PAYMENT {
        string payment_id PK
        string order_id FK
        decimal amount
        string payment_method
        string transaction_id
        date payment_date
        string status
    }`
    },
    {
      name: 'gantt',
      simple: `gantt
    title A Simple Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2024-01-01, 30d
    Another task     :after a1  , 20d`,
      complex: `gantt
    title Software Development Project Timeline
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    
    section Planning Phase
    Project Kickoff        :milestone, m1, 2024-01-01, 0d
    Requirements Gathering :active, req, 2024-01-02, 10d
    System Architecture    :arch, after req, 8d
    UI/UX Design          :design, 2024-01-05, 15d
    Technical Specs       :specs, after arch, 5d
    
    section Development
    Setup Development Environment :setup, after specs, 3d
    Backend API Development       :backend, after setup, 25d
    Frontend Development          :frontend, after design, 30d
    Database Design & Setup       :database, after specs, 8d
    Integration Testing           :integration, after backend, 10d
    
    section Testing & QA
    Unit Testing                 :testing, after backend, 15d
    User Acceptance Testing      :uat, after frontend, 8d
    Performance Testing          :perf, after integration, 5d
    Security Review             :security, after uat, 3d
    Bug Fixes                   :bugs, after security, 10d
    
    section Deployment
    Production Setup            :prod-setup, after bugs, 5d
    Deployment                  :deploy, after prod-setup, 2d
    Go Live                     :milestone, m2, after deploy, 0d
    Post-Launch Support         :support, after deploy, 14d
    
    section Documentation
    API Documentation           :api-docs, after backend, 8d
    User Manual                :user-docs, after uat, 10d
    Deployment Guide           :deploy-docs, after prod-setup, 5d`
    },
    {
      name: 'pie',
      simple: `pie title Simple Pie Chart
    "A" : 386
    "B" : 85
    "C" : 15`,
      complex: `pie title Comprehensive Sales Analysis Q4 2024
    "Enterprise Solutions (42%)" : 420000
    "SaaS Subscriptions (28%)" : 280000
    "Professional Services (15%)" : 150000
    "Training & Certification (8%)" : 80000
    "Support & Maintenance (4%)" : 40000
    "Hardware Sales (2%)" : 20000
    "Other Revenue (1%)" : 10000`
    },
    {
      name: 'journey',
      simple: `journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
    section Work
      Do work: 1: Me, Cat`,
      complex: `journey
    title Complete Customer Onboarding Journey
    section Discovery
      Research Solutions    : 3: Customer
      Compare Vendors      : 2: Customer
      Request Demo         : 4: Customer, Sales
      Attend Demo          : 5: Customer, Sales, Solutions Engineer
      
    section Evaluation
      Technical Review     : 3: Customer, IT Team
      Security Assessment  : 2: Customer, Security Team
      Cost Analysis        : 4: Customer, Finance
      Reference Calls      : 5: Customer, Sales
      
    section Purchase
      Contract Negotiation : 2: Customer, Sales, Legal
      Approval Process     : 3: Customer, Management
      Contract Signing     : 5: Customer, Sales
      
    section Implementation  
      Project Kickoff      : 5: Customer, Success Manager, Implementation
      System Configuration: 3: Customer, Implementation, IT Team
      Data Migration       : 2: Customer, Implementation, Data Team
      Integration Setup    : 3: Customer, Implementation, IT Team
      Testing Phase        : 4: Customer, Implementation, QA
      
    section Go-Live
      User Training        : 4: Customer, Success Manager, Trainer
      Soft Launch         : 3: Customer, Success Manager
      Production Rollout   : 5: Customer, Success Manager, Support
      Post-Launch Review   : 4: Customer, Success Manager`
    },
    {
      name: 'gitgraph',
      simple: `gitgraph
    commit
    commit
    branch develop
    commit
    commit
    checkout main
    commit
    merge develop`,
      complex: `gitgraph
    commit id: "Initial commit"
    commit id: "Add basic structure"
    
    branch feature/authentication
    checkout feature/authentication
    commit id: "Add login form"
    commit id: "Implement JWT auth"
    commit id: "Add password validation"
    
    checkout main
    commit id: "Update documentation"
    
    branch feature/user-management
    checkout feature/user-management  
    commit id: "Add user model"
    commit id: "Create user CRUD"
    
    checkout main
    merge feature/authentication
    commit id: "Version 1.1.0" tag: "v1.1.0"
    
    checkout feature/user-management
    commit id: "Add user permissions"
    commit id: "Implement user roles"
    
    checkout main
    branch hotfix/security-patch
    commit id: "Fix SQL injection"
    commit id: "Update dependencies"
    
    checkout main  
    merge hotfix/security-patch
    commit id: "Security patch 1.1.1" tag: "v1.1.1"
    
    merge feature/user-management
    commit id: "Version 1.2.0" tag: "v1.2.0"
    
    branch feature/dashboard
    checkout feature/dashboard
    commit id: "Add dashboard layout"
    commit id: "Implement analytics"`
    },
    {
      name: 'mindmap',
      simple: `mindmap
  root((mindmap))
    Origins
      Long history
    Research
      On effectiveness`,
      complex: `mindmap
  root((Software Architecture))
    Frontend
      Frameworks
        React
          Components
          State Management
            Redux
            Context API
          Hooks
        Vue.js
          Composition API
          Single File Components
        Angular
          TypeScript
          Dependency Injection
      Styling
        CSS Frameworks
          Bootstrap
          Tailwind CSS
        Preprocessors
          SASS
          LESS
        CSS-in-JS
          Styled Components
          Emotion
    Backend
      Languages
        JavaScript
          Node.js
            Express
            FastAPI
        Python
          Django
          Flask
          FastAPI
        Java
          Spring Boot
          Microservices
        Go
          Gin
          Fiber
      Databases
        SQL
          PostgreSQL
          MySQL
        NoSQL
          MongoDB
          Redis
          Elasticsearch
    DevOps
      Containerization
        Docker
          Images
          Containers
          Docker Compose
        Kubernetes
          Pods
          Services
          Ingress
      CI/CD
        GitHub Actions
        Jenkins
        GitLab CI
      Cloud Providers
        AWS
          EC2
          S3
          Lambda
        Azure
          App Service
          Blob Storage
        Google Cloud
          Compute Engine
          Cloud Storage`
    }
  ];

  const testFormats = ['svg', 'png', 'jpg'] as const;
  const complexityLevels = ['simple', 'complex'] as const;
  const testOptions: ExportOptions = {
    format: 'svg', // Will be updated per format
    theme: 'default',
    width: 800,
    height: 600,
    backgroundColor: 'transparent'
  };

  // Create timestamped debug folder
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0] + 'Z';
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
  const debugRoot = path.join(workspaceRoot, 'debug-exports', timestamp);
  const cliFolder = path.join(debugRoot, 'cli');
  const webFolder = path.join(debugRoot, 'web');

  try {
    // Create directories
    await fs.promises.mkdir(debugRoot, { recursive: true });
    await fs.promises.mkdir(cliFolder, { recursive: true });
    await fs.promises.mkdir(webFolder, { recursive: true });

    ErrorHandler.logInfo(`Created debug folder: ${debugRoot}`);

    const results: DebugResult[] = [];

    // Test with progress indication
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Running Comprehensive Debug Export Tests...',
      cancellable: false
    }, async (progress) => {
      
      // Feature flag for premium testing
      const ENABLE_PREMIUM_TESTING = false;
      const strategiesCount = ENABLE_PREMIUM_TESTING ? 3 : 2; // CLI, Web, (Premium)
      
      // Load premium imports only if needed (currently disabled)
      if (ENABLE_PREMIUM_TESTING && !VisualEnhancementManager) {
        const module = await import('../services/visualEnhancementManager.js');
        VisualEnhancementManager = module.VisualEnhancementManager;
      }
      
      let totalTests = testDiagrams.length * complexityLevels.length * testFormats.length * strategiesCount;
      let completedTests = 0;
      
      // Test each diagram type
      for (const diagramSpec of testDiagrams) {
        // Test both simple and complex versions
        for (const complexity of complexityLevels) {
          const diagramContent = diagramSpec[complexity];
          
          // Create diagram-specific folders with complexity level
          const diagramCliFolder = path.join(cliFolder, diagramSpec.name, complexity);
          const diagramWebFolder = path.join(webFolder, diagramSpec.name, complexity);
          
          await fs.promises.mkdir(diagramCliFolder, { recursive: true });
          await fs.promises.mkdir(diagramWebFolder, { recursive: true });
          
          let diagramPremiumFolder: string | undefined;
          if (ENABLE_PREMIUM_TESTING) {
            const premiumFolder = path.join(debugRoot, 'premium');
            await fs.promises.mkdir(premiumFolder, { recursive: true });
            diagramPremiumFolder = path.join(premiumFolder, diagramSpec.name, complexity);
            await fs.promises.mkdir(diagramPremiumFolder, { recursive: true });
          }
          
          // Test each format for this diagram
          for (const format of testFormats) {
            const formatOptions = { ...testOptions, format };
            
            // Test CLI Strategy
            progress.report({ 
              increment: (completedTests / totalTests) * 100, 
              message: `Testing ${diagramSpec.name} (${complexity}) - CLI ${format.toUpperCase()}...` 
            });
            const cliResult = await testCLIStrategy(diagramContent, formatOptions, diagramCliFolder);
            cliResult.strategy = `CLI (${format.toUpperCase()}) - ${diagramSpec.name} (${complexity})`;
            results.push(cliResult);
            completedTests++;

            // Test Web Strategy  
            progress.report({ 
              increment: (completedTests / totalTests) * 100, 
              message: `Testing ${diagramSpec.name} (${complexity}) - Web ${format.toUpperCase()}...` 
            });
            const webResult = await testWebStrategy(diagramContent, formatOptions, diagramWebFolder, context);
            webResult.strategy = `Web (${format.toUpperCase()}) - ${diagramSpec.name} (${complexity})`;
            results.push(webResult);
            completedTests++;

            // Premium Strategy Testing (feature flagged)
            if (ENABLE_PREMIUM_TESTING && diagramPremiumFolder) {
              
              if (format === 'svg') {
                const premiumStyles = ['modern', 'corporate', 'artistic', 'minimal'];
                for (const style of premiumStyles) {
                  progress.report({ 
                    increment: (completedTests / totalTests) * 100, 
                    message: `Testing ${diagramSpec.name} (${complexity}) - Premium ${style}...` 
                  });
                  const premiumResult = await testPremiumStrategy(
                    diagramContent, 
                    formatOptions, 
                    path.join(diagramPremiumFolder, style), 
                    context,
                    style
                  );
                  premiumResult.strategy = `Premium ${style.charAt(0).toUpperCase() + style.slice(1)} (${format.toUpperCase()}) - ${diagramSpec.name} (${complexity})`;
                  results.push(premiumResult);
                }
              } else {
                // For non-SVG formats, test just one premium style (modern)
                progress.report({ 
                  increment: (completedTests / totalTests) * 100, 
                  message: `Testing ${diagramSpec.name} (${complexity}) - Premium Modern ${format.toUpperCase()}...` 
                });
                const premiumResult = await testPremiumStrategy(
                  diagramContent, 
                  formatOptions, 
                  path.join(diagramPremiumFolder, 'modern'), 
                  context,
                  'modern'
                );
                premiumResult.strategy = `Premium Modern (${format.toUpperCase()}) - ${diagramSpec.name} (${complexity})`;
                results.push(premiumResult);
              }
            }
            completedTests++;
          }
        }
      }
      
      progress.report({ increment: 100 });
    });

    // Generate debug report
    await generateDebugReport(debugRoot, testDiagrams, testOptions, results);

    // Show completion message
    const openFolder = await vscode.window.showInformationMessage(
      `Debug export completed! Results saved to: ${path.basename(debugRoot)}`,
      'Open Debug Folder',
      'View Report',
      'Show in Explorer'
    );

    if (openFolder === 'Open Debug Folder') {
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(debugRoot), { forceNewWindow: true });
    } else if (openFolder === 'View Report') {
      const reportPath = path.join(debugRoot, 'debug.md');
      const doc = await vscode.workspace.openTextDocument(reportPath);
      await vscode.window.showTextDocument(doc);
    } else if (openFolder === 'Show in Explorer') {
      await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(debugRoot));
    }

  } catch (error) {
    ErrorHandler.logError(`Debug export failed: ${error}`);
    throw error;
  }
}

async function testCLIStrategy(diagram: string, options: ExportOptions, outputFolder: string): Promise<DebugResult> {
  const startTime = Date.now();
  const result: DebugResult = {
    strategy: 'CLI',
    success: false,
    duration: 0,
    outputFiles: []
  };

  try {
    const cliStrategy = new CLIExportStrategy();
    
    // Check if CLI is available
    const isAvailable = await cliStrategy.isAvailable();
    if (!isAvailable) {
      result.error = 'CLI not available - mmdc command not found. Install with: npm install -g @mermaid-js/mermaid-cli';
      result.duration = Date.now() - startTime;
      return result;
    }

    // Get version info
    try {
      result.version = await cliStrategy.getVersion();
    } catch (error) {
      result.version = 'Unknown - version check failed';
    }

    // Export diagram
    const buffer = await cliStrategy.export(diagram, options);
    
    // Save output file
    const outputPath = path.join(outputFolder, `diagram.${options.format}`);
    await fs.promises.writeFile(outputPath, buffer);
    
    result.success = true;
    result.outputFiles.push(outputPath);
    ErrorHandler.logInfo(`CLI export successful: ${outputPath}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide specific guidance for common errors
    if (errorMessage.includes('EFTYPE') || errorMessage.includes('spawn')) {
      result.error = `Puppeteer/Chromium launch failed: ${errorMessage}. Try: 1) Install Chrome/Edge, 2) Set PUPPETEER_EXECUTABLE_PATH, or 3) Use web strategy`;
    } else if (errorMessage.includes('ENOENT')) {
      result.error = 'Mermaid CLI not found. Install with: npm install -g @mermaid-js/mermaid-cli';
    } else if (errorMessage.includes('timeout')) {
      result.error = `Export timed out: ${errorMessage}. Diagram may be too complex for CLI strategy`;
    } else {
      result.error = errorMessage;
    }
    
    ErrorHandler.logError(`CLI export failed: ${result.error}`);
  }

  result.duration = Date.now() - startTime;
  return result;
}

async function testWebStrategy(diagram: string, options: ExportOptions, outputFolder: string, context: vscode.ExtensionContext): Promise<DebugResult> {
  const startTime = Date.now();
  const result: DebugResult = {
    strategy: 'Web',
    success: false,
    duration: 0,
    outputFiles: []
  };

  try {
    const webStrategy = new WebExportStrategy(context);
    
    // Export diagram
    const buffer = await webStrategy.export(diagram, options);
    
    // Save output file  
    const outputPath = path.join(outputFolder, `diagram.${options.format}`);
    await fs.promises.writeFile(outputPath, buffer);
    
    result.success = true;
    result.outputFiles.push(outputPath);
    ErrorHandler.logInfo(`Web export successful: ${outputPath}`);

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    ErrorHandler.logError(`Web export failed: ${result.error}`);
  }

  result.duration = Date.now() - startTime;
  return result;
}

async function testPremiumStrategy(diagram: string, options: ExportOptions, outputFolder: string, context: vscode.ExtensionContext, style: string): Promise<DebugResult> {
  const startTime = Date.now();
  const result: DebugResult = {
    strategy: 'Premium',
    success: false,
    duration: 0,
    outputFiles: []
  };

  try {
    await fs.promises.mkdir(outputFolder, { recursive: true });
    
    const enhancementManager = new VisualEnhancementManager(context);
    const webStrategy = new WebExportStrategy(context);
    
    // Create enhanced options
    const enhancementOptions = {
      enabled: true,
      style: style as any,
      animations: false,
      customPalette: true,
      typography: 'premium' as any,
      effects: 'subtle' as any,
      iconSet: 'feather' as any
    };
    
    const enhancedExportOptions = enhancementManager.enhanceExportOptions({
      ...options,
      mermaidConfig: {}
    });
    
    // Export with enhanced options
    const buffer = await webStrategy.export(diagram, enhancedExportOptions);
    
    // For SVG exports, apply post-processing enhancements
    let finalBuffer = buffer;
    if (enhancedExportOptions.format === 'svg') {
      const svgContent = buffer.toString('utf-8');
      const enhancedSvg = await enhancementManager.postProcessSvg(svgContent, enhancementOptions);
      finalBuffer = Buffer.from(enhancedSvg, 'utf-8');
    }
    
    // Save output file
    const outputPath = path.join(outputFolder, `diagram.${options.format}`);
    await fs.promises.writeFile(outputPath, finalBuffer);
    
    result.success = true;
    result.outputFiles.push(outputPath);
    result.version = `Premium ${style} style`;
    ErrorHandler.logInfo(`Premium ${style} export successful: ${outputPath}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.error = `Premium ${style} export failed: ${errorMessage}`;
    ErrorHandler.logError(`Premium ${style} export failed: ${result.error}`);
  }

  result.duration = Date.now() - startTime;
  return result;
}

async function generateDebugReport(debugRoot: string, diagrams: Array<{name: string, simple: string, complex: string}>, options: ExportOptions, results: DebugResult[]): Promise<void> {
  const reportPath = path.join(debugRoot, 'debug.md');
  
  let report = `# Mermaid Export Pro - Comprehensive Debug Report

**Timestamp**: ${new Date().toISOString()}

**Test Coverage**: ${diagrams.length} diagram types × 2 complexity levels × 3 formats × 2 strategies

**Strategies Tested**: 
- CLI Export (using @mermaid-js/mermaid-cli)
- Web Export (VS Code webview + mermaid.js)

`;

  // Add each test diagram with both versions
  for (const diagram of diagrams) {
    report += `## ${diagram.name.charAt(0).toUpperCase() + diagram.name.slice(1)} Test Diagrams

### Simple Version
\`\`\`mermaid
${diagram.simple}
\`\`\`

### Complex Version  
\`\`\`mermaid
${diagram.complex}
\`\`\`

`;
  }

  report += `**Export Options**:
- Formats: SVG, PNG, JPG
- Theme: ${options.theme}
- Dimensions: ${options.width}x${options.height}
- Background: ${options.backgroundColor}

## Results Summary

`;

  // Group results by diagram type
  const diagramTypes = diagrams.map(d => d.name);
  for (const diagramType of diagramTypes) {
    report += `## ${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)} Results

`;
    
    const diagramResults = results.filter(r => r.strategy.includes(diagramType));
    for (const result of diagramResults) {
      report += `### ${result.strategy.replace(` - ${diagramType}`, '')} Strategy

- **Status**: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}
- **Duration**: ${result.duration}ms
- **Version**: ${result.version || 'N/A'}
`;

      if (result.error) {
        report += `- **Error**: ${result.error}\n`;
      }

      if (result.outputFiles.length > 0) {
        report += `- **Output Files**:\n`;
        for (const file of result.outputFiles) {
          const stats = await fs.promises.stat(file).catch(() => null);
          report += `  - ${path.basename(file)} (${stats?.size || 0} bytes)\n`;
        }
      }

      report += '\n';
    }
  }

  report += `## Performance Comparison

| Diagram Type | CLI SVG | Web SVG | CLI PNG | Web PNG | CLI JPG | Web JPG |
|-------------|---------|---------|---------|---------|---------|---------|
`;

  for (const diagramType of diagramTypes) {
    const typeResults = results.filter(r => r.strategy.includes(diagramType));
    const cliSvg = typeResults.find(r => r.strategy.includes('CLI (SVG)'));
    const webSvg = typeResults.find(r => r.strategy.includes('Web (SVG)'));
    const cliPng = typeResults.find(r => r.strategy.includes('CLI (PNG)'));
    const webPng = typeResults.find(r => r.strategy.includes('Web (PNG)'));
    const cliJpg = typeResults.find(r => r.strategy.includes('CLI (JPG)'));
    const webJpg = typeResults.find(r => r.strategy.includes('Web (JPG)'));
    
    report += `| ${diagramType} | ${cliSvg?.success ? cliSvg.duration + 'ms' : '❌'} | ${webSvg?.success ? webSvg.duration + 'ms' : '❌'} | ${cliPng?.success ? cliPng.duration + 'ms' : '❌'} | ${webPng?.success ? webPng.duration + 'ms' : '❌'} | ${cliJpg?.success ? cliJpg.duration + 'ms' : '❌'} | ${webJpg?.success ? webJpg.duration + 'ms' : '❌'} |\n`;
  }

  report += `

## Quick Commands

To inspect files manually:
\`\`\`bash
# Windows PowerShell
Get-ChildItem -Recurse "${debugRoot}" -Include "*.svg","*.png","*.jpg"

# Mac/Linux  
find "${debugRoot}" -name "*.svg" -o -name "*.png" -o -name "*.jpg"
\`\`\`

## Next Steps

1. **If CLI failed**: Install @mermaid-js/mermaid-cli globally or locally
2. **If Web failed**: Check VS Code webview support and browser security  
3. **If both succeeded**: Compare output quality and file sizes
4. **Format Issues**: PNG/JPG require proper canvas support in webview

`;


  await fs.promises.writeFile(reportPath, report, 'utf8');
  ErrorHandler.logInfo(`Debug report generated: ${reportPath}`);
}