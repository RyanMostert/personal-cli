import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  text: string;
  isStreaming?: boolean;
}

/**
 * High-fidelity ThoughtView.
 * Renders the internal monologue of the AI in a distinct, dimmed style.
 * Long thoughts are collapsed unless the model is actively streaming them.
 */
export function ThoughtView({ text, isStreaming }: Props) {
  const theme = useTheme();

  if (!text) return null;

  const lines = text.split('\n');
  const isLong = lines.length > 4 || text.length > 400;

  // Always show full text while streaming; collapse long thoughts otherwise
  const showFull = isStreaming || !isLong;
  const displayedText = showFull ? text : lines.slice(0, 3).join('\n') + '...';

  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      <Text color={theme.dim}>◈ <Text italic color={theme.muted}>{isStreaming ? 'thinking…' : 'thought'}</Text></Text>
      <Box paddingLeft={2} flexDirection="column">
        <Text color={theme.muted} italic wrap="wrap">{displayedText}</Text>
        {isLong && !showFull && (
          <Text color={theme.dim}>⋯ {lines.length - 3} more lines</Text>
        )}
      </Box>
    </Box>
  );
}
