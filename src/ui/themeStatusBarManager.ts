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

  // Mermaid theme cycling order
  private readonly THEME_CYCLE: MermaidTheme[] = ['default', 'dark', 'forest', 'neutral'];
  
  // Theme icon mapping
  private readonly THEME_ICONS = {
    default: '$(symbol-color)',     // Colorful - represents default vibrancy
    dark: '$(moon)',               // Universal dark mode symbol  
    forest: '$(tree)',             // Nature/organic feel
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
    
    // Create status bar item (right side, after main mermaid status)
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      99 // Priority - right of main status bar
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
    
    // Update display
    this.updateThemeDisplay();
    
    // Show brief confirmation
    const currentName = this.THEME_NAMES[currentTheme];
    const nextName = this.THEME_NAMES[nextTheme];
    vscode.window.showInformationMessage(
      `Mermaid theme changed: ${currentName} → ${nextName}`,
      { modal: false }
    );
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
    
    // Add subtle color theming
    switch (currentTheme) {
      case 'dark':
        this.statusBarItem.color = new vscode.ThemeColor('charts.purple');
        break;
      case 'forest':
        this.statusBarItem.color = new vscode.ThemeColor('charts.green');
        break;
      case 'neutral':
        this.statusBarItem.color = new vscode.ThemeColor('charts.gray');
        break;
      default:
        this.statusBarItem.color = new vscode.ThemeColor('charts.blue');
        break;
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
      return /```mermaid\s*([\s\S]*?)\s*```/.test(content);
    }
    
    return false;
  }

  /**
   * Update visibility based on current editor
   */
  private updateVisibility(): void {
    if (this.hasMermaidContent()) {
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
    this.statusBarItem.dispose();
  }
}