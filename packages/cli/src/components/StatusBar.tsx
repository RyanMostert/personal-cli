import React from 'react';
import { Box, Text } from 'ink';
import { APP_NAME } from '@personal-cli/shared';
import { MarioHeader } from './MarioHeader.js';

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

function getFileIcon(p: string) {
  const ext = p.split('.').pop()?.toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext!)) return '🛠️';
  if (['json', 'yaml', 'yml'].includes(ext!)) return '📜';
  if (['md', 'txt'].includes(ext!)) return '📝';
  return '📦';
}

function getRarity(p: string) {
  const ext = p.split('.').pop()?.toLowerCase();
  if (['tsx', 'ts'].includes(ext!)) return { label: 'LEGENDARY', color: '#AA00FF' };
  if (['js', 'json'].includes(ext!)) return { label: 'RARE', color: '#00E5FF' };
  return { label: 'COMMON', color: '#8C959F' };
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function renderBar(used: number, total: number, width: number = 10, isReverse: boolean = false): string {
  const pct = total > 0 ? used / total : 0;
  const fillRatio = isReverse ? (1 - pct) : pct;
  const filled = Math.max(0, Math.min(width, Math.round(fillRatio * width)));
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

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
  costBudget = 5, // Default $5 budget
}: Props) {
  // Use root tick for spinner — no local setInterval needed
  const spinnerIdx = tick % SPINNER_FRAMES.length;

  const usagePct = tokenBudget > 0 ? tokensUsed / tokenBudget : 0;
  let hpColor = '#3FB950';
  if (usagePct > 0.8) hpColor = '#FF00AA';
  else if (usagePct > 0.6) hpColor = '#FFB86C';

  const modeColors: Record<string, string> = {
    'ASK': '#D29922',
    'AUTO': '#FF00AA',
    'BUILD': '#3FB950',
    'PLAN': '#F85149',
  };
  const modeColor = modeColors[mode.toUpperCase()] ?? '#8C959F';

  const contextUsed = Math.min(tokensUsed, contextWindow);
  const level = Math.floor(tokensUsed / 5000) + 1;

  // Cost calculations and warnings
  const costPct = costBudget > 0 ? cost / costBudget : 0;
  let costColor = '#3FB950'; // Green for low cost
  let costAlert = false;
  if (costPct > 0.9) {
    costColor = '#FF00AA'; // Magenta for critical
    costAlert = true;
  } else if (costPct > 0.7) {
    costColor = '#FFB86C'; // Orange for warning
  } else if (costPct > 0.5) {
    costColor = '#D29922'; // Yellow for caution
  }

  const formatCost = (c: number): string => {
    if (c === 0) return '$0.00';
    if (c < 0.01) return '<$0.01';
    return `$${c.toFixed(2)}`;
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <MarioHeader title={APP_NAME} tick={tick} />

      <Box flexDirection="row">
        <Box
          flexGrow={1}
          borderStyle="single"
          borderColor="#00E5FF"
          paddingX={1}
          paddingY={0}
          justifyContent="space-between"
        >
          <Box flexDirection="column">
            <Box>
              <Text color="#FF00AA" bold>▶</Text>
              <Text color="#00E5FF" bold> PLAYER_1 [LVL {level}] </Text>
              <Text color="#AA00FF" bold>» </Text>
              <Text color="white" bold>{provider}/{modelId}</Text>
              <Text color="#484F58"> │ </Text>
              <Text color={modeColor} bold> {mode.toUpperCase()}_MODE </Text>
              {mode.toLowerCase() === 'ask' && (
                <Text color="#D29922"> [READ ONLY]</Text>
              )}
              {mode.toLowerCase() === 'plan' && (
                <Text color="#F85149"> [CONFIRM WRITES]</Text>
              )}
            </Box>
            <Box marginTop={1}>
              <Text color="#484F58">EXP: {formatTokens(tokensUsed)} / NEXT: {formatTokens((level) * 5000)} </Text>
            </Box>
          </Box>

          <Box flexDirection="column" alignItems="flex-end">
            <Box>
              <Text color="#484F58" bold>HP </Text>
              <Text color={hpColor}>[{renderBar(tokensUsed, tokenBudget, 15, true)}]</Text>
            </Box>
            <Box>
              <Text color="#00E5FF" bold>MP </Text>
              <Text color="#00E5FF">[{renderBar(contextUsed, contextWindow, 15, false)}]</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="#484F58" bold>COST </Text>
              <Text color={costAlert && tick % 2 === 0 ? '#FF0000' : costColor} bold>
                {formatCost(cost)} / {formatCost(costBudget)}
              </Text>
              {costAlert && (
                <Text color="#FF00AA"> ⚠</Text>
              )}
            </Box>
            {isStreaming && (
              <Text color="#FF00AA" bold> {SPINNER_FRAMES[spinnerIdx]} COMPUTING... </Text>
            )}
          </Box>
        </Box>

        {attachedFiles.length > 0 && (
          <Box
            flexDirection="column"
            marginLeft={1}
            paddingX={1}
            borderStyle="single"
            borderColor="#AA00FF"
            width={30}
          >
            <Text color="#AA00FF" bold> ╭─ EQUIPMENT ──</Text>
            {attachedFiles.map((f, i) => {
              const rarity = getRarity(f.path);
              const durability = Math.max(0, Math.floor(100 - (f.content.length / 500)));
              return (
                <Box key={i} flexDirection="column" marginBottom={0}>
                  <Box justifyContent="space-between">
                    <Text color="white" bold>{getFileIcon(f.path)} {f.path.split(/[\\/]/).pop()?.slice(0, 10)}</Text>
                    <Text color={rarity.color} bold>{rarity.label}</Text>
                  </Box>
                  <Box>
                    <Text color="#484F58">DUR: </Text>
                    <Text color={durability < 20 ? '#FF00AA' : '#3FB950'}>{durability}%</Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
