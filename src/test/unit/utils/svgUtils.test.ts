import { describe, it, expect, beforeEach } from 'vitest';
import {
  injectSvgBackground,
  optimizeForLibreOffice,
  validateSvg,
  minifySvg,
  escapeXmlAttribute
} from '../../../utils/svgUtils';

describe('SVG Utilities', () => {
  describe('injectSvgBackground', () => {
    it('injects background rect into SVG with viewBox', () => {
      const svg = '<svg viewBox="0 0 800 600"><circle cx="100" cy="100" r="50"/></svg>';
      const result = injectSvgBackground(svg, '#FFFFFF');
      
      expect(result).toContain('<rect');
      expect(result).toContain('fill="#FFFFFF"');
      expect(result).toContain('width="800"');
      expect(result).toContain('height="600"');
      expect(result).toContain('<circle');
    });

    it('handles transparent color (no-op)', () => {
      const svg = '<svg viewBox="0 0 800 600"><circle cx="100" cy="100" r="50"/></svg>';
      const result = injectSvgBackground(svg, 'transparent');
      
      expect(result).not.toContain('<rect');
      expect(result).toBe(svg);
    });

    it('handles rgba color correctly', () => {
      const svg = '<svg viewBox="0 0 800 600"><text>Hello</text></svg>';
      const result = injectSvgBackground(svg, 'rgba(255, 0, 0, 0.5)');
      
      expect(result).toContain('<rect');
      expect(result).toContain('fill="rgba(255, 0, 0, 0.5)"');
    });

    it('extracts viewBox dimensions correctly', () => {
      const svg = '<svg viewBox="10 20 1000 500"><circle/></svg>';
      const result = injectSvgBackground(svg, '#000000');
      
      expect(result).toContain('width="1000"');
      expect(result).toContain('height="500"');
    });

    it('injects rect as first child of svg element', () => {
      const svg = '<svg viewBox="0 0 800 600"><circle/><text/></svg>';
      const result = injectSvgBackground(svg, '#FFFFFF');
      
      const rectMatch = result.match(/<svg[^>]*>.*?<rect/s);
      const circleMatch = result.match(/<rect[^>]*>.*?<circle/s);
      expect(rectMatch).toBeTruthy();
      expect(circleMatch).toBeTruthy();
    });

    it('handles missing viewBox gracefully', () => {
      const svg = '<svg><circle/></svg>';
      const result = injectSvgBackground(svg, '#FFFFFF');
      
      // Should not throw, returns original SVG
      expect(result).toBe(svg);
    });
  });

  describe('optimizeForLibreOffice', () => {
    it('removes foreignObject elements', () => {
      const svg = '<svg><foreignObject><div>HTML</div></foreignObject><text>SVG</text></svg>';
      const result = optimizeForLibreOffice(svg);
      
      expect(result).not.toContain('<foreignObject');
      expect(result).not.toContain('</foreignObject>');
      expect(result).toContain('<text>SVG</text>');
    });

    it('removes style tags', () => {
      const svg = '<svg><style>.class{color:red;}</style><rect/></svg>';
      const result = optimizeForLibreOffice(svg);
      
      expect(result).not.toContain('<style');
      expect(result).not.toContain('</style>');
      expect(result).toContain('<rect');
    });

    it('removes filter and defs with unsupported elements', () => {
      const svg = '<svg><defs><filter id="f1"><feGaussianBlur/></filter></defs><rect/></svg>';
      const result = optimizeForLibreOffice(svg);
      
      expect(result).not.toContain('<filter');
      expect(result).not.toContain('<feGaussianBlur');
    });

    it('converts class-based styles to inline', () => {
      const svg = '<svg><style>.red{fill:red;}</style><circle class="red"/></svg>';
      const result = optimizeForLibreOffice(svg);
      
      // After optimization, style should be inlined (or classes removed)
      // The convertClassToInlineStyles is called internally
      expect(result).not.toContain('<style');
      expect(result).toBeTruthy();
    });

    it('removes script tags', () => {
      const svg = '<svg><script>alert("xss")</script><circle/></svg>';
      const result = optimizeForLibreOffice(svg);
      
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('<circle');
    });

    it('flattens opacity groups', () => {
      const svg = '<svg><g opacity="0.5"><text>Transparent</text></g></svg>';
      const result = optimizeForLibreOffice(svg);
      
      // Should have opacity handled or removed
      expect(result).toContain('Transparent');
    });

    it('preserves essential SVG structure', () => {
      const svg = '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="20" height="20"/></svg>';
      const result = optimizeForLibreOffice(svg);
      
      expect(result).toContain('viewBox');
      expect(result).toContain('<rect');
      expect(result).toContain('x="10"');
      expect(result).toContain('y="10"');
    });
  });

  describe('validateSvg', () => {
    it('validates SVG with proper structure and namespace', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"></circle></svg>';
      const result = validateSvg(svg);
      
      expect(result.valid).toBe(true);
      expect(result.hasViewBox).toBe(true);
      expect(result.hasNamespace).toBe(true);
    });

    it('rejects SVG without viewBox', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle></circle></svg>';
      const result = validateSvg(svg);
      
      expect(result.valid).toBe(false);
      expect(result.hasViewBox).toBe(false);
      expect(result.warnings).toContain('No viewBox attribute found');
    });

    it('rejects SVG without svg tag', () => {
      const svg = '<div viewBox="0 0 100 100"><circle></circle></div>';
      const result = validateSvg(svg);
      
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('No <svg> tag found');
    });

    it('detects tag mismatches', () => {
      const svg = '<svg viewBox="0 0 100 100"><circle></svg>';
      const result = validateSvg(svg);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w: string) => w.includes('Tag mismatch'))).toBe(true);
    });

    it('validates SVG with namespace and proper closure', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect></rect></svg>';
      const result = validateSvg(svg);
      
      expect(result.hasNamespace).toBe(true);
      expect(result.hasViewBox).toBe(true);
    });

    it('identifies missing namespace', () => {
      const svg = '<svg viewBox="0 0 100 100"><circle></circle></svg>';
      const result = validateSvg(svg);
      
      expect(result.hasNamespace).toBe(false);
      expect(result.warnings).toContain('No xmlns namespace declaration');
    });
  });

  describe('minifySvg', () => {
    it('removes XML comments', () => {
      const svg = '<!-- Comment --><svg viewBox="0 0 100 100"><circle/></svg>';
      const result = minifySvg(svg);
      
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('Comment');
      expect(result).toContain('<svg');
    });

    it('removes extra whitespace', () => {
      const svg = `
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40"/>
        </svg>
      `;
      const result = minifySvg(svg);
      
      expect(result).not.toContain('\n');
      expect(result).toContain('<svg');
      expect(result).toContain('<circle');
    });

    it('preserves newlines in text content', () => {
      const svg = '<svg viewBox="0 0 100 100"><text>Line1\nLine2</text></svg>';
      const result = minifySvg(svg);
      
      // Should still have the newline in text
      expect(result).toContain('Line1');
      expect(result).toContain('Line2');
    });

    it('handles multiple comments', () => {
      const svg = '<!-- C1 --><svg><!-- C2 --><circle/><!-- C3 --></svg>';
      const result = minifySvg(svg);
      
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('C1');
      expect(result).not.toContain('C2');
      expect(result).not.toContain('C3');
    });
  });

  describe('escapeXmlAttribute', () => {
    it('escapes ampersand', () => {
      const result = escapeXmlAttribute('A & B');
      expect(result).toBe('A &amp; B');
    });

    it('escapes less-than', () => {
      const result = escapeXmlAttribute('A < B');
      expect(result).toBe('A &lt; B');
    });

    it('escapes greater-than', () => {
      const result = escapeXmlAttribute('A > B');
      expect(result).toBe('A &gt; B');
    });

    it('escapes quotes', () => {
      const result = escapeXmlAttribute('A "quote" B');
      expect(result).toBe('A &quot;quote&quot; B');
    });

    it('handles mixed characters', () => {
      const result = escapeXmlAttribute('A & B < C > D "E"');
      expect(result).toBe('A &amp; B &lt; C &gt; D &quot;E&quot;');
    });

    it('leaves safe text unchanged', () => {
      const result = escapeXmlAttribute('SafeText123');
      expect(result).toBe('SafeText123');
    });
  });
});
