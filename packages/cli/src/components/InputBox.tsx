import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useTheme } from '../context/ThemeContext.js';
import type { Attachment } from '@personal-cli/shared';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isDisabled?: boolean;
  isStreaming?: boolean;
  attachedFiles?: Attachment[];
}

export function InputBox({ value, onChange, onSubmit, isDisabled = false, isStreaming = false, attachedFiles = [] }: Props) {
  const theme = useTheme();
  const lines = value.split('\n');
  const lineCount = lines.length;
  const isMultiLine = lineCount > 1;

  const hasAttachments = attachedFiles.length > 0;
  const imageCount = attachedFiles.filter(f => f.type === 'image').length;
  const fileCount = attachedFiles.filter(f => f.type === 'file').length;

  return (
    <Box
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={isStreaming ? theme.warning : (isDisabled ? theme.dim : '#484F58')}
      paddingX={1}
      paddingY={0}
      flexShrink={0}
      flexDirection="column"
    >
      {/* Show attachments above input */}
      {hasAttachments && (
        <Box flexDirection="column" marginBottom={0}>
          {attachedFiles.map((att) => (
            <Box key={att.id} flexDirection="row">
              <Text color={theme.dim}>├─</Text>
              <Text color={att.type === 'image' ? theme.primary : theme.success}>
                {att.type === 'image' ? '🖼️' : '📄'} {att.name}
              </Text>
              {att.size && (
                <Text color={theme.muted}> ({formatFileSize(att.size)})</Text>
              )}
            </Box>
          ))}
        </Box>
      )}
      
      <Box>
        <Box marginRight={1} flexShrink={0}>
          <Text color={isDisabled ? theme.dim : theme.primary} bold>❯</Text>
        </Box>
        <Box flexGrow={1}>
          <TextInput
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            placeholder={isStreaming ? 'esc to stop...' : isDisabled ? 'waiting...' : 'type /help for commands'}
            focus={!isDisabled && !isStreaming}
          />
        </Box>
        
        <Box paddingLeft={1} flexShrink={0}>
          {isMultiLine && (
            <Text color="#484F58"> [pasted lines {lineCount}] </Text>
          )}
          {hasAttachments && (
            <Text color={theme.primary}>
              {imageCount > 0 && ` [img ${imageCount}]`}
              {fileCount > 0 && ` [file ${fileCount}]`}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
