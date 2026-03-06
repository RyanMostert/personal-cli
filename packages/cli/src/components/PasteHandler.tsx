import { Box, Text } from 'ink';
import React, { useEffect } from 'react';
import { extractClipboardImage } from '../hooks/useClipboardImage.js';
import clipboardy from 'clipboardy';
import fs from 'fs';
import path from 'path';

interface Props {
  onAttach: (attachment: { path: string; name: string; type: string; mimeType: string }) => void;
}

// Listen for Ctrl+V and try to extract an image or a file path from the clipboard
export const PasteHandler: React.FC<Props> = ({ onAttach }) => {
  useEffect(() => {
    const handlePaste = async () => {
      // 1. Try Image extraction (base64 PNG)
      const img = await extractClipboardImage();
      if (img && 'error' in img) {
        // Log error but proceed to path detection as fallback
        onAttach({ path: '', name: '', type: 'error', mimeType: img.error as string });
        return;
      } else if (img) {
        onAttach({ ...(img as { path: string; name: string; mimeType: string }), type: 'image' });
        return;
      }

      // 2. Try Path detection (string looks like a file path)
      try {
        const text = (await clipboardy.read()).trim();
        // Remove quotes if any (common in some terminals when dropping)
        const cleanPath = text.replace(/^["'](.*)["']$/, '$1');

        if (fs.existsSync(cleanPath)) {
          const stats = fs.statSync(cleanPath);
          if (stats.isFile()) {
            onAttach({
              path: cleanPath,
              name: path.basename(cleanPath),
              type: 'path',
              mimeType: 'application/octet-stream',
            });
          }
        }
      } catch (err) {
        // Ignore
      }
    };

    const handleData = (chunk: Buffer) => {
      // Detect Ctrl+V manually (raw buffer, ascii 22)
      if (chunk.includes(22)) {
        handlePaste();
      }
    };

    process.stdin.on('data', handleData);
    return () => {
      process.stdin.removeListener('data', handleData);
    };
  }, [onAttach]);

  return null;
};
