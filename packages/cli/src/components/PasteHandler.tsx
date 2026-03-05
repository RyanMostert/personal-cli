import { Box, Text } from 'ink';
import React, { useEffect } from 'react';
import { extractClipboardImage } from '../hooks/useClipboardImage';

interface Props {
  onAttach: (attachment: { path: string; name: string; type: string; mimeType: string }) => void;
}

// Listen for Ctrl+V and try to extract an image from the clipboard
export const PasteHandler: React.FC<Props> = ({ onAttach }) => {
  useEffect(() => {
    const handleKey = async (input: string, key: any) => {
      // Ctrl+V detection (platform dependent)
      if (key.ctrl && input === 'v') {
        const img = await extractClipboardImage();
        if (img) {
          onAttach({ ...img, type: 'image' });
        } else {
          // Optionally feedback for not-an-image
        }
      }
    };
    process.stdin.on('data', (chunk: Buffer) => {
      // Detect Ctrl+V manually (raw buffer, ascii 22)
      if (chunk.includes(22)) {
        extractClipboardImage().then(img => {
          if (img) onAttach({ ...img, type: 'image' });
        });
      }
    });
    return () => {
      process.stdin.removeAllListeners('data');
    };
  }, [onAttach]);
  return null;
};
