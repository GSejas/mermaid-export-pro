"use strict";
/**
 * Export Validation Utilities for E2E Tests
 *
 * Validates exported files, checks formats, and verifies export results.
 * Provides assertions for file existence, content, and metadata.
 *
 * @author Claude/Jorge
 * @version 1.0.0
 * @date 2025-10-10
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
exports.ExportValidator = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class ExportValidator {
    /**
     * Verify a file exists at the specified path
     */
    async verifyFileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Verify exact count of files in directory
     */
    async verifyFileCount(directory, expectedCount, extension) {
        try {
            const files = await fs.readdir(directory);
            const filtered = extension
                ? files.filter(f => f.endsWith(extension))
                : files;
            return filtered.length === expectedCount;
        }
        catch {
            return false;
        }
    }
    /**
     * Get count of files in directory
     */
    async getFileCount(directory, extension) {
        try {
            const files = await fs.readdir(directory);
            if (extension) {
                return files.filter(f => f.endsWith(extension)).length;
            }
            return files.length;
        }
        catch {
            return 0;
        }
    }
    /**
     * Verify SVG file is valid
     */
    async verifySVGContent(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const stats = await fs.stat(filePath);
            // Basic SVG validation
            const isValid = content.includes('<svg') &&
                content.includes('</svg>') &&
                stats.size > 100; // SVG should be reasonably sized
            return {
                exists: true,
                size: stats.size,
                isValid,
                error: isValid ? undefined : 'Invalid SVG structure'
            };
        }
        catch (err) {
            return {
                exists: false,
                size: 0,
                isValid: false,
                error: err.message
            };
        }
    }
    /**
     * Verify PNG file is valid (basic check)
     */
    async verifyPNGContent(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            const stats = await fs.stat(filePath);
            // PNG signature: 89 50 4E 47 0D 0A 1A 0A
            const isPNG = buffer.length > 8 &&
                buffer[0] === 0x89 &&
                buffer[1] === 0x50 &&
                buffer[2] === 0x4E &&
                buffer[3] === 0x47;
            return {
                exists: true,
                size: stats.size,
                isValid: isPNG && stats.size > 100,
                error: isPNG ? undefined : 'Invalid PNG signature'
            };
        }
        catch (err) {
            return {
                exists: false,
                size: 0,
                isValid: false,
                error: err.message
            };
        }
    }
    /**
     * Verify PDF file is valid (basic check)
     */
    async verifyPDFContent(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            const stats = await fs.stat(filePath);
            // PDF signature: %PDF-
            const isPDF = buffer.length > 5 &&
                buffer.toString('ascii', 0, 5) === '%PDF-';
            return {
                exists: true,
                size: stats.size,
                isValid: isPDF && stats.size > 100,
                error: isPDF ? undefined : 'Invalid PDF signature'
            };
        }
        catch (err) {
            return {
                exists: false,
                size: 0,
                isValid: false,
                error: err.message
            };
        }
    }
    /**
     * Verify WEBP file is valid (basic check)
     */
    async verifyWEBPContent(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            const stats = await fs.stat(filePath);
            // WEBP signature: RIFF....WEBP
            const isWEBP = buffer.length > 12 &&
                buffer.toString('ascii', 0, 4) === 'RIFF' &&
                buffer.toString('ascii', 8, 12) === 'WEBP';
            return {
                exists: true,
                size: stats.size,
                isValid: isWEBP && stats.size > 100,
                error: isWEBP ? undefined : 'Invalid WEBP signature'
            };
        }
        catch (err) {
            return {
                exists: false,
                size: 0,
                isValid: false,
                error: err.message
            };
        }
    }
    /**
     * Verify exported file based on format
     */
    async verifyExport(filePath, format) {
        const extension = format.toLowerCase();
        switch (extension) {
            case 'svg':
                return this.verifySVGContent(filePath);
            case 'png':
                return this.verifyPNGContent(filePath);
            case 'pdf':
                return this.verifyPDFContent(filePath);
            case 'webp':
                return this.verifyWEBPContent(filePath);
            default:
                return {
                    exists: await this.verifyFileExists(filePath),
                    size: 0,
                    isValid: false,
                    error: `Unknown format: ${format}`
                };
        }
    }
    /**
     * Verify multiple exports
     */
    async verifyExports(directory, expectedFiles) {
        const results = new Map();
        for (const file of expectedFiles) {
            const filePath = path.join(directory, file.name);
            const result = await this.verifyExport(filePath, file.format);
            results.set(file.name, result);
        }
        return results;
    }
    /**
     * Get all files in directory with validation
     */
    async getAllExports(directory) {
        const results = [];
        try {
            const files = await fs.readdir(directory);
            for (const file of files) {
                const filePath = path.join(directory, file);
                const ext = path.extname(file).substring(1).toLowerCase();
                if (['svg', 'png', 'pdf', 'webp'].includes(ext)) {
                    const validation = await this.verifyExport(filePath, ext);
                    results.push({
                        path: filePath,
                        format: ext,
                        valid: validation.isValid
                    });
                }
            }
        }
        catch {
            // Directory doesn't exist or not accessible
        }
        return results;
    }
    /**
     * Verify directory structure for organized exports
     */
    async verifyOrganizedStructure(baseDir, formats) {
        try {
            for (const format of formats) {
                const formatDir = path.join(baseDir, format);
                const exists = await this.verifyFileExists(formatDir);
                if (!exists) {
                    return false;
                }
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get file size
     */
    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        }
        catch {
            return 0;
        }
    }
    /**
     * Compare file sizes (useful for format comparison)
     */
    async compareFileSizes(filePath1, filePath2) {
        const size1 = await this.getFileSize(filePath1);
        const size2 = await this.getFileSize(filePath2);
        return {
            file1: size1,
            file2: size2,
            difference: Math.abs(size1 - size2)
        };
    }
}
exports.ExportValidator = ExportValidator;
//# sourceMappingURL=export-validator.js.map