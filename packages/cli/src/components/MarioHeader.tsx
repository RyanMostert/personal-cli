import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

export function MarioHeader({ title }: { title: string }) {
  const [frame, setFrame] = useState(0);
  const WIDTH = 50;

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % (WIDTH * 2));
    }, 150);
    return () => clearInterval(timer);
  }, []);

  const pos = frame >= WIDTH ? (WIDTH * 2 - 1) - frame : frame;
  const obstacles = [10, 25, 40];
  const isJumping = obstacles.includes(pos + 1) || obstacles.includes(pos) || obstacles.includes(pos - 1);

  let jumpRow = ' '.repeat(title.length + 5);
  let groundRow = `╭─── ${title} `;

  for (let i = 0; i < WIDTH; i++) {
    if (obstacles.includes(i)) {
      jumpRow += ' ';
      groundRow += '🪠'; // Pipe
    } else if (i === pos) {
      if (isJumping) {
        jumpRow += '🏃';
        groundRow += '─';
      } else {
        jumpRow += ' ';
        groundRow += frame % 2 === 0 ? '🚶' : '🏃';
      }
    } else {
      jumpRow += ' ';
      groundRow += '─';
    }
  }

  groundRow += ' ╮';

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text>{jumpRow}</Text>
      <Text color="#484F58">{groundRow}</Text>
    </Box>
  );
}
