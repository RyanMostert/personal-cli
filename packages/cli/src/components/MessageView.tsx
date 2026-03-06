import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '@personal-cli/shared';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { ToolCallView } from './ToolCallView.js';
import { ThoughtView } from './ThoughtView.js';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  message: Message;
  focusedToolCallId?: string | null;
  expandedToolCalls?: Set<string>;
  onToggleToolCall?: (id: string) => void;
  onFocusToolCall?: (id: string) => void;
}

export function MessageView({
  message,
  focusedToolCallId,
  expandedToolCalls,
  onToggleToolCall,
  onFocusToolCall,
}: Props) {
  const theme = useTheme();

  if (message.role === 'user') {
    const lines = message.content.split('\n');
    const isLarge = lines.length > 5;

    // Parse for image attachments in context blocks if any
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const fileMatches = message.content.matchAll(/<file path="([^"]+)">/g);
    let imageCount = 0;
    for (const match of fileMatches) {
      const path = match[1].toLowerCase();
      if (imageExtensions.some((ext) => path.endsWith(ext))) {
        imageCount++;
      }
    }

    return (
      <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
        <Box>
          <Text color={theme.userLabel} bold>{'❯ '}</Text>
          {isLarge ? (
            <Box>
              <Text color={theme.dim} italic>{lines.length} lines</Text>
              {imageCount > 0 && (
                <Text color={theme.dim} italic> · {imageCount} image{imageCount > 1 ? 's' : ''}</Text>
              )}
            </Box>
          ) : (
            <Text color={theme.text}>{message.content}</Text>
          )}
        </Box>
      </Box>
    );
  }

  if (message.role === 'system') {
    return (
      <Box flexDirection="row" marginBottom={1} paddingLeft={1}>
        <Text color={theme.dim}>· </Text>
        <Text color={theme.muted} italic>{message.content}</Text>
      </Box>
    );
  }

  // Assistant Message — no label, content speaks for itself
  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      {message.thought && <ThoughtView text={message.thought} />}

      <Box flexDirection="column">
        {message.toolCalls?.map((tc) => (
          <ToolCallView
            key={tc.toolCallId}
            tool={tc}
            focused={focusedToolCallId === tc.toolCallId}
            expanded={expandedToolCalls?.has(tc.toolCallId)}
            onToggleExpand={() => onToggleToolCall?.(tc.toolCallId)}
            onFocus={() => onFocusToolCall?.(tc.toolCallId)}
          />
        ))}
        {message.content ? (
          <MarkdownRenderer text={message.content} />
        ) : !message.toolCalls?.length ? (
          <Text color={theme.dim} italic>(empty response)</Text>
        ) : null}
      </Box>
    </Box>
  );
}
