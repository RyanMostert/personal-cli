import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  provider: string;
  modelId: string;
  tokensUsed: number;
  tokenBudget: number;
  isStreaming: boolean;
  attachedFiles?: { path: string; content: string }[];
  mode?: string;
  contextWindow?: number;
  tick: number;
  cost?: number;
  costBudget?: number;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function StatusBar({
  provider,
  modelId,
  tokensUsed,
  tokenBudget,
  isStreaming,
  attachedFiles = [],
  mode = 'ASK',
  contextWindow = 128000,
  tick,
  cost = 0,
  costBudget = 5,
}: Props) {
  const spinnerIdx = tick % SPINNER_FRAMES.length;
  const level = Math.floor(tokensUsed / 5000) + 1;

  const modeColors: Record<string, string> = {
    'ASK': '#D29922',
    'AUTO': '#FF00AA',
    'BUILD': '#3FB950',
    'PLAN': '#F85149',
  };
  const modeColor = modeColors[mode.toUpperCase()] ?? '#8C959F';

  const formatCost = (c: number): string => {
    if (c === 0) return '$0.00';
    if (c < 0.01) return '<$0.01';
    return `$${c.toFixed(2)}`;
  };

  const hpPct = tokenBudget > 0 ? Math.min(1, tokensUsed / tokenBudget) : 0;
  const mpPct = contextWindow > 0 ? Math.min(1, tokensUsed / contextWindow) : 0;

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor="#484F58"
    >
      <Box>
        <Text color="#00E5FF" bold>P1 [L{level}]</Text>
        <Text color="#484F58"> │ </Text>
        <Text color="white" bold>{provider}/{modelId}</Text>
        <Text color="#484F58"> │ </Text>
        <Text color={modeColor} bold>{mode.toUpperCase()}</Text>
        {isStreaming && (
          <Text color="#FF00AA" bold> {SPINNER_FRAMES[spinnerIdx]} </Text>
        )}
      </Box>

      <Box>
        <Text color="#484F58">HP </Text>
        <Text color={hpPct > 0.8 ? '#FF00AA' : '#3FB950'}>{Math.round((1 - hpPct) * 100)}%</Text>
        <Text color="#484F58"> │ </Text>
        <Text color="#00E5FF">MP </Text>
        <Text color="#00E5FF">{Math.round(mpPct * 100)}%</Text>
        <Text color="#484F58"> │ </Text>
        <Text color={cost > (costBudget * 0.8) ? '#FF00AA' : '#3FB950'} bold>{formatCost(cost)}</Text>
        {attachedFiles.length > 0 && (
          <>
            <Text color="#484F58"> │ </Text>
            <Text color="#AA00FF">INV:{attachedFiles.length}</Text>
          </>
        )}
      </Box>
    </Box>
  );
}
