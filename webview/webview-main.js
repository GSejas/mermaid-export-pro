/**
 * Mermaid Export Pro - Webview Bundle Entry Point
 * 
 * Purpose: Bundles mermaid.js and provides VS Code webview interface for diagram rendering
 * Author: Claude Code Assistant  
 * Date: 2025-08-24
 * 
 * Security: Uses nonce-based CSP, no external CDN dependencies
 * Architecture: Host ↔ Webview handshake with ready/render/response cycle
 */

// Import mermaid from node_modules (bundled by esbuild)
import mermaid from 'mermaid';

// Acquire VS Code API once at the top level
let vscodeApi = null;

/**
 * Initialize Mermaid webview rendering system
 * @param {string} diagramText - Mermaid diagram source code
 * @param {Object} options - Rendering options (theme, dimensions, etc.)
 * @returns {Object} Renderer interface with renderDiagram method
 */
function initializeMermaidWebview(diagramText, options = {}) {
    console.log('Mermaid webview initializing with options:', options);
    
    // Validate VS Code API availability
    if (typeof acquireVsCodeApi !== 'function') {
        throw new Error('VS Code API not available - must run in VS Code webview context');
    }
    
    // Use shared API instance or acquire if not yet acquired
    if (!vscodeApi) {
        vscodeApi = acquireVsCodeApi();
    }
    const vscode = vscodeApi;
    
    // Configure mermaid with provided options
    const config = {
        startOnLoad: false,
        theme: options.theme || 'default',
        securityLevel: 'loose',
        htmlLabels: true,
        flowchart: {
            useMaxWidth: false,
            htmlLabels: true
        },
        class: {
            // Fix text overflow in class diagrams
            useMaxWidth: false,
            htmlLabels: true,
            textHeight: 15,
            curve: 'basis'
        },
        themeVariables: {
            background: (options.backgroundColor === 'transparent') ? 'transparent' : (options.backgroundColor || '#ffffff'),
            primaryColor: '#ffffff',
            primaryTextColor: '#000000',
            primaryBorderColor: '#000000',
            lineColor: '#000000',
            secondaryColor: '#f9f9f9',
            tertiaryColor: '#ffffff',
            // Class diagram specific theme variables
            classText: '#000000',
            classTitleColor: '#000000',
            cScale0: '#ffffff',
            cScale1: '#f9f9f9',
            cScale2: '#e6f3ff'
        }
    };

    console.log('Initializing mermaid with config:', config);
    mermaid.initialize(config);

    return {
        /**
         * Render the mermaid diagram to SVG
         * @returns {Promise<string>} SVG content
         */
        async renderDiagram() {
            try {
                console.log('Starting mermaid render with text length:', diagramText.length);
                
                // Validate diagram content
                if (!diagramText || !diagramText.trim()) {
                    throw new Error('Empty or invalid diagram content provided');
                }
                
                // Use mermaid.render with unique ID to avoid conflicts
                const uniqueId = 'mermaid-diagram-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                const renderResult = await mermaid.render(uniqueId, diagramText.trim());
                
                console.log('Mermaid render successful, SVG length:', renderResult.svg.length);
                
                // Clean SVG content - keep important styling but remove problematic attributes
                const cleanSvg = renderResult.svg
                    .replace(/class="[^"]*?react[^"]*?"/g, '') // Remove react-specific classes only
                    .replace(/data-id="[^"]*"/g, '') // Remove data-id attributes
                    .trim();
                
                // Send success message with clean SVG
                vscode.postMessage({
                    type: 'svg',
                    svg: cleanSvg,
                    metadata: {
                        originalLength: renderResult.svg.length,
                        cleanedLength: cleanSvg.length,
                        diagramId: uniqueId
                    }
                });
                
                return cleanSvg;
                
            } catch (error) {
                console.error('Mermaid rendering failed:', error);
                
                // Send detailed error message back to host
                vscode.postMessage({
                    type: 'error',
                    error: error.message || 'Unknown mermaid rendering error',
                    stack: error.stack || 'No stack trace available',
                    diagramText: diagramText.substring(0, 500) // First 500 chars for debugging
                });
                
                throw error;
            }
        }
    };
}

// **CRITICAL: Expose function globally for VS Code webview host access**
window.initializeMermaidWebview = initializeMermaidWebview;

// Also expose mermaid for debugging
window.mermaid = mermaid;

// **Webview Handshake Protocol Implementation**
// Send 'ready' signal to host when bundle is loaded and initialized
function notifyHostReady() {
    try {
        // Use shared API instance or acquire if not yet acquired
        if (!vscodeApi) {
            vscodeApi = acquireVsCodeApi();
        }
        const vscode = vscodeApi;
        
        // Defensive check - ensure our init function is properly exposed
        if (typeof window.initializeMermaidWebview !== 'function') {
            vscode.postMessage({
                type: 'error',
                error: 'initializeMermaidWebview function not properly exposed on window object',
                stack: 'Global exposure failure'
            });
            return;
        }
        
        // Send ready signal with metadata
        vscode.postMessage({
            type: 'ready',
            metadata: {
                mermaidVersion: mermaid.version || 'unknown',
                bundleLoaded: true,
                initFunctionAvailable: typeof window.initializeMermaidWebview === 'function',
                timestamp: Date.now()
            }
        });
        
        console.log('Webview bundle ready - sent ready signal to host');
        
    } catch (error) {
        console.error('Failed to notify host of ready state:', error);
        // Still try to send error message if possible
        try {
            if (!vscodeApi) {
                vscodeApi = acquireVsCodeApi();
            }
            vscodeApi.postMessage({
                type: 'error', 
                error: 'Failed to initialize webview handshake: ' + error.message
            });
        } catch (e) {
            console.error('Complete webview communication failure:', e);
        }
    }
}

