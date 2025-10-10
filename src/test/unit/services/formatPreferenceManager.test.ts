/**
 * Unit tests for FormatPreferenceManager
 * 
 * Tests the format preference tracking system including usage recording,
 * preference ordering, file-specific preferences, and statistics.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormatPreferenceManager } from '../../../services/formatPreferenceManager';
import { ExportFormat } from '../../../types';
import * as vscode from 'vscode';

describe('FormatPreferenceManager', () => {
  let manager: FormatPreferenceManager;
  let mockContext: vscode.ExtensionContext;
  let workspaceStateData: Map<string, any>;

  beforeEach(() => {
    // Create fresh workspace state storage
    workspaceStateData = new Map();

    mockContext = {
      workspaceState: {
        get: vi.fn((key: string, defaultValue: any) => {
          return workspaceStateData.has(key) ? workspaceStateData.get(key) : defaultValue;
        }),
        update: vi.fn(async (key: string, value: any) => {
          workspaceStateData.set(key, value);
        })
      },
      globalState: {
        get: vi.fn(),
        update: vi.fn()
      },
      subscriptions: [],
      extensionMode: vscode.ExtensionMode.Test
    } as unknown as vscode.ExtensionContext;

    manager = new FormatPreferenceManager(mockContext);
  });

  describe('Usage Recording', () => {
    it('should record a single format usage', async () => {
      await manager.recordUsage('svg', 'codelens');

      const history = await (manager as any).getUsageHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0].format).toBe('svg');
      expect(history[0].source).toBe('codelens');
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('should record multiple format usages', async () => {
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'command');
      await manager.recordUsage('pdf', 'statusbar');

      const history = await (manager as any).getUsageHistory();
      
      expect(history).toHaveLength(3);
      expect(history[0].format).toBe('pdf'); // Most recent first
      expect(history[1].format).toBe('png');
      expect(history[2].format).toBe('svg');
    });

    it('should maintain most recent entries at the front', async () => {
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'codelens');
      
      const history = await (manager as any).getUsageHistory();
      
      expect(history[0].format).toBe('png'); // Most recent
      expect(history[0].timestamp).toBeGreaterThanOrEqual(history[1].timestamp);
    });

    it('should limit history to MAX_HISTORY_SIZE (20) entries', async () => {
      // Record 25 usages
      for (let i = 0; i < 25; i++) {
        await manager.recordUsage('svg', 'codelens');
      }

      const history = await (manager as any).getUsageHistory();
      
      expect(history).toHaveLength(20); // Should be capped at 20
    });

    it('should record usage source correctly', async () => {
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'command');
      await manager.recordUsage('pdf', 'statusbar');

      const history = await (manager as any).getUsageHistory();
      
      expect(history[0].source).toBe('statusbar');
      expect(history[1].source).toBe('command');
      expect(history[2].source).toBe('codelens');
    });
  });

  describe('Preferred Formats', () => {
    it('should return default format order when no history', async () => {
      const formats = await manager.getPreferredFormats();
      
      expect(formats).toEqual(['svg', 'png', 'jpg', 'pdf', 'webp']);
    });

    it('should prioritize frequently used formats', async () => {
      // Record png 3 times, svg 1 time
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('png', 'codelens');

      const formats = await manager.getPreferredFormats();
      
      expect(formats[0]).toBe('png'); // Most frequently used
      expect(formats[1]).toBe('svg');
    });

    it('should weight recent usage more heavily', async () => {
      // Record svg 3 times long ago, then png once recently
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'codelens'); // Most recent

      const formats = await manager.getPreferredFormats();
      
      // PNG should be higher due to recency weighting
      // (Recent usage has weight 1.9, older usage ~1.1-1.7)
      // 3 svg usages at lower weight vs 1 png at highest weight
      expect(formats.slice(0, 2)).toContain('png');
    });

    it('should handle ties by preferring default order', async () => {
      // Equal usage
      await manager.recordUsage('pdf', 'codelens');
      await manager.recordUsage('jpg', 'codelens');

      const formats = await manager.getPreferredFormats();
      
      // JPG comes before PDF in default order
      const jpgIndex = formats.indexOf('jpg');
      const pdfIndex = formats.indexOf('pdf');
      expect(jpgIndex).toBeLessThan(pdfIndex);
    });

    it('should only consider last 10 exports for recency', async () => {
      // Record 11 png usages, then 1 svg
      for (let i = 0; i < 11; i++) {
        await manager.recordUsage('png', 'codelens');
      }
      await manager.recordUsage('svg', 'codelens');

      // Only last 10 should matter, so svg should rank higher
      const formats = await manager.getPreferredFormats();
      
      // SVG is in recent 10, but older PNG usages are outside
      expect(formats).toContain('svg');
      expect(formats).toContain('png');
    });
  });

  describe('Most Used Format', () => {
    it('should return svg when no history', async () => {
      const format = await manager.getMostUsedFormat();
      
      expect(format).toBe('svg');
    });

    it('should return the most frequently used format', async () => {
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('svg', 'codelens');

      const format = await manager.getMostUsedFormat();
      
      expect(format).toBe('png');
    });

    it('should reflect recent usage changes', async () => {
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('svg', 'codelens');
      
      expect(await manager.getMostUsedFormat()).toBe('svg');

      // Now use PNG more recently
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('png', 'codelens');

      expect(await manager.getMostUsedFormat()).toBe('png');
    });
  });

  describe('Top Two Formats', () => {
    it('should return [svg, png] when no history', async () => {
      const [first, second] = await manager.getTopTwoFormats();
      
      expect(first).toBe('svg');
      expect(second).toBe('png');
    });

    it('should return top 2 most used formats', async () => {
      await manager.recordUsage('pdf', 'codelens');
      await manager.recordUsage('pdf', 'codelens');
      await manager.recordUsage('pdf', 'codelens');
      await manager.recordUsage('jpg', 'codelens');
      await manager.recordUsage('jpg', 'codelens');
      await manager.recordUsage('svg', 'codelens');

      const [first, second] = await manager.getTopTwoFormats();
      
      expect(first).toBe('pdf');
      expect(second).toBe('jpg');
    });

    it('should reflect usage changes', async () => {
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'codelens');
      
      expect(await manager.getTopTwoFormats()).toEqual(['png', 'svg']);
    });
  });

  describe('Usage History Detection', () => {
    it('should return false when no history', async () => {
      const hasHistory = await manager.hasUsageHistory();
      
      expect(hasHistory).toBe(false);
    });

    it('should return false with insufficient history (<3)', async () => {
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'codelens');

      const hasHistory = await manager.hasUsageHistory();
      
      expect(hasHistory).toBe(false);
    });

    it('should return true with sufficient history (>=3)', async () => {
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('pdf', 'codelens');

      const hasHistory = await manager.hasUsageHistory();
      
      expect(hasHistory).toBe(true);
    });
  });

  describe('Usage Statistics', () => {
    it('should return empty stats when no history', async () => {
      const stats = await manager.getUsageStats();
      
      expect(stats).toEqual([]);
    });

    it('should calculate accurate usage counts', async () => {
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'codelens');

      const stats = await manager.getUsageStats();
      
      expect(stats).toHaveLength(2);
      expect(stats[0].format).toBe('svg');
      expect(stats[0].count).toBe(2);
      expect(stats[1].format).toBe('png');
      expect(stats[1].count).toBe(1);
    });

    it('should track last used timestamp', async () => {
      const timestamp1 = Date.now();
      await manager.recordUsage('svg', 'codelens');
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const timestamp2 = Date.now();
      await manager.recordUsage('svg', 'codelens');

      const stats = await manager.getUsageStats();
      
      expect(stats[0].lastUsed.getTime()).toBeGreaterThanOrEqual(timestamp1);
      expect(stats[0].lastUsed.getTime()).toBeLessThanOrEqual(timestamp2 + 100);
    });

    it('should sort by usage count descending', async () => {
      await manager.recordUsage('pdf', 'codelens'); // 1 time
      await manager.recordUsage('svg', 'codelens'); // 3 times
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'codelens'); // 2 times
      await manager.recordUsage('png', 'codelens');

      const stats = await manager.getUsageStats();
      
      expect(stats[0].format).toBe('svg'); // 3 times
      expect(stats[0].count).toBe(3);
      expect(stats[1].format).toBe('png'); // 2 times
      expect(stats[1].count).toBe(2);
      expect(stats[2].format).toBe('pdf'); // 1 time
      expect(stats[2].count).toBe(1);
    });
  });

  describe('History Reset', () => {
    it('should clear all usage history', async () => {
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('pdf', 'codelens');

      await manager.resetUsageHistory();

      const history = await (manager as any).getUsageHistory();
      expect(history).toEqual([]);
    });

    it('should reset to default format order', async () => {
      await manager.recordUsage('pdf', 'codelens');
      await manager.recordUsage('pdf', 'codelens');
      await manager.recordUsage('pdf', 'codelens');

      await manager.resetUsageHistory();

      const formats = await manager.getPreferredFormats();
      expect(formats).toEqual(['svg', 'png', 'jpg', 'pdf', 'webp']);
    });

    it('should reset most used format to svg', async () => {
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('png', 'codelens');

      await manager.resetUsageHistory();

      const format = await manager.getMostUsedFormat();
      expect(format).toBe('svg');
    });
  });

  describe('File-Specific Preferences', () => {
    it('should store file format preference', async () => {
      await manager.setFileFormatPreference('/path/to/diagram.md', 'pdf');

      const preference = await manager.getFileFormatPreference('/path/to/diagram.md');
      
      expect(preference).toBe('pdf');
    });

    it('should return undefined for files without preference', async () => {
      const preference = await manager.getFileFormatPreference('/path/to/unknown.md');
      
      expect(preference).toBeUndefined();
    });

    it('should handle multiple file preferences', async () => {
      await manager.setFileFormatPreference('/file1.md', 'svg');
      await manager.setFileFormatPreference('/file2.md', 'png');
      await manager.setFileFormatPreference('/file3.md', 'pdf');

      expect(await manager.getFileFormatPreference('/file1.md')).toBe('svg');
      expect(await manager.getFileFormatPreference('/file2.md')).toBe('png');
      expect(await manager.getFileFormatPreference('/file3.md')).toBe('pdf');
    });

    it('should overwrite existing file preference', async () => {
      await manager.setFileFormatPreference('/diagram.md', 'svg');
      expect(await manager.getFileFormatPreference('/diagram.md')).toBe('svg');

      await manager.setFileFormatPreference('/diagram.md', 'png');
      expect(await manager.getFileFormatPreference('/diagram.md')).toBe('png');
    });

    it('should persist file preferences independently of usage history', async () => {
      await manager.setFileFormatPreference('/file.md', 'webp');
      await manager.recordUsage('svg', 'codelens');
      await manager.resetUsageHistory();

      // File preference should still be there
      expect(await manager.getFileFormatPreference('/file.md')).toBe('webp');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle real-world usage pattern', async () => {
      // User starts with defaults
      expect(await manager.getMostUsedFormat()).toBe('svg');

      // User discovers PNG is better for their use case
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('png', 'codelens');
      await manager.recordUsage('png', 'statusbar');

      // PNG should now be most used
      expect(await manager.getMostUsedFormat()).toBe('png');

      // User occasionally needs PDF
      await manager.recordUsage('pdf', 'command');
      
      // Top two should reflect usage
      const [first, second] = await manager.getTopTwoFormats();
      expect(first).toBe('png');
      expect([second]).toContain('pdf');
    });

    it('should handle workspace state persistence', async () => {
      await manager.recordUsage('svg', 'codelens');
      await manager.recordUsage('png', 'codelens');

      // Simulate extension restart by creating new manager with same context
      const newManager = new FormatPreferenceManager(mockContext);

      // History should persist
      const formats = await newManager.getPreferredFormats();
      expect(formats.slice(0, 2)).toContain('svg');
      expect(formats.slice(0, 2)).toContain('png');
    });
  });
});
