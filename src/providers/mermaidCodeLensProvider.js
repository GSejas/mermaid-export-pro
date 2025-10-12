"use strict";
/**
 * Mermaid Export Pro - CodeLens Provider for Markdown Files
 *
 * Purpose: Show export actions above mermaid code blocks in markdown files
 * Author: Claude/Jorge
 * Date: 2025-08-24
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
exports.MermaidCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
const formatPreferenceManager_1 = require("../services/formatPreferenceManager");
class MermaidCodeLensProvider {
    context;
    formatPreferenceManager;
    constructor(context) {
        this.context = context;
        this.formatPreferenceManager = new formatPreferenceManager_1.FormatPreferenceManager(context);
        console.log('[mermaidExportPro] MermaidCodeLensProvider constructed');
    }
    async provideCodeLenses(document, token) {
        if (token.isCancellationRequested) {
            return [];
        }
        // Only process markdown files
        if (document.languageId !== 'markdown') {
            return [];
        }
        const codeLenses = [];
        const mermaidBlocks = this.findMermaidBlocks(document);
        for (const block of mermaidBlocks) {
            // Get adaptive format ordering based on user preferences
            const [topFormat, secondFormat] = await this.formatPreferenceManager.getTopTwoFormats();
            // Format display mapping
            const formatIcons = {
                svg: '$(file-media)',
                png: '$(device-camera)',
                jpg: '$(file-zip)',
                jpeg: '$(file-zip)',
                pdf: '$(file-pdf)',
                webp: '$(globe)'
            };
            const formatLabels = {
                svg: 'SVG',
                png: 'PNG',
                jpg: 'JPG',
                jpeg: 'JPEG',
                pdf: 'PDF',
                webp: 'WebP'
            };
            // Adaptive export commands - top 2 formats + More Options
            const exportCommands = [
                {
                    title: `${formatIcons[topFormat]} Export ${formatLabels[topFormat]}`,
                    command: 'mermaidExportPro.exportMarkdownBlock',
                    arguments: [document.uri, block.range, topFormat]
                },
                {
                    title: `${formatIcons[secondFormat]} Export ${formatLabels[secondFormat]}`,
                    command: 'mermaidExportPro.exportMarkdownBlock',
                    arguments: [document.uri, block.range, secondFormat]
                },
                {
                    title: '$(gear) More Options',
                    command: 'mermaidExportPro.showExportOptions',
                    arguments: [document.uri, block.range]
                }
            ];
            // Create CodeLens for each option
            exportCommands.forEach((cmd, index) => {
                // Position CodeLens slightly offset so they appear side by side
                const range = new vscode.Range(block.range.start.line, block.range.start.character + (index * 18), block.range.start.line, block.range.start.character + (index * 18) + 12);
                codeLenses.push(new vscode.CodeLens(range, cmd));
            });
        }
        return codeLenses;
    }
    resolveCodeLens(codeLens, token) {
        // CodeLens is already resolved in provideCodeLenses
        return codeLens;
    }
    findMermaidBlocks(document) {
        const blocks = [];
        const text = document.getText();
        const lines = text.split('\n');
        let inMermaidBlock = false;
        let startLine = -1;
        let mermaidContent = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '```mermaid') {
                inMermaidBlock = true;
                startLine = i;
                mermaidContent = [];
            }
            else if (line === '```' && inMermaidBlock) {
                inMermaidBlock = false;
                const diagramContent = mermaidContent.join('\n').trim();
                if (diagramContent) {
                    const range = new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(i, lines[i].length));
                    blocks.push({
                        content: diagramContent,
                        range,
                        type: this.detectDiagramType(diagramContent)
                    });
                }
            }
            else if (inMermaidBlock) {
                mermaidContent.push(lines[i]);
            }
        }
        return blocks;
    }
    detectDiagramType(content) {
        const firstLine = content.trim().split('\n')[0].toLowerCase();
        if (firstLine.includes('flowchart') || firstLine.includes('graph')) {
            return 'flowchart';
        }
        if (firstLine.includes('sequencediagram')) {
            return 'sequence';
        }
        if (firstLine.includes('classdiagram')) {
            return 'class';
        }
        if (firstLine.includes('statediagram')) {
            return 'state';
        }
        if (firstLine.includes('erdiagram')) {
            return 'er';
        }
        if (firstLine.includes('journey')) {
            return 'journey';
        }
        if (firstLine.includes('gantt')) {
            return 'gantt';
        }
        if (firstLine.includes('pie')) {
            return 'pie';
        }
        if (firstLine.includes('gitgraph')) {
            return 'gitgraph';
        }
        if (firstLine.includes('mindmap')) {
            return 'mindmap';
        }
        return 'unknown';
    }
}
exports.MermaidCodeLensProvider = MermaidCodeLensProvider;
//# sourceMappingURL=mermaidCodeLensProvider.js.map