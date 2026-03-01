import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

const FRAMES = [
  ' ⛏  [■]',
  '  ⛏ [■]',
  '   ⛏[■]',
  '   💥[■]',
  '    [░]'
];

export function MinecraftSpinner() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % FRAMES.length);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  return <Text color="#D29922">{FRAMES[frame]}</Text>;
}
