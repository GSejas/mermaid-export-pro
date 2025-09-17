import * as path from 'path';

export function generateOutputName(originalPath: string, format: string): string {
  const base = path.basename(originalPath, path.extname(originalPath));
  const safeFormat = format.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `${base}.${safeFormat}`;
}

export default { generateOutputName };
