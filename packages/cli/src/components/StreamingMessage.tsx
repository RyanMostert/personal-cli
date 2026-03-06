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
      {thought && <ThoughtView text={thought} isStreaming={true} />}

      <Box flexDirection="column">
        {text ? (
          <MarkdownRenderer text={text} />
        ) : !thought ? (
          <Text color={theme.dim}>▋ <Text italic>receiving…</Text></Text>
        ) : null}
      </Box>
    </Box>
  );
}
