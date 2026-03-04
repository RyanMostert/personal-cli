import React from 'react';
import { Box, Text } from 'ink';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { useTheme } from '../context/ThemeContext.js';
import { ThoughtView } from './ThoughtView.js';

interface Props {
  text: string;
  thought?: string;
}

export function StreamingMessage({ text, thought }: Props) {
  const theme = useTheme();

  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      <Box marginBottom={0}>
        <Text color={theme.assistantLabel} bold>CPU </Text>
        <Text color={theme.dim}>❯ </Text>
        <Text color={theme.warning} bold>{thought && !text ? 'THINKING...' : 'LINKING...'}</Text>
      </Box>

      {thought && <ThoughtView text={thought} isStreaming={true} />}

      <Box paddingLeft={2} flexDirection="column">
        {text ? (
          <MarkdownRenderer text={text} />
        ) : !thought ? (
          <Text color={theme.dim} italic>accessing matrix...</Text>
        ) : null}
      </Box>
    </Box>
  );
}