// Initialize when DOM is ready or immediately if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notifyHostReady);
} else {
    // DOM already loaded, notify immediately but with small delay to ensure everything is set up
    setTimeout(notifyHostReady, 100);
}

// Handle render and conversion messages from host
window.addEventListener('message', async (event) => {
    const message = event.data;
    
    if (message.type === 'render') {
        const diagramElement = document.getElementById('diagram');
        
        try {
            diagramElement.innerHTML = '<div style="color: #586069; font-style: italic; text-align: center;">Rendering diagram...</div>';
            
            // Initialize and render
            const renderer = window.initializeMermaidWebview(message.diagramText, message.options);
            const svgResult = await renderer.renderDiagram();
            
            // Display result in container
            diagramElement.innerHTML = svgResult;
            
            console.log('Webview render completed successfully');
            
        } catch (error) {
            console.error('Webview render error:', error);
            diagramElement.innerHTML = `<div style="color: #d73a49; padding: 16px; border: 1px solid #d73a49; background-color: #ffeaea; border-radius: 4px; font-family: monospace; white-space: pre-wrap;">Render Error: ${error.message}

Diagram:
${message.diagramText.substring(0, 200)}...</div>`;
        }
    } else if (message.type === 'convert') {
        try {
            console.log(`Converting SVG to ${message.format}`);
            const convertedData = await convertSvgToFormat(message.svg, message.format, message.width, message.height, message.backgroundColor);
            
            if (!vscodeApi) {
                vscodeApi = acquireVsCodeApi();
            }
            vscodeApi.postMessage({
                type: 'conversion_success',
                data: convertedData
            });
            
        } catch (error) {
            console.error('Conversion error:', error);
            if (!vscodeApi) {
                vscodeApi = acquireVsCodeApi();
            }
            vscodeApi.postMessage({
                type: 'conversion_error',
                error: error.message || 'Conversion failed'
            });
        }
    }
});

/**
 * Convert SVG to specified format using Canvas API
 * @param {string} svgContent - SVG content to convert
 * @param {string} format - Target format (png, jpg, pdf)
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} backgroundColor - Background color
 * @returns {Promise<string>} Base64 encoded image data
 */
async function convertSvgToFormat(svgContent, format, width, height, backgroundColor) {
    return new Promise((resolve, reject) => {
        // Create canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        // Set background color
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Create image element
        const img = new Image();
        
        img.onload = () => {
            try {
                // Calculate proper scaling to maintain aspect ratio
                const imgAspectRatio = img.naturalWidth / img.naturalHeight;
                const canvasAspectRatio = width / height;
                
                let drawWidth, drawHeight, offsetX, offsetY;
                
                if (imgAspectRatio > canvasAspectRatio) {
                    // Image is wider - fit to width
                    drawWidth = width;
                    drawHeight = width / imgAspectRatio;
                    offsetX = 0;
                    offsetY = (height - drawHeight) / 2;
                } else {
                    // Image is taller - fit to height
                    drawHeight = height;
                    drawWidth = height * imgAspectRatio;
                    offsetX = (width - drawWidth) / 2;
                    offsetY = 0;
                }
                
                // Clear canvas first
                ctx.clearRect(0, 0, width, height);
                
                // Handle background color - JPG doesn't support transparency
                let finalBackgroundColor = backgroundColor;
                if (backgroundColor === 'transparent') {
                    if (format.toLowerCase() === 'jpg' || format.toLowerCase() === 'jpeg') {
                        finalBackgroundColor = '#ffffff'; // Default to white for JPG
                    }
                    // For PNG, leave transparent (no background fill)
                } 
                
                if (finalBackgroundColor !== 'transparent') {
                    ctx.fillStyle = finalBackgroundColor;
                    ctx.fillRect(0, 0, width, height);
                }
                
                // Draw SVG to canvas with proper scaling
                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                
                // Convert canvas to target format
                let mimeType;
                switch (format.toLowerCase()) {
                    case 'png':
                        mimeType = 'image/png';
                        break;
                    case 'jpg':
                    case 'jpeg':
                        mimeType = 'image/jpeg';
                        break;
                    default:
                        throw new Error(`Unsupported format: ${format}`);
                }
                
                const dataUrl = canvas.toDataURL(mimeType, 0.9);
                resolve(dataUrl);
                
            } catch (error) {
                reject(new Error(`Canvas conversion failed: ${error.message}`));
            }
        };
        
        img.onerror = () => {
            reject(new Error('Failed to load SVG into image'));
        };
        
        // Convert SVG to data URL - encode as base64 for better compatibility
        const svgBase64 = btoa(unescape(encodeURIComponent(svgContent)));
        img.src = `data:image/svg+xml;base64,${svgBase64}`;
    });
}

console.log('Mermaid webview bundle loaded successfully');