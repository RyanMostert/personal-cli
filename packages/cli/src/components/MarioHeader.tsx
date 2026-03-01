import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

const WIDTH = 60;
const RUN_FRAMES = ['⢎⡱', '⢄⡢', '⢆⡤', '⢈⡥'];
const STARS = [5, 12, 22, 35, 48, 55];

export function MarioHeader({ title }: { title: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1));
    }, 70);
    return () => clearInterval(timer);
  }, []);

  const pos = frame % WIDTH;
  const obstacles = [20, 45];
  
  // Jump logic: jump when near obstacle
  let isJumping = false;
  let jumpOffset = 0;
  for (const obs of obstacles) {
    const dist = obs - pos;
    if (dist >= -2 && dist <= 4) {
      isJumping = true;
      // Parabolic jump arc
      const jumpProgress = (dist + 2) / 6; // 0 to 1
      jumpOffset = Math.round(Math.sin(jumpProgress * Math.PI) * 2);
    }
  }

  const renderRow = (rowIdx: number) => {
    let row = '';
    for (let i = 0; i < WIDTH; i++) {
      if (i === pos && i < WIDTH - 1) {
        if (rowIdx === 1 - jumpOffset) {
          row += RUN_FRAMES[frame % RUN_FRAMES.length];
          i++; 
        } else {
          row += '  ';
          i++;
        }
      } else if (obstacles.includes(i) && rowIdx === 1) {
        row += '⚡';
      } else if (STARS.includes((i + (frame >> 2)) % WIDTH) && rowIdx === 0) {
        row += '·';
      } else {
        row += ' ';
      }
    }
    return row.slice(0, WIDTH); // Ensure exact width
  };

  // Trail logic
  const trail = [
    { p: (pos - 1 + WIDTH) % WIDTH, c: '░', color: '#FF00AA' },
    { p: (pos - 2 + WIDTH) % WIDTH, c: '▒', color: '#AA00FF' },
  ];

  const getCharWithTrail = (i: number, rowIdx: number, baseChar: string) => {
    // Check trail first
    if (rowIdx === 1 - jumpOffset) {
        for (const t of trail) {
            if (i === t.p) return <Text key={i} color={t.color}>{t.c}</Text>;
        }
    }
    
    if (baseChar === '⚡') return <Text key={i} color="#FFFF00" bold>{baseChar}</Text>;
    if (baseChar === '·') return <Text key={i} color="#484F58">{baseChar}</Text>;
    
    // Check if char is part of any runner frame
    const isRunnerChar = RUN_FRAMES.some(f => f.includes(baseChar));
    if (isRunnerChar && baseChar !== ' ') return <Text key={i} color="#00E5FF" bold>{baseChar}</Text>;
    
    return <Text key={i}>{baseChar}</Text>;
  };

  const titleStr = ` ${title.toUpperCase()} `;
  const titleStart = 2;

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box>
        {renderRow(0).split('').map((c, i) => getCharWithTrail(i, 0, c))}
      </Box>
      <Box>
        {renderRow(1).split('').map((c, i) => getCharWithTrail(i, 1, c))}
      </Box>
      <Box>
        <Text color="#FF00AA" bold>
          {'━'.repeat(titleStart)}
          <Text color="#00E5FF" bold inverse>{titleStr}</Text>
          {'━'.repeat(WIDTH - titleStart - titleStr.length)}
        </Text>
      </Box>
    </Box>
  );
}
