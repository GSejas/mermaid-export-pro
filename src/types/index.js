"use strict";
/**
 * Core types and interfaces for Mermaid Export Pro
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MermaidExportError = void 0;
class MermaidExportError extends Error {
    errorInfo;
    originalError;
    constructor(errorInfo, originalError) {
        super(errorInfo.message);
        this.errorInfo = errorInfo;
        this.originalError = originalError;
        this.name = 'MermaidExportError';
    }
}
exports.MermaidExportError = MermaidExportError;
//# sourceMappingURL=index.js.map