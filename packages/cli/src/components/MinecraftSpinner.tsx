import React from 'react';
import { Box, Text } from 'ink';

// Static indicator — ink-spinner handles its own efficient animation
export function MinecraftSpinner() {
  return (
    <Box>
      <Text color="#FF00AA" bold>░</Text>
      <Text color="#AA00FF" bold>▒</Text>
      <Text color="#00E5FF" bold>⢆⡤</Text>
    </Box>
  );
}
