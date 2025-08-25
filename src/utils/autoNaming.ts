/**
 * Auto-naming utilities for smart file generation
 * 
 * Purpose: Generate unique, descriptive filenames with sequence and hash
 */

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { ExportFormat } from '../types';

export interface AutoNameOptions {
  baseName: string;
  format: ExportFormat;
  content: string;
  outputDirectory: string;
}

export class AutoNaming {
  /**
   * Generate smart filename with sequence and content hash
   * Format: ${baseName}-${sequence}-${hash8}.${format}
   * Example: architecture-01-a4b2c8ef.svg
   */
  static async generateSmartName(options: AutoNameOptions): Promise<string> {
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
  private static async getNextSequenceNumber(baseName: string, directory: string, format: ExportFormat): Promise<number> {
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
      
    } catch (error) {
      // If any error occurs, start from 1
      return 1;
    }
  }

  /**
   * Escape regex special characters in filename
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate filename for save dialog (traditional naming)
   */
  static generateDialogName(baseName: string, format: ExportFormat): string {
    return `${baseName}-diagram.${format}`;
  }

  /**
   * Clean base name from file path
   */
  static getBaseName(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Clean up common suffixes and make filesystem-safe
    return fileName
      .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars
      .replace(/\s+/g, '-')          // Replace spaces with dashes
      .replace(/-+/g, '-')           // Collapse multiple dashes
      .replace(/^-|-$/g, '')         // Remove leading/trailing dashes
      .toLowerCase();
  }

  /**
   * Validate that a directory path is accessible and writable
   */
  static async validateDirectory(dirPath: string): Promise<{ valid: boolean; error?: string }> {
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
      
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const nodeError = error as NodeJS.ErrnoException;
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
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      // Directory doesn't exist, create it
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }
}