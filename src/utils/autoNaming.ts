/**
 * Auto-naming utilities for smart file generation
 * 
 * Purpose: Generate unique, descriptive filenames with sequence and hash
 */

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { ExportFormat, AutoNamingMode } from '../types';

export interface AutoNameOptions {
  baseName: string;
  format: ExportFormat;
  content: string;
  outputDirectory: string;
  mode?: AutoNamingMode;
}

export class AutoNaming {
  /**
   * Generate filename based on configured naming mode
   * Routes to appropriate naming strategy based on mode:
   * - versioned: diagram-01-a4b2c8ef.svg (default)
   * - overwrite: diagram1.svg
   */
  static async generateFileName(options: AutoNameOptions): Promise<string> {
    const mode = options.mode || 'versioned';

    switch (mode) {
      case 'overwrite':
        return this.generateOverwriteName(options);
      case 'versioned':
      default:
        return this.generateSmartName(options);
    }
  }

  /**
   * Generate simple overwrite filename
   * Format: ${baseName}${diagramNumber}.${format}
   * Example: diagram1.svg
   * Note: This will overwrite existing files with the same name
   */
  private static async generateOverwriteName(options: AutoNameOptions): Promise<string> {
    const { baseName, format, outputDirectory } = options;

    // Find the diagram number from the base name
    // diagram1 -> 1, architecture-flow2 -> 2, etc.
    const numberMatch = baseName.match(/(\d+)$/);
    const diagramNumber = numberMatch ? numberMatch[1] : '1';

    // Remove any trailing numbers and separators from baseName
    const cleanBaseName = baseName.replace(/[-_]?\d+$/, '');

    // Build simple filename: diagram1.svg
    const fileName = `${cleanBaseName}${diagramNumber}.${format}`;

    return path.join(outputDirectory, fileName);
  }

  /**
   * Generate smart filename with sequence and content hash
   * Format: ${baseName}-${sequence}-${hash8}.${format}
   * Example: architecture-01-a4b2c8ef.svg
   * 
   * Smart behavior: If a file with the same content hash already exists,
   * returns that existing file path instead of creating duplicates.
   */
  static async generateSmartName(options: AutoNameOptions): Promise<string> {
    const { baseName, format, content, outputDirectory } = options;
    
    // Generate 8-character hash of content
    const hash = crypto.createHash('sha256')
      .update(content.trim())
      .digest('hex')
      .substring(0, 8);
    
    // Check if a file with this hash already exists
    const existingFile = await this.findFileByHash(baseName, hash, outputDirectory, format);
    if (existingFile) {
      // Content already exported - reuse existing file
      return existingFile;
    }
    
    // New content - find next available sequence number
    const sequence = await this.getNextSequenceNumber(baseName, outputDirectory, format);
    
    // Build filename
    const fileName = `${baseName}-${sequence.toString().padStart(2, '0')}-${hash}.${format}`;
    
    return path.join(outputDirectory, fileName);
  }

  /**
   * Find existing file with matching content hash
   * Returns the full path if found, null otherwise
   */
  private static async findFileByHash(baseName: string, hash: string, directory: string, format: ExportFormat): Promise<string | null> {
    try {
      // Check if directory exists
      const dirExists = await fs.promises.access(directory).then(() => true).catch(() => false);
      if (!dirExists) {
        return null; // No directory means no existing files
      }

      // Read directory contents
      const files = await fs.promises.readdir(directory);
      
      // Find files matching pattern: baseName-XX-${hash}.format
      // We specifically look for our hash, regardless of sequence number
      const pattern = new RegExp(`^${this.escapeRegex(baseName)}-(\\d{2})-${this.escapeRegex(hash)}\\.${format}$`);
      
      for (const file of files) {
        if (pattern.test(file)) {
          // Found existing file with same content hash
          return path.join(directory, file);
        }
      }
      
      return null; // No existing file with this hash
      
    } catch (error) {
      // If any error occurs, assume file doesn't exist
      return null;
    }
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
   * Check if a file exists and has the same content hash
   * Returns true only if file exists AND content matches (for overwrite mode)
   * or if filename contains the content hash (for versioned mode)
   */
  static async shouldSkipExport(filePath: string, content: string): Promise<boolean> {
    try {
      // Check if file exists
      const fileExists = await fs.promises.access(filePath).then(() => true).catch(() => false);
      if (!fileExists) {
        return false; // File doesn't exist, must export
      }

      const fileName = path.basename(filePath);
      
      // Check if this is a versioned filename (contains hash)
      // Pattern: baseName-XX-xxxxxxxx.format
      const versionedPattern = /-\d{2}-[a-f0-9]{8}\./;
      
      if (versionedPattern.test(fileName)) {
        // Versioned mode: filename contains hash, so if file exists, content matches
        return true; // Skip export
      }
      
      // Overwrite mode: always export (overwrite the file)
      // We can't reliably compare binary file content with mermaid source,
      // so in overwrite mode, we always regenerate to ensure it's up to date
      return false;
      
    } catch (error) {
      // On any error, don't skip (allow export to proceed)
      return false;
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