import * as vscode from 'vscode';
import { ConfigurationManager, ExportFormat, MermaidTheme, ExportStrategyType } from '../types';

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
export class ConfigManager implements ConfigurationManager {
  private static readonly EXTENSION_ID = 'mermaidExportPro';

  private getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(ConfigManager.EXTENSION_ID);
  }

  getDefaultFormat(): ExportFormat {
    return this.getConfiguration().get<ExportFormat>('defaultFormat', 'png');
  }

  getTheme(): MermaidTheme {
    return this.getConfiguration().get<MermaidTheme>('theme', 'default');
  }

  getOutputDirectory(): string {
    return this.getConfiguration().get<string>('outputDirectory', '');
  }

  isAutoExportEnabled(): boolean {
    return this.getConfiguration().get<boolean>('autoExport', false);
  }

  getExportStrategy(): ExportStrategyType {
    return this.getConfiguration().get<ExportStrategyType>('exportStrategy', 'auto');
  }

  getDefaultWidth(): number {
    return this.getConfiguration().get<number>('width', 800);
  }

  getDefaultHeight(): number {
    return this.getConfiguration().get<number>('height', 600);
  }

  getBackgroundColor(): string {
    return this.getConfiguration().get<string>('backgroundColor', 'transparent');
  }

  async updateConfiguration<T>(key: string, value: T, target?: vscode.ConfigurationTarget): Promise<void> {
    const config = this.getConfiguration();
    await config.update(key, value, target ?? vscode.ConfigurationTarget.Global);
  }

  onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(ConfigManager.EXTENSION_ID)) {
        callback();
      }
    });
  }
}