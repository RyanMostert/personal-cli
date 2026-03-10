import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../context/ThemeContext.js';
import type { Attachment } from '@personal-cli/shared';
import { formatAttachmentForDisplay } from '@personal-cli/shared';

// Simple local MIME/text file detection
type MaybeString = string | undefined;
function isTextFile(mime: MaybeString, name: MaybeString) {
  if (!mime && !name) return false;
  if (mime?.startsWith('text/')) return true;
  if (/\.(txt|md|js|ts|json|csv|log)$/i.test(name || '')) return true;
  return false;
}

import fs from 'fs';

interface Props {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
}

// Helper to preview text file's first N lines
function TextFilePreview({ path, lines = 5 }: { path: string; lines?: number }) {
  const [preview, setPreview] = useState<string>('');
  useEffect(() => {
    if (!fs.existsSync(path)) {
      setPreview('[File not found]');
      return;
    }
    try {
      const all = fs.readFileSync(path, 'utf-8');
      setPreview(all.split('\n').slice(0, lines).join('\n'));
    } catch (err) {
      setPreview('[Unable to preview file]');
    }
  }, [path, lines]);
  return <Text dimColor>{preview}</Text>;
}

export function AttachmentPreview({ attachments, onRemove }: Props) {
  const theme = useTheme();

  if (attachments.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      <Text color={theme.dim}>Attachments:</Text>
      {attachments.map((att) => (
        <Box key={att.id} flexDirection="column">
          <Text>
            {formatAttachmentForDisplay(att)}
            {onRemove && (
              <Text color="red" bold>
                {' '}
                [x]
              </Text>
            )}
          </Text>
          {/* Text file preview */}
          {att.path && isTextFile(att.mimeType, att.name) && <TextFilePreview path={att.path} lines={5} />}
          {/* Image stub/metadata */}
          {att.type === 'image' && (
            <Text dimColor>
              Image (no dimensions/exif available) – type: {att.mimeType || 'unknown'}, size:{' '}
              {att.size || 'unknown'}
            </Text>
          )}
          {/* Error feedback for missing/unreadable files handled in TextFilePreview */}
        </Box>
      ))}
    </Box>
  );
}
