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

import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExportValidationResult {
  exists: boolean;
  size: number;
  isValid: boolean;
  error?: string;
}

export class ExportValidator {
  /**
   * Verify a file exists at the specified path
   */
  async verifyFileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify exact count of files in directory
   */
  async verifyFileCount(directory: string, expectedCount: number, extension?: string): Promise<boolean> {
    try {
      const files = await fs.readdir(directory);
      const filtered = extension
        ? files.filter(f => f.endsWith(extension))
        : files;
      return filtered.length === expectedCount;
    } catch {
      return false;
    }
  }

  /**
   * Get count of files in directory
   */
  async getFileCount(directory: string, extension?: string): Promise<number> {
    try {
      const files = await fs.readdir(directory);
      if (extension) {
        return files.filter(f => f.endsWith(extension)).length;
      }
      return files.length;
    } catch {
      return 0;
    }
  }

  /**
   * Verify SVG file is valid
   */
  async verifySVGContent(filePath: string): Promise<ExportValidationResult> {
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
    } catch (err) {
      return {
        exists: false,
        size: 0,
        isValid: false,
        error: (err as Error).message
      };
    }
  }

  /**
   * Verify PNG file is valid (basic check)
   */
  async verifyPNGContent(filePath: string): Promise<ExportValidationResult> {
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
    } catch (err) {
      return {
        exists: false,
        size: 0,
        isValid: false,
        error: (err as Error).message
      };
    }
  }

  /**
   * Verify PDF file is valid (basic check)
   */
  async verifyPDFContent(filePath: string): Promise<ExportValidationResult> {
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
    } catch (err) {
      return {
        exists: false,
        size: 0,
        isValid: false,
        error: (err as Error).message
      };
    }
  }

  /**
   * Verify WEBP file is valid (basic check)
   */
  async verifyWEBPContent(filePath: string): Promise<ExportValidationResult> {
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
    } catch (err) {
      return {
        exists: false,
        size: 0,
        isValid: false,
        error: (err as Error).message
      };
    }
  }

  /**
   * Verify exported file based on format
   */
  async verifyExport(filePath: string, format: string): Promise<ExportValidationResult> {
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
  async verifyExports(directory: string, expectedFiles: Array<{ name: string; format: string }>): Promise<Map<string, ExportValidationResult>> {
    const results = new Map<string, ExportValidationResult>();

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
  async getAllExports(directory: string): Promise<Array<{ path: string; format: string; valid: boolean }>> {
    const results: Array<{ path: string; format: string; valid: boolean }> = [];

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
    } catch {
      // Directory doesn't exist or not accessible
    }

    return results;
  }

  /**
   * Verify directory structure for organized exports
   */
  async verifyOrganizedStructure(baseDir: string, formats: string[]): Promise<boolean> {
    try {
      for (const format of formats) {
        const formatDir = path.join(baseDir, format);
        const exists = await this.verifyFileExists(formatDir);
        if (!exists) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Compare file sizes (useful for format comparison)
   */
  async compareFileSizes(filePath1: string, filePath2: string): Promise<{ file1: number; file2: number; difference: number }> {
    const size1 = await this.getFileSize(filePath1);
    const size2 = await this.getFileSize(filePath2);

    return {
      file1: size1,
      file2: size2,
      difference: Math.abs(size1 - size2)
    };
  }
}
