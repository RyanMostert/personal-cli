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

export function InputBox({
  value,
  onChange,
  onSubmit,
  isDisabled = false,
  isStreaming = false,
  attachedFiles = [],
}: Props) {
  const theme = useTheme();
  const lines = value.split('\n');
  const lineCount = lines.length;
  const isMultiLine = lineCount > 1;

  const hasAttachments = attachedFiles.length > 0;
  const imageCount = attachedFiles.filter((f) => f.type === 'image').length;
  const fileCount = attachedFiles.filter((f) => f.type === 'file').length;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={isStreaming ? theme.warning : isDisabled ? theme.dim : '#484F58'}
      paddingX={1}
      paddingY={0}
      flexShrink={0}
    >
      {/* Attachment Inventory Preview */}
      {hasAttachments && (
        <Box
          flexDirection="column"
          marginBottom={0}
          borderBottom
          borderStyle="single"
          borderColor={theme.dim}
          paddingY={0}
        >
          <Box marginBottom={0}>
            <Text color={theme.primary} bold>
              📦 INVENTORY:ATTACHMENTS{' '}
            </Text>
            <Text color={theme.dim}>[{attachedFiles.length} items]</Text>
          </Box>
          <Box flexDirection="row" flexWrap="wrap">
            {attachedFiles.map((att) => (
              <Box key={att.id} marginRight={2}>
                <Text color={att.type === 'image' ? theme.primary : theme.success}>
                  {att.type === 'image' ? '🖼️' : '📄'} {att.name.slice(0, 15)}
                  {att.name.length > 15 ? '…' : ''}
                </Text>
                {att.size && <Text color={theme.dim}> ({formatFileSize(att.size)})</Text>}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box marginTop={hasAttachments ? 0 : 0}>
        <Box marginRight={1} flexShrink={0}>
          <Text color={isDisabled ? theme.dim : theme.primary} bold>
            ❯
          </Text>
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
          {isMultiLine && <Text color="#484F58"> [pasted lines {lineCount}] </Text>}
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
