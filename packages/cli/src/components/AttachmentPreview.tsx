import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../context/ThemeContext.js';
import type { Attachment } from '@personal-cli/shared';
import { formatAttachmentForDisplay } from '@personal-cli/shared';

interface Props {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: Props) {
  const theme = useTheme();
  
  if (attachments.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      <Text color={theme.dim}>Attachments:</Text>
      {attachments.map((att) => (
        <Box key={att.id} flexDirection="row" paddingLeft={2}>
          <Text color={theme.primary}>{formatAttachmentForDisplay(att)}</Text>
          {onRemove && (
            <Text color={theme.error} dimColor> [Remove]</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
