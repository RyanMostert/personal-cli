import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  text: string;
  isStreaming?: boolean;
}

/**
 * High-fidelity ThoughtView.
 * Renders the internal monologue of the AI in a distinct, dimmed style.
 * Supports expanding in-place for long reasoning.
 */
export function ThoughtView({ text, isStreaming }: Props) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const lines = text.split('\n');
  const isLong = lines.length > 4 || text.length > 400;
  
  // Always show full text while streaming
  const showFull = isStreaming || isExpanded || !isLong;
  const displayedText = showFull ? text : lines.slice(0, 3).join('\n') + '...';

  return (
    <Box flexDirection="column" marginY={1} paddingLeft={2} borderLeft borderStyle="round" borderColor={theme.dim}>
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Text color={theme.dim} bold italic> 💭 INTERNAL_MONOLOGUE </Text>
          {isStreaming && <Text color={theme.dim} italic> (streaming...) </Text>}
        </Box>
        {isLong && !isStreaming && (
          <Box paddingX={1} backgroundColor={theme.dim}>
            <Text color="black" bold> {isExpanded ? 'ESC to collapse' : 'Press ? to expand'} </Text>
          </Box>
        )}
      </Box>
      
      <Box marginTop={1}>
        <Text color={theme.dim} italic wrap="wrap">
          {displayedText}
        </Text>
      </Box>

      {isLong && !showFull && (
        <Text color={theme.dim} dimColor> [+{lines.length - 3} lines hidden] </Text>
      )}
    </Box>
  );
}
