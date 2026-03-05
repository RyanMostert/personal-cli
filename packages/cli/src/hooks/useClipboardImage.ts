// Reads an image from the clipboard (if present in PNG format as base64) and writes it to a temp file.
// Returns { path, name, mimeType } if found, else null.

import clipboardy from 'clipboardy';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function extractClipboardImage() {
  try {
    const text = await clipboardy.read();
    if (/^data:image\/png;base64,/.test(text)) {
      const base64 = text.replace(/^data:image\/png;base64,/, '');
      const fileName = `clipboard-${uuidv4()}.png`;
      const tempPath = path.join(os.tmpdir(), fileName);
      fs.writeFileSync(tempPath, Buffer.from(base64, 'base64'));
      return {
        path: tempPath,
        name: fileName,
        mimeType: 'image/png',
      };
    }
    // TODO: Add support for other image types or clipboard formats here
  } catch (err) {
    // Ignore for now
  }
  return null;
}
