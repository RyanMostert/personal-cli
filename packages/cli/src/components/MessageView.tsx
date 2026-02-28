import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '@personal-cli/shared';
import { MarkdownRenderer } from './MarkdownRenderer.js';

interface Props {
  message: Message;
}

export function MessageView({ message }: Props) {
  if (message.role === 'user') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="#58A6FF">You</Text>
        <Box paddingLeft={2}>
          <Text color="#C9D1D9" wrap="wrap">
            {message.content}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="#3FB950">Assistant</Text>
      <Box paddingLeft={2} flexDirection="column">
        <MarkdownRenderer text={message.content} />
      </Box>
    </Box>
  );
}
