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
    <Box flexDirection="column" marginY={1} paddingLeft={2} borderLeft borderStyle="round" borderColor={theme.dim}>
      <Box flexDirection="row" alignItems="center">
        <Text color={theme.dim} bold italic> 💭 INTERNAL_MONOLOGUE </Text>
        {isStreaming && <Text color={theme.dim} italic> (streaming...) </Text>}
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
