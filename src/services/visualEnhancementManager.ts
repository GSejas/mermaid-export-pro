/**
 * Visual Enhancement Manager - Premium styling and post-processing for Mermaid diagrams
 * 
 * Features:
 * - Premium theme packs (Modern, Corporate, Artistic, Minimal)
 * - Advanced color palettes with color theory
 * - Typography enhancements with premium fonts
 * - SVG post-processing effects (shadows, gradients, icons)
 * - Feature flag controlled enhancements
 */

import * as vscode from 'vscode';
import { ExportOptions } from '../types';

export type PremiumStyle = 'default' | 'modern' | 'corporate' | 'artistic' | 'minimal' | 'sketch';
export type PremiumTypography = 'default' | 'premium' | 'handwritten';
export type PremiumEffects = 'none' | 'subtle' | 'dramatic';
export type PremiumIconSet = 'default' | 'feather' | 'heroicons' | 'lucide';

export interface VisualEnhancementOptions {
  enabled: boolean;
  style: PremiumStyle;
  animations: boolean;
  customPalette: boolean;
  typography: PremiumTypography;
  effects: PremiumEffects;
  iconSet: PremiumIconSet;
}

export interface ThemePack {
  name: string;
  description: string;
  mermaidConfig: any;
  postProcessors: PostProcessor[];
  preview: string;
}

export interface PostProcessor {
  name: string;
  process: (svg: string, options: VisualEnhancementOptions) => string;
}




/**
 * Manages visual enhancement settings and applies them to Mermaid export options and generated SVGs.
 *
 * This service reads user-configured visual enhancements from the workspace configuration
 * and exposes helpers to:
 * - Retrieve the current enhancement options.
 * - Enumerate available theme packs (predefined palettes, typography and post-processing rules).
 * - Merge enhancement settings into a base set of export options (mermaid configuration).
 * - Post-process an exported SVG by applying theme-specific post-processors (filters, gradients,
 *   rounded corners, sketch effects, etc.) in sequence.
 *
 * Key behaviors
 * - The manager respects a top-level "enabled" flag in the enhancement options: when disabled,
 *   enhanceExportOptions returns the provided base options unchanged and postProcessSvg returns
 *   the unmodified SVG.
 * - When enabled, enhanceExportOptions merges:
 *   - the base mermaidConfig (if any),
 *   - the selected theme pack's mermaidConfig,
 *   - typography overrides derived from the selected typography preset, and
 *   - an optional custom color palette (applied only when customPalette is true).
 * - postProcessSvg retrieves the theme pack matching the selected style and applies each of its
 *   postProcessors in order; each processor receives the SVG text and the active options and must
 *   return the transformed SVG text.
 *
 * Theme packs
 * - The manager ships several built-in packs (Modern, Corporate, Artistic, Minimal, Sketch).
 *   Each pack provides:
 *   - name, description and preview text,
 *   - a mermaidConfig block (themeVariables, flowchart settings, etc.),
 *   - an ordered array of postProcessors that implement visual transformations on the raw SVG.
 *
 * Implementation notes
 * - The class stores a configuration key constant for persistence/lookup but reads runtime options
 *   from the workspace configuration ("mermaidExportPro.visualEnhancements").
 * - The public API is intentionally small: retrieving options, listing theme packs, enhancing options,
 *   and post-processing SVG output. The rest of the functionality (processor factories, palette and
 *   typography lookups, and theme pack construction) is encapsulated as private helpers.
 *
 * Constructor
 * @param context - The extension context (vscode.ExtensionContext). Stored for potential future
 *   persistence or resource management related to enhancement state.
 *
 * Methods
 * @method getEnhancementOptions
 * @returns The current VisualEnhancementOptions object (enabled, style, animations, customPalette,
 *   typography, effects, iconSet). If fields are missing in configuration sensible defaults are used.
 *
 * @method getAvailableThemePacks
 * @returns An array of ThemePack objects describing the available presets. Each ThemePack contains
 *   mermaid configuration and postProcessors appropriate for the visual style.
 *
 * @method enhanceExportOptions
 * @param baseOptions - The original ExportOptions object that will be merged with enhancement settings.
 * @returns A new ExportOptions object with an enhanced mermaidConfig when enhancements are enabled;
 *   otherwise returns the original baseOptions unchanged. The merge preserves base settings while
 *   layering themeVariables, typography and optional custom palette values on top.
 *
 * @method postProcessSvg
 * @param svg - The raw exported SVG string to be transformed.
 * @param options - The VisualEnhancementOptions controlling which theme and processors to apply.
 * @returns A Promise that resolves to the transformed SVG string. If enhancements are disabled,
 *   the original svg is returned immediately.
 *
 * Example
 * ```ts
 * // Constructing and using the manager
 * const manager = new VisualEnhancementManager(context);
 * const opts = manager.getEnhancementOptions();
 * const enhanced = manager.enhanceExportOptions(baseExportOptions);
 * const finalSvg = await manager.postProcessSvg(rawSvg, opts);
 * ```
 *
 * Thread-safety & performance
 * - All public methods are synchronous except postProcessSvg (returns a Promise). Post-processors
 *   operate on string transformations and are applied sequentially; expensive or asynchronous
 *   processors should be implemented accordingly.
 *
 * @public
 */
