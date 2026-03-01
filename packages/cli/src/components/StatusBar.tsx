import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { APP_NAME, APP_VERSION } from '@personal-cli/shared';
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
  contextWindow = 128000
}: Props) {
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [flicker, setFlicker] = useState(true);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setSpinnerIdx((prev) => (prev + 1) % SPINNER_FRAMES.length);
      setFlicker((prev) => !prev);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  const usagePct = tokenBudget > 0 ? tokensUsed / tokenBudget : 0;
  let hpColor = '#3FB950'; // Green
  if (usagePct > 0.8) hpColor = '#FF00AA'; // Critical Pink
  else if (usagePct > 0.6) hpColor = '#FFB86C'; // Warning Orange

  const modeColors: Record<string, string> = {
    'ASK': '#8C959F',
    'AUTO': '#FF00AA',
    'BUILD': '#00E5FF',
    'PLAN': '#AA00FF',
  };
  const modeColor = modeColors[mode.toUpperCase()] ?? '#8C959F';

  const contextUsed = Math.min(tokensUsed, contextWindow);
  
  // Player Level based on tokens
  const level = Math.floor(tokensUsed / 5000) + 1;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <MarioHeader title={APP_NAME} />
      
      <Box flexDirection="row">
        {/* Main Stats Panel */}
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
              <Text color="#FF00AA" bold>{flicker ? '▶' : ' '}</Text>
              <Text color="#00E5FF" bold> PLAYER_1 [LVL {level}] </Text>
              <Text color="#AA00FF" bold>» </Text>
              <Text color="white" bold>{provider}/{modelId}</Text>
              <Text color="#484F58"> │ </Text>
              <Text color={modeColor} bold> {mode.toUpperCase()}_MODE </Text>
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
            {isStreaming && (
              <Text color="#FF00AA" bold> {SPINNER_FRAMES[spinnerIdx]} COMPUTING... </Text>
            )}
          </Box>
        </Box>

        {/* Inventory Sidebar */}
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
