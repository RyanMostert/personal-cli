import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface Props {
  provider: string;
  modelId: string;
  tokensUsed: number;
  tokenBudget: number;
  isStreaming: boolean;
  attachedFiles?: { path: string }[];
  mode?: string;
  tick: number;
  cost: number;
  mcpServerCount?: number;
}

const HINTS = [
  "PRESS [?] FOR QUICK HELP",
  "CTRL+O TO BROWSE PROJECT FILES",
  "CTRL+L TO TOGGLE PANEL FOCUS",
  "CTRL+M TO SWITCH MODELS",
  "TAB TO CYCLE AGENT MODES",
  "CTRL+K TO CUSTOMIZE KEYBINDS",
  "TYPE / FOR COMMAND AUTOCOMPLETE",
  "ATTACH FILES WITH @FILENAME",
  "USE /mcp TO CONNECT EXTERNAL TOOLS",
];

export function StatusBar({ 
  provider, modelId, tokensUsed, tokenBudget, isStreaming, attachedFiles = [], mode = 'ask', tick, cost, mcpServerCount = 0 
}: Props) {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHintIndex(i => (i + 1) % HINTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(1, tokensUsed / tokenBudget);
  const bars = 20;
  const filled = Math.round(progress * bars);
  const barStr = '█'.repeat(filled) + '░'.repeat(bars - filled);
  
  const hpColor = progress > 0.9 ? '#F85149' : (progress > 0.7 ? '#D29922' : '#3FB950');
  const costStr = cost > 0 ? `$${cost.toFixed(4)}` : '$0.00';

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Hint Line */}
      <Box paddingX={1} marginBottom={0}>
        <Text color="#484F58">» </Text>
        <Text color="#00E5FF" bold>{HINTS[hintIndex]}</Text>
      </Box>

      {/* Separator */}
      <Text color="#484F58">
        {'━'.repeat(process.stdout.columns || 80)}
      </Text>

      {/* Stats Line */}
      <Box justifyContent="space-between" paddingX={1}>
        <Box>
          <Text color="#FF00AA" bold>P1 [L1] </Text>
          <Text color="#484F58">│ </Text>
          <Text color="white" bold>{provider}/{modelId}</Text>
          <Text color="#484F58"> │ </Text>
          <Text color="#00E5FF" bold>{mode.toUpperCase()}</Text>
        </Box>

        <Box>
          <Text color={hpColor} bold>HP </Text>
          <Text color={hpColor}>{Math.round((1 - progress) * 100)}% </Text>
          <Text color="#484F58">[{barStr}] </Text>
          
          <Text color="#AA00FF" bold> MP </Text>
          <Text color="#AA00FF">{Math.round(progress * 100)}% </Text>
          
          <Text color="#484F58"> │ </Text>
          <Text color="#D29922" bold>{costStr}</Text>
        </Box>

        {attachedFiles.length > 0 && (
          <>
            <Text color="#484F58"> │ </Text>
            <Text color="#AA00FF">INV:{attachedFiles.length}</Text>
          </>
        )}
        {mcpServerCount > 0 && (
          <>
            <Text color="#484F58"> │ </Text>
            <Text color="#00E5FF">🔌 {mcpServerCount}</Text>
          </>
        )}
      </Box>
    </Box>
  );
}