export class VisualEnhancementManager {
  private static readonly ENHANCEMENT_KEY = 'mermaidExportPro.visualEnhancements';
  
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Get current visual enhancement settings
   */
  getEnhancementOptions(): VisualEnhancementOptions {
    const config = vscode.workspace.getConfiguration('mermaidExportPro');
    const enhancements = config.get('visualEnhancements', {}) as any;
    
    return {
      enabled: enhancements.enabled ?? false,
      style: enhancements.style ?? 'default',
      animations: enhancements.animations ?? false,
      customPalette: enhancements.customPalette ?? true,
      typography: enhancements.typography ?? 'default',
      effects: enhancements.effects ?? 'subtle',
      iconSet: enhancements.iconSet ?? 'default'
    };
  }

  /**
   * Get available theme packs
   */
  getAvailableThemePacks(): ThemePack[] {
    return [
      this.createModernThemePack(),
      this.createCorporateThemePack(),
      this.createArtisticThemePack(),
      this.createMinimalThemePack(),
      this.createSketchThemePack()
    ];
  }

  /**
   * Apply visual enhancements to export options
   */
  enhanceExportOptions(baseOptions: ExportOptions): ExportOptions {
    const enhancements = this.getEnhancementOptions();
    
    if (!enhancements.enabled) {
      return baseOptions;
    }

    const themePack = this.getThemePack(enhancements.style);
    
    return {
      ...baseOptions,
      // Merge enhanced mermaid configuration
      mermaidConfig: {
        ...(baseOptions.mermaidConfig || {}),
        ...themePack.mermaidConfig,
        // Apply typography enhancements
        ...this.getTypographyConfig(enhancements.typography),
        // Apply color palette
        ...(enhancements.customPalette ? this.getColorPalette(enhancements.style) : {})
      }
    };
  }

  /**
   * Post-process SVG with visual enhancements
   */
  async postProcessSvg(svg: string, options: VisualEnhancementOptions): Promise<string> {
    if (!options.enabled) {
      return svg;
    }

    let processedSvg = svg;
    const themePack = this.getThemePack(options.style);
    
    // Apply each post-processor in sequence
    for (const processor of themePack.postProcessors) {
      processedSvg = processor.process(processedSvg, options);
    }
    
    return processedSvg;
  }

