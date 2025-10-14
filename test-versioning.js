/**
 * Test script to verify versioned vs overwrite naming behavior
 * Run with: node test-versioning.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simulate the AutoNaming logic
class TestAutoNaming {
  static async generateFileName(options) {
    const mode = options.mode || 'versioned';
    
    switch (mode) {
      case 'overwrite':
        return this.generateOverwriteName(options);
      case 'versioned':
      default:
        return this.generateSmartName(options);
    }
  }

  static async generateOverwriteName(options) {
    const { baseName, format, outputDirectory } = options;
    const numberMatch = baseName.match(/(\d+)$/);
    const diagramNumber = numberMatch ? numberMatch[1] : '1';
    const cleanBaseName = baseName.replace(/[-_]?\d+$/, '');
    const fileName = `${cleanBaseName}${diagramNumber}.${format}`;
    return path.join(outputDirectory, fileName);
  }

  static async generateSmartName(options) {
    const { baseName, format, content, outputDirectory } = options;
    
    const hash = crypto.createHash('sha256')
      .update(content.trim())
      .digest('hex')
      .substring(0, 8);
    
    // Check if a file with this hash already exists
    const existingFile = await this.findFileByHash(baseName, hash, outputDirectory, format);
    if (existingFile) {
      console.log(`  ✓ Found existing file with same hash: ${path.basename(existingFile)}`);
      return existingFile;
    }
    
    // New content - find next available sequence number
    const sequence = await this.getNextSequenceNumber(baseName, outputDirectory, format);
    const fileName = `${baseName}-${sequence.toString().padStart(2, '0')}-${hash}.${format}`;
    
    return path.join(outputDirectory, fileName);
  }

  static async findFileByHash(baseName, hash, directory, format) {
    try {
      if (!fs.existsSync(directory)) {
        return null;
      }

      const files = fs.readdirSync(directory);
      const pattern = new RegExp(`^${this.escapeRegex(baseName)}-(\\d{2})-${this.escapeRegex(hash)}\\.${format}$`);
      
      for (const file of files) {
        if (pattern.test(file)) {
          return path.join(directory, file);
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  static async getNextSequenceNumber(baseName, directory, format) {
    try {
      if (!fs.existsSync(directory)) {
        return 1;
      }

      const files = fs.readdirSync(directory);
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
      return 1;
    }
  }

  static escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

async function testVersionedMode() {
  console.log('\n=== TESTING VERSIONED MODE ===\n');
  
  const testDir = path.join(__dirname, 'test-output-versioned');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  const contentA = 'graph TD; A-->B';
  const contentB = 'graph TD; A-->B-->C';

  console.log('Test 1: Export same content twice');
  const file1 = await TestAutoNaming.generateFileName({
    baseName: 'diagram',
    format: 'svg',
    content: contentA,
    outputDirectory: testDir,
    mode: 'versioned'
  });
  console.log(`  First export: ${path.basename(file1)}`);
  fs.writeFileSync(file1, contentA); // Simulate export
  
  const file2 = await TestAutoNaming.generateFileName({
    baseName: 'diagram',
    format: 'svg',
    content: contentA,
    outputDirectory: testDir,
    mode: 'versioned'
  });
  console.log(`  Second export (same content): ${path.basename(file2)}`);
  console.log(`  Result: ${file1 === file2 ? '✓ REUSED' : '✗ NEW FILE'}`);

  console.log('\nTest 2: Export different content');
  const file3 = await TestAutoNaming.generateFileName({
    baseName: 'diagram',
    format: 'svg',
    content: contentB,
    outputDirectory: testDir,
    mode: 'versioned'
  });
  console.log(`  Third export (different content): ${path.basename(file3)}`);
  fs.writeFileSync(file3, contentB); // Simulate export
  console.log(`  Result: ${file3 !== file1 ? '✓ NEW FILE' : '✗ REUSED'}`);

  console.log('\nTest 3: Export first content again');
  const file4 = await TestAutoNaming.generateFileName({
    baseName: 'diagram',
    format: 'svg',
    content: contentA,
    outputDirectory: testDir,
    mode: 'versioned'
  });
  console.log(`  Fourth export (back to first content): ${path.basename(file4)}`);
  console.log(`  Result: ${file4 === file1 ? '✓ REUSED file1' : '✗ NOT REUSED'}`);

  console.log(`\nFiles in directory:`);
  fs.readdirSync(testDir).forEach(f => console.log(`  - ${f}`));
}

async function testOverwriteMode() {
  console.log('\n=== TESTING OVERWRITE MODE ===\n');
  
  const testDir = path.join(__dirname, 'test-output-overwrite');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  const contentA = 'graph TD; A-->B';
  const contentB = 'graph TD; A-->B-->C';

  console.log('Test 1: Export same content twice');
  const file1 = await TestAutoNaming.generateFileName({
    baseName: 'diagram1',
    format: 'svg',
    content: contentA,
    outputDirectory: testDir,
    mode: 'overwrite'
  });
  console.log(`  First export: ${path.basename(file1)}`);
  fs.writeFileSync(file1, contentA); // Simulate export
  
  const file2 = await TestAutoNaming.generateFileName({
    baseName: 'diagram1',
    format: 'svg',
    content: contentA,
    outputDirectory: testDir,
    mode: 'overwrite'
  });
  console.log(`  Second export (same content): ${path.basename(file2)}`);
  console.log(`  Result: ${file1 === file2 ? '✓ SAME NAME (will overwrite)' : '✗ DIFFERENT NAME'}`);

  console.log('\nTest 2: Export different content');
  const file3 = await TestAutoNaming.generateFileName({
    baseName: 'diagram1',
    format: 'svg',
    content: contentB,
    outputDirectory: testDir,
    mode: 'overwrite'
  });
  console.log(`  Third export (different content): ${path.basename(file3)}`);
  fs.writeFileSync(file3, contentB); // Simulate export
  console.log(`  Result: ${file3 === file1 ? '✓ SAME NAME (overwrote)' : '✗ DIFFERENT NAME'}`);

  console.log(`\nFiles in directory:`);
  fs.readdirSync(testDir).forEach(f => console.log(`  - ${f}`));
  console.log(`  Note: Should only have 1 file in overwrite mode`);
}

async function main() {
  console.log('Testing AutoNaming Logic - Versioned vs Overwrite');
  console.log('================================================');
  
  await testVersionedMode();
  await testOverwriteMode();
  
  console.log('\n=== SUMMARY ===');
  console.log('Versioned mode: Creates unique files with hash, reuses if content matches');
  console.log('Overwrite mode: Always uses same filename, overwrites existing file');
}

main().catch(console.error);
