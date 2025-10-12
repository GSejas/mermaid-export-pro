"use strict";
/**
 * Auto-naming utilities for smart file generation
 *
 * Purpose: Generate unique, descriptive filenames with sequence and hash
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
exports.AutoNaming = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
class AutoNaming {
    /**
     * Generate smart filename with sequence and content hash
     * Format: ${baseName}-${sequence}-${hash8}.${format}
     * Example: architecture-01-a4b2c8ef.svg
     */
    static async generateSmartName(options) {
        const { baseName, format, content, outputDirectory } = options;
        // Generate 8-character hash of content
        const hash = crypto.createHash('sha256')
            .update(content.trim())
            .digest('hex')
            .substring(0, 8);
        // Find next available sequence number
        const sequence = await this.getNextSequenceNumber(baseName, outputDirectory, format);
        // Build filename
        const fileName = `${baseName}-${sequence.toString().padStart(2, '0')}-${hash}.${format}`;
        return path.join(outputDirectory, fileName);
    }
    /**
     * Get next available sequence number for a base name
     */
    static async getNextSequenceNumber(baseName, directory, format) {
        try {
            // Check if directory exists
            const dirExists = await fs.promises.access(directory).then(() => true).catch(() => false);
            if (!dirExists) {
                return 1; // First file
            }
            // Read directory contents
            const files = await fs.promises.readdir(directory);
            // Find files matching pattern: baseName-XX-xxxxxxxx.format
            const pattern = new RegExp(`^${this.escapeRegex(baseName)}-(\\d{2})-[a-f0-9]{8}\\.${format}$`);
            let maxSequence = 0;
            files.forEach(file => {
                const match = file.match(pattern);
                if (match) {
                    const sequence = parseInt(match[1], 10);
                    maxSequence = Math.max(maxSequence, sequence);
                }
            });
            return maxSequence + 1;
        }
        catch (error) {
            // If any error occurs, start from 1
            return 1;
        }
    }
    /**
     * Escape regex special characters in filename
     */
    static escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * Generate filename for save dialog (traditional naming)
     */
    static generateDialogName(baseName, format) {
        return `${baseName}-diagram.${format}`;
    }
    /**
     * Clean base name from file path
     */
    static getBaseName(filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        // Clean up common suffixes and make filesystem-safe
        return fileName
            .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars
            .replace(/\s+/g, '-') // Replace spaces with dashes
            .replace(/-+/g, '-') // Collapse multiple dashes
            .replace(/^-|-$/g, '') // Remove leading/trailing dashes
            .toLowerCase();
    }
    /**
     * Validate that a directory path is accessible and writable
     */
    static async validateDirectory(dirPath) {
        try {
            // Check if directory exists
            const stats = await fs.promises.stat(dirPath);
            if (!stats.isDirectory()) {
                return { valid: false, error: 'Path is not a directory' };
            }
            // Check if writable by trying to create a temp file
            const testFile = path.join(dirPath, '.mermaid-export-test');
            await fs.promises.writeFile(testFile, 'test');
            await fs.promises.unlink(testFile);
            return { valid: true };
        }
        catch (error) {
            if (error instanceof Error && 'code' in error) {
                const nodeError = error;
                switch (nodeError.code) {
                    case 'ENOENT':
                        return { valid: false, error: 'Directory does not exist' };
                    case 'EACCES':
                        return { valid: false, error: 'Permission denied' };
                    case 'ENOTDIR':
                        return { valid: false, error: 'Path is not a directory' };
                    default:
                        return { valid: false, error: `Filesystem error: ${nodeError.code}` };
                }
            }
            return { valid: false, error: 'Unknown directory error' };
        }
    }
    /**
     * Ensure directory exists, create if necessary
     */
    static async ensureDirectory(dirPath) {
        try {
            await fs.promises.access(dirPath);
        }
        catch {
            // Directory doesn't exist, create it
            await fs.promises.mkdir(dirPath, { recursive: true });
        }
    }
}
exports.AutoNaming = AutoNaming;
//# sourceMappingURL=autoNaming.js.map