"use strict";
/**
 * Format Preference Manager - Tracks user export format preferences
 *
 * Purpose: Learn user behavior to optimize CodeLens ordering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormatPreferenceManager = void 0;
/**
 * Storage key for persisting the user's format preference usage history.
 *
 * This key is used to read/write a JSON-serialised record that tracks how
 * often (and optionally when) each output format has been selected. The data
 * is used to rank or surface frequently used formats in the UI.
 *
 * Remarks:
 * - The value stored under this key is expected to be a JSON string.
 * - Recommended shape:
 *   {
 *     "<formatId>": { "count": number, "lastUsed": string (ISO date) },
 *     ...
 *   }
 * - Implementations should be defensive when reading (handle missing keys,
 *   malformed JSON, and migration between shape changes).
 *
 * Example:
 * {
 *   "png": { "count": 12, "lastUsed": "2025-08-27T12:34:56.789Z" },
 *   "svg": { "count": 5, "lastUsed": "2025-08-20T09:10:11.123Z" }
 * }
 *
 * @internal For internal extension use only — do not expose this key externally.
 */
class FormatPreferenceManager {
    context;
    static USAGE_HISTORY_KEY = 'mermaidExportPro.formatUsageHistory';
    static FILE_FORMAT_MAP_KEY = 'mermaidExportPro.fileFormatMap';
    static MAX_HISTORY_SIZE = 20;
    constructor(context) {
        this.context = context;
    }
    /**
     * Record a format usage
     */
    async recordUsage(format, source) {
        const history = await this.getUsageHistory();
        const newUsage = {
            format,
            timestamp: Date.now(),
            source
        };
        // Add to front, keep only recent entries
        history.unshift(newUsage);
        const trimmedHistory = history.slice(0, FormatPreferenceManager.MAX_HISTORY_SIZE);
        await this.context.workspaceState.update(FormatPreferenceManager.USAGE_HISTORY_KEY, trimmedHistory);
    }
    /**
     * Get usage history from workspace state
     */
    async getUsageHistory() {
        return this.context.workspaceState.get(FormatPreferenceManager.USAGE_HISTORY_KEY, []);
    }
    /**
     * Get preferred format order based on recent usage
     */
    async getPreferredFormats() {
        const history = await this.getUsageHistory();
        // Count usage frequency in last 10 exports
        const recentHistory = history.slice(0, 10);
        const formatCounts = new Map();
        // Weight recent usage more heavily
        recentHistory.forEach((usage, index) => {
            const weight = 1 + (0.1 * (10 - index)); // More recent = higher weight
            const currentCount = formatCounts.get(usage.format) || 0;
            formatCounts.set(usage.format, currentCount + weight);
        });
        // Sort formats by weighted usage, fallback to defaults
        const allFormats = ['svg', 'png', 'jpg', 'pdf', 'webp'];
        return allFormats.sort((a, b) => {
            const countA = formatCounts.get(a) || 0;
            const countB = formatCounts.get(b) || 0;
            if (countA !== countB) {
                return countB - countA; // Higher count first
            }
            // If equal usage, prefer SVG > PNG > others
            const defaultOrder = ['svg', 'png', 'jpg', 'pdf', 'webp'];
            return defaultOrder.indexOf(a) - defaultOrder.indexOf(b);
        });
    }
    /**
     * Get the most used format for quick export
     */
    async getMostUsedFormat() {
        const preferredFormats = await this.getPreferredFormats();
        return preferredFormats[0] || 'svg';
    }
    /**
     * Get top 2 formats for CodeLens display
     */
    async getTopTwoFormats() {
        const preferredFormats = await this.getPreferredFormats();
        return [
            preferredFormats[0] || 'svg',
            preferredFormats[1] || 'png'
        ];
    }
    /**
     * Check if user has enough usage history for intelligent ordering
     */
    async hasUsageHistory() {
        const history = await this.getUsageHistory();
        return history.length >= 3;
    }
    /**
     * Get usage statistics for debugging
     */
    async getUsageStats() {
        const history = await this.getUsageHistory();
        const stats = new Map();
        history.forEach(usage => {
            const current = stats.get(usage.format) || { count: 0, lastUsed: 0 };
            stats.set(usage.format, {
                count: current.count + 1,
                lastUsed: Math.max(current.lastUsed, usage.timestamp)
            });
        });
        return Array.from(stats.entries()).map(([format, data]) => ({
            format,
            count: data.count,
            lastUsed: new Date(data.lastUsed)
        })).sort((a, b) => b.count - a.count);
    }
    /**
     * Reset usage history (for testing/debugging)
     */
    async resetUsageHistory() {
        await this.context.workspaceState.update(FormatPreferenceManager.USAGE_HISTORY_KEY, []);
    }
    /**
     * Persist a preferred format for a specific file path
     */
    async setFileFormatPreference(filePath, format) {
        const map = this.context.workspaceState.get(FormatPreferenceManager.FILE_FORMAT_MAP_KEY, {});
        map[filePath] = format;
        await this.context.workspaceState.update(FormatPreferenceManager.FILE_FORMAT_MAP_KEY, map);
    }
    /**
     * Get the preferred format for a specific file, if any
     */
    async getFileFormatPreference(filePath) {
        const map = this.context.workspaceState.get(FormatPreferenceManager.FILE_FORMAT_MAP_KEY, {});
        return map[filePath];
    }
}
exports.FormatPreferenceManager = FormatPreferenceManager;
//# sourceMappingURL=formatPreferenceManager.js.map