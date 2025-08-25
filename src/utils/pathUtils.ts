import * as path from 'path';
import * as fs from 'fs';
import { ExportFormat } from '../types';

export class PathUtils {
  /**
   * Generates a safe output path for exported files
   */
  static generateOutputPath(
    inputPath: string, 
    format: ExportFormat, 
    outputDir?: string
  ): string {
    const parsedPath = path.parse(inputPath);
    const fileName = `${parsedPath.name}.${format}`;
    
    let outputDirectory: string;
    
    if (outputDir) {
      // If outputDir is absolute, use it; otherwise, resolve relative to input file
      outputDirectory = path.isAbsolute(outputDir) 
        ? outputDir 
        : path.resolve(parsedPath.dir, outputDir);
    } else {
      // Default to same directory as input file
      outputDirectory = parsedPath.dir;
    }
    
    return path.join(outputDirectory, fileName);
  }

  /**
   * Ensures directory exists, creates if necessary
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Sanitizes file path to prevent directory traversal attacks
   */
  static sanitizePath(inputPath: string): string {
    // Remove any path traversal attempts
    const normalized = path.normalize(inputPath);
    
    // Ensure we don't go above current directory
    if (normalized.includes('..')) {
      throw new Error('Path traversal detected in file path');
    }
    
    return normalized;
  }

  /**
   * Gets a unique file path if the target already exists
   */
  static async getUniqueFilePath(targetPath: string): Promise<string> {
    if (!await this.fileExists(targetPath)) {
      return targetPath;
    }

    const parsedPath = path.parse(targetPath);
    let counter = 1;
    let newPath: string;

    do {
      const fileName = `${parsedPath.name} (${counter})${parsedPath.ext}`;
      newPath = path.join(parsedPath.dir, fileName);
      counter++;
    } while (await this.fileExists(newPath));

    return newPath;
  }

  /**
   * Checks if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cross-platform temp directory
   */
  static getTempDirectory(): string {
    return require('os').tmpdir();
  }

  /**
   * Creates a temporary file path
   */
  static createTempFilePath(extension: string): string {
    const tempDir = this.getTempDirectory();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const fileName = `mermaid-export-${timestamp}-${random}.${extension}`;
    return path.join(tempDir, fileName);
  }

  /**
   * Validates that a path is safe for file operations
   */
  static validateOutputPath(outputPath: string): boolean {
    try {
      // Check for invalid characters
      const invalidChars = /[<>:"|?*]/;
      if (invalidChars.test(outputPath)) {
        return false;
      }

      // Ensure path is not too long (Windows limitation)
      if (outputPath.length > 260) {
        return false;
      }

      // Ensure we can resolve the path
      path.resolve(outputPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets relative path for display purposes
   */
  static getDisplayPath(fullPath: string, workspaceRoot?: string): string {
    if (workspaceRoot) {
      const relativePath = path.relative(workspaceRoot, fullPath);
      // If relative path is shorter and doesn't go up directories, use it
      if (relativePath.length < fullPath.length && !relativePath.startsWith('..')) {
        return relativePath;
      }
    }
    return fullPath;
  }
}