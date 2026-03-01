import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

const ASCII = [
  "   _____                                __           .__  .__  ",
  "  /  _  \\   ____   ____   ____   ____ _/  |_         |  | |__| ",
  " /  /_\\  \\ / ___\\_/ __ \\ /    \\_/ ___\\\\   __\\  ______|  | |  | ",
  "/    |    \\  \\___\\  ___/|   |  \\  \\___ |  |   /_____/|  |_|  | ",
  "\\____|__  /\\___  >\\___  >___|  /\\___  >|__|          |____/__| ",
  "        \\/     \\/     \\/     \\/     \\/                         "
];

export function WelcomeScreen() {
  const [colorIdx, setColorIdx] = useState(0);
  const colors = ['#FF0055', '#FF00AA', '#AA00FF', '#5500FF', '#0055FF', '#00AAFF'];

  useEffect(() => {
    const timer = setInterval(() => {
      setColorIdx((prev) => (prev + 1) % colors.length);
    }, 150);
    return () => clearInterval(timer);
  }, [colors.length]);

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      {ASCII.map((line, i) => (
        <Text key={i} bold color={colors[(colorIdx + i) % colors.length]}>
          {line}
        </Text>
      ))}
      <Box marginTop={1} borderStyle="single" borderColor="#30363D" paddingX={4}>
        <Text color="#8B949E">INSERT COIN TO CONTINUE... [ Type a message to begin ]</Text>
      </Box>
    </Box>
  );
}
