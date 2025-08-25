import * as vscode from 'vscode';
import { ConfigurationManager, ExportFormat, MermaidTheme, ExportStrategyType } from '../types';

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
    return this.getConfiguration().get<string>('backgroundColor', 'white');
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