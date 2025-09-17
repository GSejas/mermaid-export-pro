import { describe, it, expect } from 'vitest';
import { generateOutputName } from '../../../services/fileProcessor';

describe('fileProcessor', () => {
  it('generates output name from original path and format', () => {
    const out = generateOutputName('docs/diagram.test.mmd', 'png');
    expect(out).toBe('diagram.test.png');
  });

  it('sanitizes format string', () => {
    const out = generateOutputName('diagram.mmd', 'svg+xml');
    expect(out).toBe('diagram.svgxml');
  });
});
