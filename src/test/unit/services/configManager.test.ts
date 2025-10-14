/**
 * Unit tests for ConfigManager
 * 
 * Tests the configuration management service including reading, updating,
 * and watching VS Code workspace settings.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigManager } from '../../../services/configManager';
import * as vscode from 'vscode';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockConfig: any;
  let configUpdateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    configUpdateMock = vi.fn().mockResolvedValue(undefined);
    
    mockConfig = {
      get: vi.fn((key: string, defaultValue: any) => defaultValue),
      update: configUpdateMock
    };

    vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(mockConfig);
    
    configManager = new ConfigManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration Getters', () => {
    it('should return default format when configured', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'defaultFormat') {return 'svg';}
        return defaultValue;
      });

      const format = configManager.getDefaultFormat();
      
      expect(format).toBe('svg');
      expect(mockConfig.get).toHaveBeenCalledWith('defaultFormat', 'png');
    });

    it('should return default format "png" when not configured', () => {
      const format = configManager.getDefaultFormat();
      
      expect(format).toBe('png');
      expect(mockConfig.get).toHaveBeenCalledWith('defaultFormat', 'png');
    });

    it('should return theme when configured', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'theme') {return 'dark';}
        return defaultValue;
      });

      const theme = configManager.getTheme();
      
      expect(theme).toBe('dark');
      expect(mockConfig.get).toHaveBeenCalledWith('theme', 'default');
    });

    it('should return default theme "default" when not configured', () => {
      const theme = configManager.getTheme();
      
      expect(theme).toBe('default');
      expect(mockConfig.get).toHaveBeenCalledWith('theme', 'default');
    });

    it('should return output directory when configured', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'outputDirectory') {return './output';}
        return defaultValue;
      });

      const dir = configManager.getOutputDirectory();
      
      expect(dir).toBe('./output');
      expect(mockConfig.get).toHaveBeenCalledWith('outputDirectory', '');
    });

    it('should return empty string for output directory when not configured', () => {
      const dir = configManager.getOutputDirectory();
      
      expect(dir).toBe('');
      expect(mockConfig.get).toHaveBeenCalledWith('outputDirectory', '');
    });

    it('should return auto export enabled status', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'autoExport') {return true;}
        return defaultValue;
      });

      const enabled = configManager.isAutoExportEnabled();
      
      expect(enabled).toBe(true);
      expect(mockConfig.get).toHaveBeenCalledWith('autoExport', false);
    });

    it('should return false for auto export when not configured', () => {
      const enabled = configManager.isAutoExportEnabled();
      
      expect(enabled).toBe(false);
      expect(mockConfig.get).toHaveBeenCalledWith('autoExport', false);
    });

    it('should return export strategy when configured', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'exportStrategy') {return 'cli';}
        return defaultValue;
      });

      const strategy = configManager.getExportStrategy();
      
      expect(strategy).toBe('cli');
      expect(mockConfig.get).toHaveBeenCalledWith('exportStrategy', 'auto');
    });

    it('should return "auto" for export strategy when not configured', () => {
      const strategy = configManager.getExportStrategy();
      
      expect(strategy).toBe('auto');
      expect(mockConfig.get).toHaveBeenCalledWith('exportStrategy', 'auto');
    });

    it('should return default width when configured', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'width') {return 1024;}
        return defaultValue;
      });

      const width = configManager.getDefaultWidth();
      
      expect(width).toBe(1024);
      expect(mockConfig.get).toHaveBeenCalledWith('width', 800);
    });

    it('should return 800 for default width when not configured', () => {
      const width = configManager.getDefaultWidth();
      
      expect(width).toBe(800);
      expect(mockConfig.get).toHaveBeenCalledWith('width', 800);
    });

    it('should return default height when configured', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'height') {return 768;}
        return defaultValue;
      });

      const height = configManager.getDefaultHeight();
      
      expect(height).toBe(768);
      expect(mockConfig.get).toHaveBeenCalledWith('height', 600);
    });

    it('should return 600 for default height when not configured', () => {
      const height = configManager.getDefaultHeight();
      
      expect(height).toBe(600);
      expect(mockConfig.get).toHaveBeenCalledWith('height', 600);
    });

    it('should return background color when configured', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'backgroundColor') {return 'white';}
        return defaultValue;
      });

      const color = configManager.getBackgroundColor();
      
      expect(color).toBe('white');
      expect(mockConfig.get).toHaveBeenCalledWith('backgroundColor', 'transparent');
    });

    it('should return "transparent" for background color when not configured', () => {
      const color = configManager.getBackgroundColor();
      
      expect(color).toBe('transparent');
      expect(mockConfig.get).toHaveBeenCalledWith('backgroundColor', 'transparent');
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration with global target by default', async () => {
      await configManager.updateConfiguration('defaultFormat', 'svg');

      expect(configUpdateMock).toHaveBeenCalledWith('defaultFormat', 'svg', vscode.ConfigurationTarget.Global);
    });

    it('should update configuration with specified target', async () => {
      await configManager.updateConfiguration('defaultFormat', 'png', vscode.ConfigurationTarget.Workspace);

      expect(configUpdateMock).toHaveBeenCalledWith('defaultFormat', 'png', vscode.ConfigurationTarget.Workspace);
    });

    it('should handle boolean values', async () => {
      await configManager.updateConfiguration('autoExport', true);

      expect(configUpdateMock).toHaveBeenCalledWith('autoExport', true, vscode.ConfigurationTarget.Global);
    });

    it('should handle number values', async () => {
      await configManager.updateConfiguration('width', 1920);

      expect(configUpdateMock).toHaveBeenCalledWith('width', 1920, vscode.ConfigurationTarget.Global);
    });

    it('should handle string values', async () => {
      await configManager.updateConfiguration('outputDirectory', '/path/to/output');

      expect(configUpdateMock).toHaveBeenCalledWith('outputDirectory', '/path/to/output', vscode.ConfigurationTarget.Global);
    });

    it('should handle complex object values', async () => {
      const complexValue = { nested: { value: 'test' } };
      await configManager.updateConfiguration('customSetting', complexValue);

      expect(configUpdateMock).toHaveBeenCalledWith('customSetting', complexValue, vscode.ConfigurationTarget.Global);
    });

    it('should propagate update errors', async () => {
      const updateError = new Error('Update failed');
      configUpdateMock.mockRejectedValueOnce(updateError);

      await expect(configManager.updateConfiguration('defaultFormat', 'svg')).rejects.toThrow('Update failed');
    });
  });

  describe('Configuration Change Watching', () => {
    it('should register configuration change listener', () => {
      const callback = vi.fn();
      const mockDisposable = { dispose: vi.fn() };
      const mockOnDidChange = vi.fn().mockReturnValue(mockDisposable);
      
      vi.spyOn(vscode.workspace, 'onDidChangeConfiguration').mockImplementation(mockOnDidChange);

      const disposable = configManager.onConfigurationChanged(callback);

      expect(mockOnDidChange).toHaveBeenCalled();
      expect(disposable).toBe(mockDisposable);
    });

    it('should call callback when mermaidExportPro configuration changes', () => {
      const callback = vi.fn();
      let registeredCallback: any;
      
      vi.spyOn(vscode.workspace, 'onDidChangeConfiguration').mockImplementation((cb) => {
        registeredCallback = cb;
        return { dispose: vi.fn() };
      });

      configManager.onConfigurationChanged(callback);

      // Simulate configuration change event for mermaidExportPro
      const mockEvent = {
        affectsConfiguration: vi.fn((section: string) => section === 'mermaidExportPro')
      };
      
      registeredCallback(mockEvent);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockEvent.affectsConfiguration).toHaveBeenCalledWith('mermaidExportPro');
    });

    it('should not call callback when other configuration changes', () => {
      const callback = vi.fn();
      let registeredCallback: any;
      
      vi.spyOn(vscode.workspace, 'onDidChangeConfiguration').mockImplementation((cb) => {
        registeredCallback = cb;
        return { dispose: vi.fn() };
      });

      configManager.onConfigurationChanged(callback);

      // Simulate configuration change event for different extension
      const mockEvent = {
        affectsConfiguration: vi.fn((section: string) => section === 'otherExtension')
      };
      
      registeredCallback(mockEvent);

      expect(callback).not.toHaveBeenCalled();
      expect(mockEvent.affectsConfiguration).toHaveBeenCalledWith('mermaidExportPro');
    });

    it('should allow disposing the listener', () => {
      const callback = vi.fn();
      const disposeMock = vi.fn();
      
      vi.spyOn(vscode.workspace, 'onDidChangeConfiguration').mockReturnValue({ dispose: disposeMock });

      const disposable = configManager.onConfigurationChanged(callback);
      disposable.dispose();

      expect(disposeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support complete update and read cycle', async () => {
      // Initial read with defaults
      expect(configManager.getDefaultFormat()).toBe('png');

      // Simulate configuration update
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'defaultFormat') {return 'svg';}
        return defaultValue;
      });

      await configManager.updateConfiguration('defaultFormat', 'svg');

      // Read updated value
      expect(configManager.getDefaultFormat()).toBe('svg');
      expect(configUpdateMock).toHaveBeenCalledWith('defaultFormat', 'svg', vscode.ConfigurationTarget.Global);
    });

    it('should handle multiple configuration reads efficiently', () => {
      // Multiple reads should not cause issues
      expect(configManager.getDefaultFormat()).toBe('png');
      expect(configManager.getTheme()).toBe('default');
      expect(configManager.getOutputDirectory()).toBe('');
      expect(configManager.isAutoExportEnabled()).toBe(false);
      expect(configManager.getExportStrategy()).toBe('auto');
      expect(configManager.getDefaultWidth()).toBe(800);
      expect(configManager.getDefaultHeight()).toBe(600);
      expect(configManager.getBackgroundColor()).toBe('transparent');

      // Each get should have been called with correct defaults
      expect(mockConfig.get).toHaveBeenCalledTimes(8);
    });

    it('should handle configuration changes during active use', async () => {
      const callback = vi.fn();
      let registeredCallback: any;
      
      vi.spyOn(vscode.workspace, 'onDidChangeConfiguration').mockImplementation((cb) => {
        registeredCallback = cb;
        return { dispose: vi.fn() };
      });

      configManager.onConfigurationChanged(callback);

      // Simulate multiple configuration changes
      const mockEvent = {
        affectsConfiguration: vi.fn((section: string) => section === 'mermaidExportPro')
      };
      
      registeredCallback(mockEvent);
      registeredCallback(mockEvent);
      registeredCallback(mockEvent);

      expect(callback).toHaveBeenCalledTimes(3);
    });
  });
});
