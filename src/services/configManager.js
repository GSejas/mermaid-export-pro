"use strict";
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
exports.ConfigManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Manages reading, updating, and watching the extension configuration for "mermaidExportPro".
 *
 * This class provides typed, single-responsibility accessors for the extension's settings and
 * encapsulates reading from VS Code's workspace configuration, applying sensible defaults when a
 * setting is not present. It also exposes helper methods to update configuration values and to
 * subscribe to configuration change events relevant to the extension.
 *
 * Configuration keys accessed (with defaults used when not present):
 * - "defaultFormat" -> ExportFormat (default: "png")
 * - "theme" -> MermaidTheme (default: "default")
 * - "outputDirectory" -> string (default: "")
 * - "autoExport" -> boolean (default: false)
 * - "exportStrategy" -> ExportStrategyType (default: "auto")
 * - "width" -> number (default: 800)
 * - "height" -> number (default: 600)
 * - "backgroundColor" -> string (default: "transparent")
 *
 * @remarks
 * - All getters read from the workspace configuration section named "mermaidExportPro".
 * - updateConfiguration writes a value either globally or to the provided ConfigurationTarget.
 * - onConfigurationChanged filters configuration change events so the provided callback runs only
 *   when settings under the extension's configuration section change.
 *
 * @example
 * const cfg = new ConfigManager();
 * const format = cfg.getDefaultFormat(); // e.g. "png"
 * await cfg.updateConfiguration("outputDirectory", "out/images");
 * const disposable = cfg.onConfigurationChanged(() => {
 *   // react to configuration updates
 *   console.log("mermaidExportPro settings changed");
 * });
 *
 * @public
 *
 * @internalRemarks
 * The class contains a private static EXTENSION_ID = "mermaidExportPro" used to scope reads/updates
 * and to test affected configuration on change events.
 *
 * Method summaries:
 * - getDefaultFormat(): ExportFormat — returns the configured export format or "png".
 * - getTheme(): MermaidTheme — returns the configured Mermaid theme or "default".
 * - getOutputDirectory(): string — returns the configured output directory or an empty string.
 * - isAutoExportEnabled(): boolean — returns whether automatic export is enabled.
 * - getExportStrategy(): ExportStrategyType — returns the configured export strategy or "auto".
 * - getDefaultWidth(): number — returns the default width (pixels) used for exports.
 * - getDefaultHeight(): number — returns the default height (pixels) used for exports.
 * - getBackgroundColor(): string — returns the configured background color or "transparent".
 *
 * @param updateConfiguration.key - The configuration key (relative to "mermaidExportPro") to update.
 * @param updateConfiguration.value - The value to write for the given key.
 * @param updateConfiguration.target - Optional VS Code ConfigurationTarget (defaults to Global).
 * @returns For updateConfiguration: Promise<void> that resolves when the update completes.
 *
 * @param onConfigurationChanged.callback - Callback invoked when the "mermaidExportPro" configuration changes.
 * @returns For onConfigurationChanged: vscode.Disposable to unregister the listener.
 */
class ConfigManager {
    static EXTENSION_ID = 'mermaidExportPro';
    getConfiguration() {
        return vscode.workspace.getConfiguration(ConfigManager.EXTENSION_ID);
    }
    getDefaultFormat() {
        return this.getConfiguration().get('defaultFormat', 'png');
    }
    getTheme() {
        return this.getConfiguration().get('theme', 'default');
    }
    getOutputDirectory() {
        return this.getConfiguration().get('outputDirectory', '');
    }
    isAutoExportEnabled() {
        return this.getConfiguration().get('autoExport', false);
    }
    getExportStrategy() {
        return this.getConfiguration().get('exportStrategy', 'auto');
    }
    getDefaultWidth() {
        return this.getConfiguration().get('width', 800);
    }
    getDefaultHeight() {
        return this.getConfiguration().get('height', 600);
    }
    getBackgroundColor() {
        return this.getConfiguration().get('backgroundColor', 'transparent');
    }
    async updateConfiguration(key, value, target) {
        const config = this.getConfiguration();
        await config.update(key, value, target ?? vscode.ConfigurationTarget.Global);
    }
    onConfigurationChanged(callback) {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(ConfigManager.EXTENSION_ID)) {
                callback();
            }
        });
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=configManager.js.map