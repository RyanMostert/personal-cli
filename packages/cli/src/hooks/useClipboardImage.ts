// Reads an image from the clipboard and writes it to a temp file.
// Supports base64-encoded images (PNG, JPEG, GIF, WEBP) and native clipboard images via Python/Pillow.
// Returns { path, name, mimeType } if found, else null.

import clipboardy from 'clipboardy';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const SUPPORTED_BASE64_TYPES = [
  { regex: /^data:image\/png;base64,/, ext: '.png', mime: 'image/png' },
  { regex: /^data:image\/jpeg;base64,/, ext: '.jpg', mime: 'image/jpeg' },
  { regex: /^data:image\/gif;base64,/, ext: '.gif', mime: 'image/gif' },
  { regex: /^data:image\/webp;base64,/, ext: '.webp', mime: 'image/webp' },
];

export async function extractClipboardImage() {
  try {
    const text = await clipboardy.read();
<<<<<<< HEAD
    
=======

>>>>>>> tools_improvement
    // 1. Try base64 detection
    if (text.startsWith('data:image/')) {
      for (const type of SUPPORTED_BASE64_TYPES) {
        if (type.regex.test(text)) {
          const base64 = text.replace(type.regex, '');
          const fileName = `clipboard-${uuidv4()}${type.ext}`;
          const tempPath = path.join(os.tmpdir(), fileName);
          fs.writeFileSync(tempPath, Buffer.from(base64, 'base64'));
          return {
            path: tempPath,
            name: fileName,
            mimeType: type.mime,
          };
        }
      }
      return { error: 'Unsupported base64 image format in clipboard.' };
    }

    // 2. Try native clipboard via Python script
    try {
      const fileName = `clipboard-${uuidv4()}.png`;
      const tempPath = path.join(os.tmpdir(), fileName);
<<<<<<< HEAD
      
      // Try to find the script
      const scriptName = 'save_clipboard_image.py';
      let scriptPath = '';
      
=======

      // Try to find the script
      const scriptName = 'save_clipboard_image.py';
      let scriptPath = '';

>>>>>>> tools_improvement
      // Attempt to resolve script path from source and dist locations
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const possiblePaths = [
        path.join(__dirname, '..', '..', 'scripts', scriptName), // from src/hooks/
<<<<<<< HEAD
        path.join(__dirname, '..', 'scripts', scriptName),       // from dist/ (if scripts copied)
=======
        path.join(__dirname, '..', 'scripts', scriptName), // from dist/ (if scripts copied)
>>>>>>> tools_improvement
        path.join(process.cwd(), 'packages', 'cli', 'scripts', scriptName), // from project root
        path.join(process.cwd(), 'scripts', scriptName), // from package root
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          scriptPath = p;
          break;
        }
      }

      if (scriptPath) {
        try {
          execSync(`python "${scriptPath}" "${tempPath}"`, { stdio: 'pipe' });
          if (fs.existsSync(tempPath)) {
            return {
              path: tempPath,
              name: fileName,
              mimeType: 'image/png',
            };
          }
        } catch (execErr: any) {
          // If the script exited with code 2, it means NO_IMAGE, which is fine.
          // If it exited with code 1, there might be a dependency issue (like Pillow).
          if (execErr.status === 1) {
            const stderr = execErr.stderr?.toString() || '';
            const stdout = execErr.stdout?.toString() || '';
            if (stdout.includes('Pillow') || stderr.includes('Pillow')) {
<<<<<<< HEAD
              return { error: 'Native clipboard image support requires Pillow. Run: pip install Pillow' };
=======
              return {
                error: 'Native clipboard image support requires Pillow. Run: pip install Pillow',
              };
>>>>>>> tools_improvement
            }
            if (stdout.includes('not supported') || stderr.includes('not supported')) {
              return { error: 'Clipboard image extraction not supported on this platform.' };
            }
          }
        }
      }
    } catch (pyErr) {
      // General python script setup error, ignore and fall through
    }
<<<<<<< HEAD

=======
>>>>>>> tools_improvement
  } catch (err: any) {
    return { error: `Clipboard read error: ${err.message}` };
  }
  return null;
}
