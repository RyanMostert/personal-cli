import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  path: string;
  oldText: string;
  newText: string;
}

export function PatchView({ path, oldText, newText }: Props) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  return (
    <Box flexDirection="column" marginY={1} paddingX={1} borderStyle="round" borderColor="#484F58">
      <Box marginBottom={1}>
        <Text color="#00E5FF" bold> 📂 PATCH: {path} </Text>
      </Box>
      
      <Box flexDirection="column">
        {oldLines.map((line, i) => (
          <Box key={`old-${i}`}>
            <Text color="#FF5555" bold>- </Text>
            <Text color="#FF5555" dimColor>{line}</Text>
          </Box>
        ))}
        {newLines.map((line, i) => (
          <Box key={`new-${i}`}>
            <Text color="#3FB950" bold>+ </Text>
            <Text color="#3FB950">{line}</Text>
          </Box>
        ))}
      </Box>
      
      <Box marginTop={1}>
        <Text color="#484F58" italic> (Surgical replacement applied) </Text>
      </Box>
    </Box>
  );
}
