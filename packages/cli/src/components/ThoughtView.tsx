import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  text: string;
  isStreaming?: boolean;
}

export function ThoughtView({ text, isStreaming }: Props) {
  const theme = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!text) return null;

  return (
    <Box flexDirection="column" marginY={1} paddingLeft={2} borderLeft borderStyle="round" borderColor={theme.dim}>
      <Box flexDirection="row" justifyContent="space-between">
        <Box>
          <Text color={theme.dim} bold italic> 💭 INTERNAL_MONOLOGUE </Text>
          {isStreaming && <Text color={theme.dim} italic> (streaming...) </Text>}
        </Box>
      </Box>
      
      {!isCollapsed && (
        <Box marginTop={1}>
          <Text color={theme.dim} italic wrap="wrap">
            {text}
          </Text>
        </Box>
      )}
    </Box>
  );
}
