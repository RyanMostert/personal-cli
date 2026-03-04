import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isDisabled?: boolean;
  isStreaming?: boolean;
  attachedFiles?: { path: string }[];
}

export function InputBox({ value, onChange, onSubmit, isDisabled = false, isStreaming = false, attachedFiles = [] }: Props) {
  const theme = useTheme();
  const lines = value.split('\n');
  const lineCount = lines.length;
  const isMultiLine = lineCount > 1;

  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const imageCount = attachedFiles.filter(f => 
    imageExtensions.some(ext => f.path.toLowerCase().endsWith(ext))
  ).length;

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
          {imageCount > 0 && (
            <Text color={theme.primary}> [image {imageCount}] </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
