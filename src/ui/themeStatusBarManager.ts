/**
 * Theme Status Bar Manager - Mermaid theme cycling interface
 * 
 * Purpose: Visual theme management with one-click cycling
 */

import * as vscode from 'vscode';
import { MermaidTheme } from '../types';

export class ThemeStatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private context: vscode.ExtensionContext;
  
  // Debounce mechanism for notifications
  private notificationTimer: NodeJS.Timeout | undefined;
  private readonly NOTIFICATION_DEBOUNCE_MS = 3000;

  // Mermaid theme cycling order
  private readonly THEME_CYCLE: MermaidTheme[] = ['default', 'dark', 'forest', 'neutral'];
  
  // Theme icon mapping
  private readonly THEME_ICONS = {
    default: '$(symbol-color)',     // Colorful - represents default vibrancy
    dark: '$(color-mode)',               // Universal dark mode symbol  
    forest: '$(squirrel)',             // Nature/organic feel
    neutral: '$(circle-outline)'   // Minimal/clean
  };

  // Theme display names for tooltips
  private readonly THEME_NAMES = {
    default: 'Default',
    dark: 'Dark Mode', 
    forest: 'Forest',
    neutral: 'Neutral'
  };

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    
    // Create status bar item (right side, adjacent to main status)
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      199 // Priority - theme status bar (right of main, grouped together)
    );
    
    // Register click command
    this.statusBarItem.command = 'mermaidExportPro.cycleTheme';
    
    // Add to disposal
    context.subscriptions.push(this.statusBarItem);
    
    // Listen for active editor changes to show/hide
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.updateVisibility();
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) {
          this.updateVisibility();
        }
      })
    );
    
    // Initial setup
    this.updateThemeDisplay();
    this.updateVisibility();
  }

  /**
   * Cycle to next theme in sequence
   */
  async cycleTheme(): Promise<void> {
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    const currentTheme = config.get<MermaidTheme>('theme', 'default');
    
    // Find current index and get next theme
    const currentIndex = this.THEME_CYCLE.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % this.THEME_CYCLE.length;
    const nextTheme = this.THEME_CYCLE[nextIndex];
    
    // Update configuration
    await config.update('theme', nextTheme, vscode.ConfigurationTarget.Workspace);
    
    // Update display immediately
    this.updateThemeDisplay();
    
    // Debounced notification to prevent spam
    this.showDebouncedNotification(currentTheme, nextTheme);
  }

  /**
   * Show debounced notification to prevent spam when rapidly cycling themes
   */
  private showDebouncedNotification(fromTheme: MermaidTheme, toTheme: MermaidTheme): void {
    // Clear any existing timer
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
    
    // Set new timer
    this.notificationTimer = setTimeout(() => {
      const fromName = this.THEME_NAMES[fromTheme];
      const toName = this.THEME_NAMES[toTheme];
      vscode.window.showInformationMessage(
        `Mermaid theme: ${toName}`,
        { modal: false }
      );
      this.notificationTimer = undefined;
    }, this.NOTIFICATION_DEBOUNCE_MS);
  }

  /**
   * Update the visual appearance based on current theme
   */
  private updateThemeDisplay(): void {
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    const currentTheme = config.get<MermaidTheme>('theme', 'default');
    const nextTheme = this.getNextTheme(currentTheme);
    
    // Get icon and names
    const currentIcon = this.THEME_ICONS[currentTheme];
    const currentName = this.THEME_NAMES[currentTheme];
    const nextName = this.THEME_NAMES[nextTheme];
    
    // Update status bar
    this.statusBarItem.text = currentIcon;
    this.statusBarItem.tooltip = `Mermaid Theme: ${currentName} • Click to cycle → ${nextName}`;
    
    // Use default status bar color
    this.statusBarItem.color = undefined;
    
    // Ensure status bar remains visible if we have mermaid content
    if (this.hasMermaidContent()) {
      this.statusBarItem.show();
    }
  }

  /**
   * Get next theme in cycle
   */
  private getNextTheme(currentTheme: MermaidTheme): MermaidTheme {
    const currentIndex = this.THEME_CYCLE.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % this.THEME_CYCLE.length;
    return this.THEME_CYCLE[nextIndex];
  }

  /**
   * Check if current file has mermaid content
   */
  private hasMermaidContent(): boolean {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return false;
    }

    const document = editor.document;
    const fileName = document.fileName.toLowerCase();
    
    // Check file extension
    if (fileName.endsWith('.mmd')) {
      return document.getText().trim().length > 0;
    }
    
    // Check for markdown files with mermaid content
    if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
      const content = document.getText();
      return /```\s*mermaid[\s\S]*?```/gi.test(content);
    }
    
    return false;
  }

  /**
   * Update visibility based on current editor
   */
  private updateVisibility(): void {
    if (this.hasMermaidContent()) {
      this.updateThemeDisplay(); // Ensure text and styling is set
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * Get current theme (public method)
   */
  getCurrentTheme(): MermaidTheme {
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    return config.get<MermaidTheme>('theme', 'default');
  }

  /**
   * Set theme programmatically
   */
  async setTheme(theme: MermaidTheme): Promise<void> {
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    await config.update('theme', theme, vscode.ConfigurationTarget.Workspace);
    this.updateThemeDisplay();
  }

  /**
   * Refresh display (for external calls)
   */
  refresh(): void {
    this.updateThemeDisplay();
    this.updateVisibility();
  }

  /**
   * Handle configuration changes
   */
  onConfigurationChanged(): void {
    this.updateThemeDisplay();
  }

  /**
   * Dispose of the status bar item
   */
  dispose(): void {
    // Clear any pending notification timer
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
      this.notificationTimer = undefined;
    }
    
    this.statusBarItem.dispose();
  }
}