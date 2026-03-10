import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  tokensUsed: number;
  cost: number;
  messageCount: number;
  onComplete: () => void;
}

const GAME_OVER_ASCII = [
  '  ██████╗  █████╗ ███╗   ███╗███████╗',
  ' ██╔════╝ ██╔══██╗████╗ ████║██╔════╝',
  ' ██║  ███╗███████║██╔████╔██║█████╗  ',
  ' ██║   ██║██╔══██║██║╚██╔╝██║██╔══╝  ',
  ' ╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗',
  '  ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝',
  '                                     ',
  '  ██████╗ ██╗   ██╗███████╗██████╗ ',
  ' ██╔═══██╗██║   ██║██╔════╝██╔══██╗',
  ' ██║   ██║██║   ██║█████╗  ██████╔╝',
  ' ██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗',
  ' ╚██████╔╝ ╚████╔╝ ███████╗██║  ██║',
  '  ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝',
];

export function GameOverScreen({ tokensUsed, cost, messageCount, onComplete }: Props) {
  useInput((input, key) => {
    if (key.return || key.escape || input === ' ') {
      onComplete();
    }
  });

  useEffect(() => {
    // Show game over for 3 seconds, then exit
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      paddingY={2}
      width="100%"
      height="100%"
      justifyContent="center"
    >
      {GAME_OVER_ASCII.map((line, i) => (
        <Text key={i} bold color="#FF5555">
          {line}
        </Text>
      ))}
      <Box
        marginTop={2}
        flexDirection="column"
        alignItems="center"
        borderStyle="double"
        borderColor="#484F58"
        paddingX={4}
        paddingY={1}
      >
        <Text color="#00E5FF" bold>
          {' '}
          --- FINAL STATS ---{' '}
        </Text>
        <Box width={30} justifyContent="space-between" marginTop={1}>
          <Text color="#FF00AA">TOTAL_TOKENS</Text>
          <Text color="white">{tokensUsed.toLocaleString()}</Text>
        </Box>
        <Box width={30} justifyContent="space-between">
          <Text color="#FF00AA">CREDITS_USED</Text>
          <Text color="white">${cost.toFixed(4)}</Text>
        </Box>
        <Box width={30} justifyContent="space-between">
          <Text color="#FF00AA">TURNS_SURVIVED</Text>
          <Text color="white">{messageCount}</Text>
        </Box>
      </Box>
      <Box marginTop={2} flexDirection="column" alignItems="center">
        <Text color="#484F58"> SAVING PROGRESS... DO NOT POWER OFF </Text>
        <Text color="#484F58"> [ SPACE/ENTER TO EXIT NOW ] </Text>
      </Box>
    </Box>
  );
}