  private createModernThemePack(): ThemePack {
    return {
      name: 'Modern',
      description: 'Clean, contemporary design with gradients and subtle shadows',
      preview: '🎨 Gradients, rounded corners, modern typography',
      mermaidConfig: {
        theme: 'default',
        themeVariables: {
          // Modern color palette - Dramatic blues and teals
          primaryColor: '#2563EB',           // Bright modern blue
          primaryTextColor: '#FFFFFF',
          primaryBorderColor: '#1D4ED8',
          lineColor: '#4F46E5',              // Purple-blue connections
          secondaryColor: '#DBEAFE',         // Light blue backgrounds
          tertiaryColor: '#93C5FD',          // Medium blue accents
          // Background handled by CLI backgroundColor argument
          
          // Enhanced contrast and modern styling
          cScale0: '#2563EB',
          cScale1: '#10B981', 
          cScale2: '#F59E0B',
          cScale3: '#EF4444',
          cScale4: '#8B5CF6',
          
          // Typography - Modern and clean
          fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
          fontSize: '15px',
          fontWeight: '500',
          
          // Border enhancements
          secondaryBorderColor: '#059669',
          tertiaryBorderColor: '#D97706'
        },
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          useMaxWidth: false,
          padding: 20
        }
      },
      postProcessors: [
        this.createShadowProcessor(),
        this.createGradientProcessor(),
        this.createRoundedCornersProcessor()
      ]
    };
  }

  private createCorporateThemePack(): ThemePack {
    return {
      name: 'Corporate',
      description: 'Professional business presentation style',
      preview: '💼 Professional colors, clean lines, business-ready',
      mermaidConfig: {
        theme: 'default',
        themeVariables: {
          // Corporate palette - Navy and grays
          primaryColor: '#1E293B',
          primaryTextColor: '#FFFFFF',
          primaryBorderColor: '#0F172A',
          lineColor: '#475569',
          secondaryColor: '#F8FAFC',
          tertiaryColor: '#E2E8F0',
          // Background handled by CLI backgroundColor argument
          
          // Professional styling
          fontFamily: '"Roboto", "Arial", sans-serif',
          fontSize: '15px',
          fontWeight: '500'
        }
      },
      postProcessors: [
        this.createProfessionalStylingProcessor(),
        this.createIconProcessor()
      ]
    };
  }

  private createArtisticThemePack(): ThemePack {
    return {
      name: 'Artistic',
      description: 'Creative, colorful design with artistic flair',
      preview: '🎭 Vibrant colors, creative shapes, artistic expression',
      mermaidConfig: {
        theme: 'default',
        themeVariables: {
          // Artistic palette - SUPER vibrant and creative
          primaryColor: '#FF006E',           // Hot pink
          primaryTextColor: '#FFFFFF',
          primaryBorderColor: '#C77DFF',     // Purple border
          lineColor: '#7209B7',              // Deep purple lines
          secondaryColor: '#FFD23F',         // Bright yellow
          tertiaryColor: '#FB5607',          // Orange-red
          // Background handled by CLI backgroundColor argument
          
          // Rainbow color scale for variety
          cScale0: '#FF006E',  // Hot pink
          cScale1: '#8338EC',  // Purple  
          cScale2: '#3A86FF',  // Blue
          cScale3: '#06FFA5',  // Green
          cScale4: '#FFBE0B',  // Yellow
          cScale5: '#FB5607',  // Orange
          
          // Playful typography
          fontFamily: '"Comfortaa", "Fredoka One", cursive',
          fontSize: '16px',
          fontWeight: '600'
        },
        flowchart: {
          htmlLabels: true,
          curve: 'cardinal',    // More organic curves
          useMaxWidth: false,
          padding: 25
        }
      },
      postProcessors: [
        this.createArtisticEffectsProcessor(),
        this.createColorHarmonyProcessor()
      ]
    };
  }

  private createMinimalThemePack(): ThemePack {
    return {
      name: 'Minimal',
      description: 'Ultra-clean, minimal design inspired by Swiss design',
      preview: '⚪ Clean lines, minimal colors, maximum clarity',
      mermaidConfig: {
        theme: 'default',
        themeVariables: {
          // Minimal palette - Blacks, whites, one accent
          primaryColor: '#FFFFFF',
          primaryTextColor: '#000000',
          primaryBorderColor: '#000000',
          lineColor: '#000000',
          secondaryColor: '#FAFAFA',
          tertiaryColor: '#F5F5F5',
          
          // Minimal typography
          fontFamily: '"Helvetica Neue", "Arial", sans-serif',
          fontSize: '14px',
          fontWeight: '300'
        }
      },
      postProcessors: [
        this.createMinimalStylingProcessor()
      ]
    };
  }

  private createSketchThemePack(): ThemePack {
    return {
      name: 'Sketch',
      description: 'Hand-drawn, sketch-like appearance',
      preview: '✏️ Hand-drawn look, sketch effects, organic feel',
      mermaidConfig: {
        theme: 'default',
        themeVariables: {
          fontFamily: '"Kalam", "Comic Sans MS", cursive',
          fontSize: '16px'
        }
      },
      postProcessors: [
        this.createSketchEffectProcessor(),
        this.createHandDrawnProcessor()
      ]
    };
  }

  // Post-processor factory methods
  private createShadowProcessor(): PostProcessor {
    return {
      name: 'Drop Shadow',
      process: (svg: string, options: VisualEnhancementOptions): string => {
        // Add sophisticated shadow filter definition
        const shadowFilter = `
          <defs>
            <filter id="premium-drop-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
              <feOffset dx="3" dy="6" result="offset"/>
              <feFlood flood-color="rgba(0,0,0,0.3)"/>
              <feComposite in2="offset" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="premium-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="glow"/>
              <feMerge>
                <feMergeNode in="glow"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        `;
        
        // Find where to insert the filter definitions
        const defsMatch = svg.match(/<defs>/);
        let processedSvg;
        
        if (defsMatch) {
          // Insert after existing <defs>
          processedSvg = svg.replace('<defs>', '<defs>' + shadowFilter);
        } else {
          // Insert defs after the first <g> tag
          processedSvg = svg.replace('<g>', shadowFilter + '<g>');
        }
        
        // Apply shadows to shape elements
        processedSvg = processedSvg
          .replace(/<rect([^>]*class="[^"]*basic[^"]*"[^>]*)>/g, '<rect$1 filter="url(#premium-drop-shadow)">')
          .replace(/<polygon([^>]*points="[^"]*"[^>]*)>/g, '<polygon$1 filter="url(#premium-drop-shadow)">')
          .replace(/<circle([^>]*class="[^"]*"[^>]*)>/g, '<circle$1 filter="url(#premium-glow)">')
          .replace(/<ellipse([^>]*class="[^"]*"[^>]*)>/g, '<ellipse$1 filter="url(#premium-glow)">');
        
        return processedSvg;
      }
    };
  }

  private createGradientProcessor(): PostProcessor {
    return {
      name: 'Gradient Fill',
      process: (svg: string, options: VisualEnhancementOptions): string => {
        // Define style-specific gradient sets
        const gradientSets = {
          modern: `
            <linearGradient id="premium-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="premium-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#047857;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="premium-accent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#D97706;stop-opacity:1" />
            </linearGradient>`,
          corporate: `
            <linearGradient id="premium-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1E293B;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#0F172A;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="premium-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#475569;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#334155;stop-opacity:1" />
            </linearGradient>`,
          artistic: `
            <linearGradient id="premium-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#EC4899;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#BE185D;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="premium-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#7C3AED;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#5B21B6;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="premium-accent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#F97316;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#EA580C;stop-opacity:1" />
            </linearGradient>`
        };
        
        const currentGradients = gradientSets[options.style as keyof typeof gradientSets] || gradientSets.modern;
        
        // Find where to insert gradients
        const defsMatch = svg.match(/<defs>/);
        let processedSvg;
        
        if (defsMatch) {
          processedSvg = svg.replace('<defs>', '<defs>' + currentGradients);
        } else {
          processedSvg = svg.replace('<g>', `<defs>${currentGradients}</defs><g>`);
        }
        
        // Apply gradients to fills, being more aggressive about replacement
        processedSvg = processedSvg
          .replace(/fill="#ECECFF"/g, 'fill="url(#premium-primary)"')
          .replace(/fill="#f9f9f9"/g, 'fill="url(#premium-secondary)"')  
          .replace(/fill="#ffffff"/g, 'fill="url(#premium-primary)"')
          .replace(/fill="#9370DB"/g, 'fill="url(#premium-accent)"')
          .replace(/fill="rgb\(236,\s*236,\s*255\)"/g, 'fill="url(#premium-primary)"')
          .replace(/fill="white"/g, 'fill="url(#premium-primary)"');
        
        return processedSvg;
      }
    };
  }

  private createRoundedCornersProcessor(): PostProcessor {
    return {
      name: 'Rounded Corners',
      process: (svg: string, options: VisualEnhancementOptions): string => {
        // Apply different corner radii based on style
        const radiusMap = {
          modern: '12',
          corporate: '6', 
          artistic: '20',
          minimal: '4',
          sketch: '8'
        };
        
        const radius = radiusMap[options.style as keyof typeof radiusMap] || '8';
        
        return svg
          .replace(/<rect([^>]*class="[^"]*basic[^"]*"[^>]*)>/g, `<rect$1 rx="${radius}" ry="${radius}">`)
          .replace(/<rect([^>]*class="label-container"[^>]*)>/g, `<rect$1 rx="${Math.floor(parseInt(radius) / 2)}" ry="${Math.floor(parseInt(radius) / 2)}">`);
      }
    };
  }

  private createProfessionalStylingProcessor(): PostProcessor {
    return {
      name: 'Professional Styling',
      process: (svg: string, options: VisualEnhancementOptions): string => {
        // Apply professional styling transformations
        return svg
          .replace(/font-family:"[^"]*"/g, 'font-family:"Roboto", "Arial", sans-serif')
          .replace(/stroke-width:1px/g, 'stroke-width:2px');
      }
    };
  }

  private createIconProcessor(): PostProcessor {
    return {
      name: 'Icon Integration',
      process: (svg: string, options: VisualEnhancementOptions): string => {
        // This would integrate icons based on node content
        // For now, placeholder implementation
        return svg;
      }
    };
  }

  private createArtisticEffectsProcessor(): PostProcessor {
    return {
      name: 'Artistic Effects',
      process: (svg: string, options: VisualEnhancementOptions): string => {
        // Add multiple artistic filters and effects
        const artisticFilters = `
          <filter id="artistic-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feColorMatrix in="coloredBlur" values="1 0 1 0 0  0 1 1 0 0  1 0 1 0 0  0 0 0 1 0"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="artistic-vibrant" x="-20%" y="-20%" width="140%" height="140%">
            <feColorMatrix type="saturate" values="1.8"/>
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 .5 .5 .7 .8 .9 1"/>
            </feComponentTransfer>
          </filter>
          <filter id="artistic-texture" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence baseFrequency="0.9" numOctaves="4" result="noise" stitchTiles="stitch"/>
            <feColorMatrix in="noise" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 .05 0"/>
            <feComposite in2="SourceGraphic" operator="over"/>
          </filter>
        `;
        
        // Find where to insert filters
        const defsMatch = svg.match(/<defs>/);
        let processedSvg;
        
        if (defsMatch) {
          processedSvg = svg.replace('<defs>', '<defs>' + artisticFilters);
        } else {
          processedSvg = svg.replace('<g>', `<defs>${artisticFilters}</defs><g>`);
        }
        
        // Apply different artistic effects to different elements
        processedSvg = processedSvg
          .replace(/<rect([^>]*class="[^"]*basic[^"]*"[^>]*)>/g, '<rect$1 filter="url(#artistic-glow)">')
          .replace(/<polygon([^>]*points="[^"]*"[^>]*)>/g, '<polygon$1 filter="url(#artistic-vibrant)">')
          .replace(/<path([^>]*class="[^"]*arrowMarkerPath[^"]*"[^>]*)>/g, '<path$1 filter="url(#artistic-texture)">');
        
        // Enhance stroke width for artistic effect
        processedSvg = processedSvg
          .replace(/stroke-width:1px/g, 'stroke-width:3px')
          .replace(/stroke-width:2px/g, 'stroke-width:4px');
        
        return processedSvg;
      }
    };
  }

  private createColorHarmonyProcessor(): PostProcessor {
    return {
      name: 'Color Harmony',
      process: (svg: string, options: VisualEnhancementOptions): string => {
        // Apply color harmony rules - complementary, triadic, etc.
        return svg;
      }
    };
  }

  private createMinimalStylingProcessor(): PostProcessor {
    return {
      name: 'Minimal Styling',
      process: (svg: string, options: VisualEnhancementOptions): string => {
        // Apply ultra-minimal aesthetic
        return svg
          // Thin, precise strokes
          .replace(/stroke-width:1px/g, 'stroke-width:0.5px')
          .replace(/stroke-width:2px/g, 'stroke-width:1px')  
          .replace(/stroke-width:3\.5px/g, 'stroke-width:1.5px')
          
          // Minimal typography
          .replace(/font-family:"[^"]*"/g, 'font-family:"Helvetica Neue", "SF Pro Display", -apple-system, sans-serif')
          .replace(/font-size:16px/g, 'font-size:14px')
          .replace(/font-size:18px/g, 'font-size:16px')
          
          // Remove unnecessary visual noise
          .replace(/fill="#ECECFF"/g, 'fill="#FAFAFA"')
          .replace(/fill="#f9f9f9"/g, 'fill="#FFFFFF"')
          .replace(/stroke="#9370DB"/g, 'stroke="#000000"')
          .replace(/stroke="#333333"/g, 'stroke="#000000"')
          
          // Simplify colors to pure black/white/gray
          .replace(/fill="#333"/g, 'fill="#000000"')
          .replace(/stroke-dasharray:3/g, 'stroke-dasharray:2,4')
          .replace(/stroke-linecap:round/g, 'stroke-linecap:square');
      }
    };
  }

  private createSketchEffectProcessor(): PostProcessor {
    return {
      name: 'Sketch Effect',
      process: (svg: string, options: VisualEnhancementOptions): string => {
        // Add sophisticated hand-drawn sketch effects
        const sketchFilters = `
          <filter id="sketch-rough" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence baseFrequency="0.6" numOctaves="4" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2"/>
          </filter>
          <filter id="sketch-texture" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence baseFrequency="0.9" numOctaves="3" result="texture"/>
            <feColorMatrix in="texture" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 0.03 0"/>
            <feComposite in2="SourceGraphic" operator="multiply"/>
          </filter>
          <filter id="sketch-wobble" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence baseFrequency="0.02" numOctaves="2" result="wobble"/>
            <feDisplacementMap in="SourceGraphic" in2="wobble" scale="1.5"/>
          </filter>
        `;
        
        // Find where to insert filters
        const defsMatch = svg.match(/<defs>/);
        let processedSvg;
        
        if (defsMatch) {
          processedSvg = svg.replace('<defs>', '<defs>' + sketchFilters);
        } else {
          processedSvg = svg.replace('<g>', `<defs>${sketchFilters}</defs><g>`);
        }
        
        // Apply sketch effects to different elements
        processedSvg = processedSvg
          .replace(/<rect([^>]*class="[^"]*basic[^"]*"[^>]*)>/g, '<rect$1 filter="url(#sketch-rough)">')
          .replace(/<polygon([^>]*points="[^"]*"[^>]*)>/g, '<polygon$1 filter="url(#sketch-wobble)">')
          .replace(/<path([^>]*class="[^"]*edgePath[^"]*"[^>]*)>/g, '<path$1 filter="url(#sketch-texture)">');
        
        // Apply hand-drawn styling
        processedSvg = processedSvg
          // Make all lines slightly irregular
          .replace(/stroke-dasharray:0/g, 'stroke-dasharray:3,2,1,2')
          .replace(/stroke-linecap:butt/g, 'stroke-linecap:round')
          .replace(/stroke-linejoin:miter/g, 'stroke-linejoin:round')
          
          // Increase stroke width for hand-drawn feel
          .replace(/stroke-width:1px/g, 'stroke-width:2px')
          .replace(/stroke-width:2px/g, 'stroke-width:2.5px')
          
          // Add slight opacity variation
          .replace(/<rect([^>]*class="[^"]*basic[^"]*"[^>]*)>/g, '<rect$1 fill-opacity="0.85">');
        
        return processedSvg;
      }
    };
  }

  private createHandDrawnProcessor(): PostProcessor {
    return {
      name: 'Hand Drawn',
      process: (svg: string, options: VisualEnhancementOptions): string => {
        // Apply hand-drawn imperfections and organic curves
        return svg.replace(/font-family:"[^"]*"/g, 'font-family:"Kalam", "Comic Sans MS", cursive');
      }
    };
  }

  // Helper methods
  private getThemePack(style: string): ThemePack {
    const themePacks = this.getAvailableThemePacks();
    return themePacks.find(pack => pack.name.toLowerCase() === style) || themePacks[0];
  }

  private getTypographyConfig(typography: string): any {
    const typographyConfigs = {
      default: {},
      premium: {
        fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '16px',
        fontWeight: '500'
      },
      handwritten: {
        fontFamily: '"Kalam", "Caveat", "Comic Sans MS", cursive',
        fontSize: '17px'
      }
    };
    
    return typographyConfigs[typography as keyof typeof typographyConfigs] || typographyConfigs.default;
  }

  private getColorPalette(style: string): any {
    // Return style-specific color palettes
    const palettes = {
      modern: {
        primaryColor: '#3B82F6',
        secondaryColor: '#EFF6FF',
        accentColor: '#10B981'
      },
      corporate: {
        primaryColor: '#1E293B',
        secondaryColor: '#F8FAFC',
        accentColor: '#0EA5E9'
      },
      artistic: {
        primaryColor: '#EC4899',
        secondaryColor: '#FDF2F8',
        accentColor: '#7C3AED'
      },
      minimal: {
        primaryColor: '#000000',
        secondaryColor: '#FFFFFF',
        accentColor: '#6B7280'
      }
    };
    
    return palettes[style as keyof typeof palettes] || {};
  }
}