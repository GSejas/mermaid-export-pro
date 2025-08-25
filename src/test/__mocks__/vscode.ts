// Mock implementation of VS Code API for unit tests
export enum StatusBarAlignment {
  Left = 1,
  Right = 2
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3
}

export class ThemeColor {
  constructor(public id: string) {}
}

export interface StatusBarItem {
  text: string;
  tooltip?: string;
  command?: string;
  color?: ThemeColor;
  backgroundColor?: ThemeColor;
  show(): void;
  hide(): void;
  dispose(): void;
}

export interface OutputChannel {
  append(value: string): void;
  show(): void;
  dispose(): void;
}

export interface WorkspaceConfiguration {
  get<T>(section: string, defaultValue?: T): T;
  update(section: string, value: any, configurationTarget?: ConfigurationTarget): Promise<void>;
}

export interface TextDocument {
  fileName: string;
  getText(): string;
}

export interface TextEditor {
  document: TextDocument;
}

export interface ExtensionContext {
  subscriptions: { dispose(): void }[];
  globalState: {
    get<T>(key: string, defaultValue?: T): T;
    update(key: string, value: any): Promise<void>;
  };
  extensionMode: ExtensionMode;
}

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
}

export const window = {
  createStatusBarItem: (alignment: StatusBarAlignment = StatusBarAlignment.Right, priority?: number): StatusBarItem => ({
    text: '',
    tooltip: '',
    command: '',
    color: undefined,
    backgroundColor: undefined,
    show: () => {},
    hide: () => {},
    dispose: () => {}
  }),
  
  showInformationMessage: <T extends string>(message: string, ...items: T[]): Promise<T | undefined> => 
    Promise.resolve(items[0]),
    
  showWarningMessage: <T extends string>(message: string, ...items: T[]): Promise<T | undefined> => 
    Promise.resolve(items[0]),
    
  showQuickPick: <T extends QuickPickItem>(items: T[], options?: any): Promise<T | undefined> => 
    Promise.resolve(items[0]),
    
  createOutputChannel: (name: string): OutputChannel => ({
    append: () => {},
    show: () => {},
    dispose: () => {}
  }),
  
  activeTextEditor: undefined as TextEditor | undefined
};

export const workspace = {
  getConfiguration: (section?: string): WorkspaceConfiguration => ({
    get: <T>(key: string, defaultValue?: T): T => defaultValue as T,
    update: (key: string, value: any, target?: ConfigurationTarget) => Promise.resolve()
  }),
  
  onDidChangeTextDocument: () => ({ dispose: () => {} })
};

export const commands = {
  executeCommand: (command: string, ...args: any[]) => Promise.resolve()
};

// Mock disposable for subscriptions
export const mockDisposable = { dispose: () => {} };