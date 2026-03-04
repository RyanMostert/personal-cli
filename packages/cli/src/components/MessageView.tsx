import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '@personal-cli/shared';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { ToolCallView } from './ToolCallView.js';
import { ThoughtView } from './ThoughtView.js';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  message: Message;
}

export function MessageView({ message }: Props) {
  const theme = useTheme();

  if (message.role === 'user') {
    return (
      <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
        <Box>
          <Text color={theme.userLabel} bold>P1 </Text>
          <Text color={theme.dim}>❯ </Text>
          <Text color={theme.text} bold>{message.content}</Text>
        </Box>
      </Box>
    );
  }

  if (message.role === 'system') {
    return (
      <Box flexDirection="row" marginBottom={1} paddingLeft={1}>
        <Text color={theme.warning} bold>[!] </Text>
        <Text color={theme.muted} italic>{message.content}</Text>
      </Box>
    );
  }

  // Assistant Message
  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      <Box marginBottom={0}>
        <Text color={theme.assistantLabel} bold>CPU </Text>
        <Text color={theme.dim}>❯ </Text>
        <Text color={theme.primary} dimColor>[link_stable]</Text>
      </Box>

      {message.thought && <ThoughtView text={message.thought} />}

      <Box paddingLeft={2} flexDirection="column">
        {message.toolCalls?.map(tc => (
          <ToolCallView key={tc.toolCallId} tool={tc} />
        ))}
        {message.content ? (
          <MarkdownRenderer text={message.content} />
        ) : !message.toolCalls?.length ? (
          <Text color={theme.dim} italic>(no content received)</Text>
        ) : null}
      </Box>
    </Box>
  );
}
