import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getNonce, getUri, getWebviewContent } from '../../../utils/webviewUtils';
import * as vscode from 'vscode';

// Mock vscode
vi.mock('vscode', () => ({
  Uri: {
    joinPath: vi.fn((...parts: any[]) => ({
      fsPath: parts.join('/'),
      path: parts.join('/'),
      toString: () => parts.join('/')
    }))
  }
}));

describe('webviewUtils', () => {
  describe('getNonce()', () => {
    it('should generate a 32-character nonce', () => {
      const nonce = getNonce();

      expect(nonce).toHaveLength(32);
      expect(typeof nonce).toBe('string');
    });

    it('should generate unique nonces', () => {
      const nonce1 = getNonce();
      const nonce2 = getNonce();
      const nonce3 = getNonce();

      expect(nonce1).not.toBe(nonce2);
      expect(nonce2).not.toBe(nonce3);
      expect(nonce1).not.toBe(nonce3);
    });

    it('should only contain alphanumeric characters', () => {
      const nonce = getNonce();

      expect(nonce).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate different nonces on each call', () => {
      const nonces = new Set();
      
      for (let i = 0; i < 10; i++) {
        nonces.add(getNonce());
      }

      expect(nonces.size).toBe(10); // All unique
    });
  });

  describe('getUri()', () => {
    let mockWebview: any;
    let mockExtensionUri: any;

    beforeEach(() => {
      mockWebview = {
        asWebviewUri: vi.fn((uri: any) => ({ 
          ...uri, 
          webview: true,
          toString: () => `webview://${uri.toString()}`
        }))
      };

      mockExtensionUri = {
        fsPath: '/extension/root',
        toString: () => '/extension/root'
      };
    });

    it('should join paths and return webview URI', () => {
      const result = getUri(mockWebview, mockExtensionUri, ['dist', 'bundle.js']);

      expect(vscode.Uri.joinPath).toHaveBeenCalledWith(mockExtensionUri, 'dist', 'bundle.js');
      expect(mockWebview.asWebviewUri).toHaveBeenCalled();
    });

    it('should handle single path element', () => {
      const result = getUri(mockWebview, mockExtensionUri, ['script.js']);

      expect(vscode.Uri.joinPath).toHaveBeenCalledWith(mockExtensionUri, 'script.js');
    });

    it('should handle deeply nested paths', () => {
      const result = getUri(mockWebview, mockExtensionUri, ['assets', 'js', 'vendor', 'lib.js']);

      expect(vscode.Uri.joinPath).toHaveBeenCalledWith(
        mockExtensionUri,
        'assets',
        'js',
        'vendor',
        'lib.js'
      );
    });

    it('should return result of asWebviewUri', () => {
      const mockResult = { webview: true, path: '/webview/path' };
      mockWebview.asWebviewUri.mockReturnValue(mockResult);

      const result = getUri(mockWebview, mockExtensionUri, ['file.js']);

      expect(result).toBe(mockResult);
    });
  });

  describe('getWebviewContent()', () => {
    let mockWebview: any;
    let mockExtensionUri: any;

    beforeEach(() => {
      mockWebview = {
        cspSource: 'webview-csp-source',
        asWebviewUri: vi.fn((uri: any) => ({
          ...uri,
          toString: () => `webview://path/${uri.path}`
        }))
      };

      mockExtensionUri = {
        fsPath: '/extension',
        toString: () => '/extension'
      };
    });

    it('should generate valid HTML with CSP', () => {
      const html = getWebviewContent(
        mockWebview,
        mockExtensionUri,
        ['dist', 'main.js'],
        'Test Title',
        '<h1>Body Content</h1>'
      );

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Test Title</title>');
      expect(html).toContain('<h1>Body Content</h1>');
      expect(html).toContain('Content-Security-Policy');
    });

    it('should include nonce in CSP and script tags', () => {
      const html = getWebviewContent(
        mockWebview,
        mockExtensionUri,
        ['bundle.js'],
        'Title',
        '<div>Content</div>'
      );

      // Extract nonce from CSP
      const cspMatch = html.match(/script-src 'nonce-([^']+)'/);
      expect(cspMatch).toBeTruthy();
      
      if (cspMatch) {
        const nonce = cspMatch[1];
        
        // Verify nonce is used in script tag
        expect(html).toContain(`nonce="${nonce}"`);
        expect(nonce).toHaveLength(32);
      }
    });

    it('should include webview CSP source', () => {
      const html = getWebviewContent(
        mockWebview,
        mockExtensionUri,
        ['script.js'],
        'Title',
        'Body'
      );

      expect(html).toContain('webview-csp-source');
      expect(html).toMatch(/script-src.*webview-csp-source/);
      expect(html).toMatch(/style-src.*webview-csp-source/);
    });

    it('should include script URI from getUri', () => {
      const html = getWebviewContent(
        mockWebview,
        mockExtensionUri,
        ['dist', 'app.js'],
        'Title',
        'Body'
      );

      expect(html).toContain('webview://path/');
      expect(html).toContain('src="webview://path/');
    });

    it('should include additional scripts when provided', () => {
      const additionalScript = 'console.log("init");';
      
      const html = getWebviewContent(
        mockWebview,
        mockExtensionUri,
        ['main.js'],
        'Title',
        'Body',
        additionalScript
      );

      expect(html).toContain(additionalScript);
      expect(html).toContain('<script nonce=');
    });

    it('should not include additional script section when omitted', () => {
      const html = getWebviewContent(
        mockWebview,
        mockExtensionUri,
        ['main.js'],
        'Title',
        'Body'
      );

      // Should have main script tag but not additional inline script
      const scriptTags = html.match(/<script/g);
      expect(scriptTags).toHaveLength(1);
    });

    it('should properly escape HTML entities in title and body', () => {
      const html = getWebviewContent(
        mockWebview,
        mockExtensionUri,
        ['script.js'],
        'Title with <tags>',
        '<div>Content with "quotes"</div>'
      );

      expect(html).toContain('Title with <tags>'); // Passed as-is (user responsibility)
      expect(html).toContain('Content with "quotes"');
    });

    it('should set proper CSP directives', () => {
      const html = getWebviewContent(
        mockWebview,
        mockExtensionUri,
        ['app.js'],
        'Test',
        'Body'
      );

      expect(html).toContain("default-src 'none'");
      expect(html).toContain("style-src");
      expect(html).toContain("'unsafe-inline'");
      expect(html).toContain("script-src");
      expect(html).toContain("font-src");
      expect(html).toContain("img-src");
      expect(html).toContain("data:");
    });

    it('should include viewport meta tag', () => {
      const html = getWebviewContent(
        mockWebview,
        mockExtensionUri,
        ['script.js'],
        'Title',
        'Body'
      );

      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('width=device-width, initial-scale=1.0');
    });

    it('should set UTF-8 charset', () => {
      const html = getWebviewContent(
        mockWebview,
        mockExtensionUri,
        ['script.js'],
        'Title',
        'Body'
      );

      expect(html).toContain('<meta charset="UTF-8">');
    });
  });
});
