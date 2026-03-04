import React from 'react';
import { Box, Text } from 'ink';

const RUNNER_FRAMES = ['🏃', '🏃‍♂️', '🚶', '🏃'];
const LIGHTNING = ['⚡', ' ', '⚡', ' '];

// Animated header driven by root-level tick — no local timer, no Yoga churn
export function MarioHeader({ title, tick = 0 }: { title: string; tick?: number }) {
  const titleStr = ` ━━ ${title.toUpperCase()} `;
  const frame = tick % RUNNER_FRAMES.length;
  const runner = RUNNER_FRAMES[frame];
  const bolt = LIGHTNING[frame];
  const runnerPos = (tick * 3) % 44; // moves 3 chars per tick across ~44 char wide field
  const leftPad = ' '.repeat(runnerPos);
  const rightPad = ' '.repeat(Math.max(0, 44 - runnerPos - 2));

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box>
        <Text color="#484F58">{`${bolt}   `}</Text>
        <Text color="#FF00AA">{leftPad}</Text>
        <Text color="#FFB86C">{runner}</Text>
        <Text color="#484F58">{`${rightPad}${bolt}`}</Text>
      </Box>
      <Box>
        <Text color="#FF00AA" bold>{titleStr}</Text>
        <Text color="#484F58">{'━'.repeat(Math.max(0, 60 - titleStr.length))}</Text>
      </Box>
    </Box>
  );
}
