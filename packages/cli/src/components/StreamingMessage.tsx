import React from 'react';
import { Box, Text } from 'ink';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  text: string;
}

export function StreamingMessage({ text }: Props) {
  const theme = useTheme();

  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      <Box marginBottom={0}>
        <Text color={theme.assistantLabel} bold>CPU </Text>
        <Text color={theme.dim}>❯ </Text>
        <Text color={theme.warning} bold>LINKING...</Text>
      </Box>
      <Box paddingLeft={2} flexDirection="column">
        {text ? (
          <MarkdownRenderer text={text} />
        ) : (
          <Text color={theme.dim} italic>accessing matrix...</Text>
        )}
      </Box>
    </Box>
  );
}
