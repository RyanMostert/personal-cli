import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { MarkdownRenderer } from './MarkdownRenderer.js';

interface Props {
  text: string;
}

export function StreamingMessage({ text }: Props) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="#3FB950">Assistant </Text>
        <Text color="#58A6FF">
          <Spinner type="dots" />
        </Text>
      </Box>
      <Box paddingLeft={2} flexDirection="column">
        {text ? (
          <MarkdownRenderer text={text} />
        ) : (
          <Text color="#484F58" dimColor>thinking...</Text>
        )}
      </Box>
    </Box>
  );
}
