"use strict";
/**
 * Theme Status Bar Manager - Mermaid theme cycling interface
 *
 * Purpose: Visual theme management with one-click cycling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeStatusBarManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Status bar item that displays the current Mermaid theme and provides quick access to theme-related actions.
 *
 * The item is created by the ThemeStatusBarManager (typically via vscode.window.createStatusBarItem),
 * updated whenever the active theme or relevant configuration changes, and disposed when the manager is
 * disposed. Its text, tooltip and command are controlled by the manager; callers should not mutate it
 * directly and should guard against it being uninitialized before use.
 *
 * @remarks
 * - Managed lifecycle: create -> show/update -> hide/dispose.
 * - Intended to be visible only when the extension is active and theme information is available.
 *
 * @see {@link https://code.visualstudio.com/api/references/vscode-api#StatusBarItem}
 */
class ThemeStatusBarManager {
    statusBarItem;
    context;
    // Debounce mechanism for notifications
    notificationTimer;
    NOTIFICATION_DEBOUNCE_MS = 3000;
    // Mermaid theme cycling order
    THEME_CYCLE = ['default', 'dark', 'forest', 'neutral'];
    // Theme icon mapping
    THEME_ICONS = {
        default: '$(symbol-color)', // Colorful - represents default vibrancy
        dark: '$(color-mode)', // Universal dark mode symbol  
        forest: '$(squirrel)', // Nature/organic feel
        neutral: '$(circle-outline)' // Minimal/clean
    };
    // Theme display names for tooltips
    THEME_NAMES = {
        default: 'Default',
        dark: 'Dark Mode',
        forest: 'Forest',
        neutral: 'Neutral'
    };
    constructor(context) {
        this.context = context;
        // Create status bar item (right side, adjacent to main status)
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 199 // Priority - theme status bar (right of main, grouped together)
        );
        // Register click command
        this.statusBarItem.command = 'mermaidExportPro.cycleTheme';
        // Add to disposal
        context.subscriptions.push(this.statusBarItem);
        // Listen for active editor changes to show/hide
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
            this.updateVisibility();
        }), vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document === vscode.window.activeTextEditor?.document) {
                this.updateVisibility();
            }
        }));
        // Initial setup
        this.updateThemeDisplay();
        this.updateVisibility();
    }
    /**
     * Cycle to next theme in sequence
     */
    async cycleTheme() {
        const config = vscode.workspace.getConfiguration('mermaidExportPro');
        const currentTheme = config.get('theme', 'default');
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
    showDebouncedNotification(fromTheme, toTheme) {
        // Clear any existing timer
        if (this.notificationTimer) {
            clearTimeout(this.notificationTimer);
        }
        // Set new timer
        this.notificationTimer = setTimeout(() => {
            const fromName = this.THEME_NAMES[fromTheme];
            const toName = this.THEME_NAMES[toTheme];
            vscode.window.showInformationMessage(`Mermaid theme: ${toName}`, { modal: false });
            this.notificationTimer = undefined;
        }, this.NOTIFICATION_DEBOUNCE_MS);
    }
    /**
     * Update the visual appearance based on current theme
     */
    updateThemeDisplay() {
        const config = vscode.workspace.getConfiguration('mermaidExportPro');
        const currentTheme = config.get('theme', 'default');
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
    getNextTheme(currentTheme) {
        const currentIndex = this.THEME_CYCLE.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % this.THEME_CYCLE.length;
        return this.THEME_CYCLE[nextIndex];
    }
    /**
     * Check if current file has mermaid content
     */
    hasMermaidContent() {
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
    updateVisibility() {
        if (this.hasMermaidContent()) {
            this.updateThemeDisplay(); // Ensure text and styling is set
            this.statusBarItem.show();
        }
        else {
            this.statusBarItem.hide();
        }
    }
    /**
     * Get current theme (public method)
     */
    getCurrentTheme() {
        const config = vscode.workspace.getConfiguration('mermaidExportPro');
        return config.get('theme', 'default');
    }
    /**
     * Set theme programmatically
     */
    async setTheme(theme) {
        const config = vscode.workspace.getConfiguration('mermaidExportPro');
        await config.update('theme', theme, vscode.ConfigurationTarget.Workspace);
        this.updateThemeDisplay();
    }
    /**
     * Refresh display (for external calls)
     */
    refresh() {
        this.updateThemeDisplay();
        this.updateVisibility();
    }
    /**
     * Handle configuration changes
     */
    onConfigurationChanged() {
        this.updateThemeDisplay();
    }
    /**
     * Dispose of the status bar item
     */
    dispose() {
        // Clear any pending notification timer
        if (this.notificationTimer) {
            clearTimeout(this.notificationTimer);
            this.notificationTimer = undefined;
        }
        this.statusBarItem.dispose();
    }
}
exports.ThemeStatusBarManager = ThemeStatusBarManager;
//# sourceMappingURL=themeStatusBarManager.js.map