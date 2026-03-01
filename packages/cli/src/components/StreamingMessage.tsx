import React from 'react';
import { Box, Text } from 'ink';
import { MinecraftSpinner } from './MinecraftSpinner.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';

interface Props {
  text: string;
}

export function StreamingMessage({ text }: Props) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="#3FB950">Assistant </Text>
        <MinecraftSpinner />
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
