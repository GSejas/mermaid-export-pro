#!/usr/bin/env node

/**
 * Banner Generator for Health Watch Documentation
 * 
 * Creates SVG banners with consistent styling and converts them to base64 data URLs
 * for use in markdown files.
 * 
 * Usage: node scripts/create-banner.js "Banner Title" "Subtitle" "Bottom Text" [theme]
 */

const fs = require('fs');
const path = require('path');

// Predefined themes with colors and patterns
const THEMES = {
  architecture: {
    background: '#1f2937',
    pattern: 'circuit',
    accent: '#10b981',
    title: 'white',
    subtitle: '#10b981',
    emoji: '🏗️'
  },
  testing: {
    background: '#0f172a',
    pattern: 'grid',
    accent: '#3b82f6',
    title: 'white',
    subtitle: '#3b82f6',
    emoji: '🧪'
  },
  planning: {
    background: '#581c87',
    pattern: 'dots',
    accent: '#a855f7',
    title: 'white',
    subtitle: '#a855f7',
    emoji: '📋'
  },
  monitoring: {
    background: '#dc2626',
    pattern: 'waves',
    accent: '#fbbf24',
    title: 'white',
    subtitle: '#fbbf24',
    emoji: '📊'
  },
  implementation: {
    background: '#065f46',
    pattern: 'hex',
    accent: '#34d399',
    title: 'white',
    subtitle: '#34d399',
    emoji: '⚙️'
  }
};

// Pattern definitions
const PATTERNS = {
  circuit: `
    <pattern id="pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="BACKGROUND"/>
      <circle cx="10" cy="10" r="2" fill="ACCENT" opacity="0.3"/>
    </pattern>`,
  
  grid: `
    <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="BACKGROUND"/>
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="ACCENT" stroke-width="1" opacity="0.2"/>
    </pattern>`,
  
  dots: `
    <pattern id="pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
      <rect width="30" height="30" fill="BACKGROUND"/>
      <circle cx="15" cy="15" r="3" fill="ACCENT" opacity="0.25"/>
    </pattern>`,
  
  waves: `
    <pattern id="pattern" x="0" y="0" width="60" height="20" patternUnits="userSpaceOnUse">
      <rect width="60" height="20" fill="BACKGROUND"/>
      <path d="M0,10 Q15,5 30,10 T60,10" stroke="ACCENT" stroke-width="2" fill="none" opacity="0.3"/>
    </pattern>`,
  
  hex: `
    <pattern id="pattern" x="0" y="0" width="28" height="24" patternUnits="userSpaceOnUse">
      <rect width="28" height="24" fill="BACKGROUND"/>
      <polygon points="14,2 24,8 24,16 14,22 4,16 4,8" fill="none" stroke="ACCENT" stroke-width="1" opacity="0.2"/>
    </pattern>`
};

function createBanner(title, subtitle = '', bottomText = '', themeName = 'architecture') {
  const theme = THEMES[themeName] || THEMES.architecture;
  const pattern = PATTERNS[theme.pattern]
    .replace(/BACKGROUND/g, theme.background)
    .replace(/ACCENT/g, theme.accent);
  
  const svg = `<svg width="800" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${pattern}
  </defs>
  <rect width="800" height="100" fill="url(#pattern)"/>
  <text x="400" y="35" font-family="Arial Black" font-size="24" fill="${theme.title}" text-anchor="middle">${title}</text>
  ${subtitle ? `<text x="400" y="55" font-family="Arial" font-size="14" fill="${theme.subtitle}" text-anchor="middle">${subtitle}</text>` : ''}
  ${bottomText ? `<text x="400" y="75" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.7)" text-anchor="middle">${theme.emoji} ${bottomText}</text>` : ''}
</svg>`;

  return svg;
}

function svgToBase64DataUrl(svg) {
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

function generateMarkdownBanner(title, subtitle = '', bottomText = '', themeName = 'architecture') {
  const svg = createBanner(title, subtitle, bottomText, themeName);
  const dataUrl = svgToBase64DataUrl(svg);
  return `![${title} Banner](${dataUrl})`;
}

// CLI usage
if (require.main === module) {
  const [,, title, subtitle, bottomText, themeName] = process.argv;
  
  if (!title) {
    console.log('Usage: node create-banner.js "Title" "Subtitle" "Bottom Text" [theme]');
    console.log('Available themes:', Object.keys(THEMES).join(', '));
    process.exit(1);
  }
  
  console.log('Generated Banner Markdown:');
  console.log('');
  console.log(generateMarkdownBanner(title, subtitle, bottomText, themeName));
  console.log('');
  console.log('Copy the line above and paste it into your markdown file.');
}

module.exports = {
  createBanner,
  svgToBase64DataUrl,
  generateMarkdownBanner,
  THEMES
};