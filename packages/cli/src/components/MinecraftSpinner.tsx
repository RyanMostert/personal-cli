import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

const FRAMES = ['⢎⡱', '⢄⡢', '⢆⡤', '⢈⡥'];

export function MinecraftSpinner() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box>
      <Text color="#FF00AA" bold>░</Text>
      <Text color="#AA00FF" bold>▒</Text>
      <Text color="#00E5FF" bold>{FRAMES[frame]}</Text>
    </Box>
  );
}
