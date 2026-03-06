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
  activeToolCount?: number;
  leaderKeyActive?: boolean;
}

const HINTS = [
  '? help  /  commands  @file attach  ctrl+o files  ctrl+m model  ctrl+tab mode',
  'ctrl+o files · ctrl+m model · ctrl+tab mode · ctrl+k keybinds · /mcp tools',
  '? for help · type / for commands · @filename to attach files',
  'ctrl+l panel focus · ctrl+z undo · ctrl+y redo · /compact to save context',
];

export function StatusBar({
  provider,
  modelId,
  tokensUsed,
  tokenBudget,
  isStreaming,
  attachedFiles = [],
  mode = 'ask',
  tick,
  cost,
  mcpServerCount = 0,
  activeToolCount = 0,
  leaderKeyActive = false,
}: Props) {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHintIndex((i) => (i + 1) % HINTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(1, tokensUsed / tokenBudget);
  const bars = 16;
  const filled = Math.round(progress * bars);
  const barStr = '▓'.repeat(filled) + '░'.repeat(bars - filled);

  const tokenColor = progress > 0.9 ? '#F85149' : progress > 0.7 ? '#D29922' : '#6E7681';
  const costStr = cost > 0 ? `$${cost.toFixed(4)}` : '$0.00';

  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const spinner = spinnerFrames[tick % spinnerFrames.length];

  // Contextual Tips
  let activeHint = HINTS[hintIndex % HINTS.length];
  if (progress > 0.8) {
    activeHint = '⚠ context at ' + Math.round(progress * 100) + '% — run /compact to condense';
  } else if (attachedFiles.length > 5) {
    activeHint = 'large attachment set — use /detach to clear old files';
  }

  // Bracketed mode labels for arcade HUD feel
  const modeLabel: Record<string, string> = {
    ask: '[ASK]',
    plan: '[PLAN]',
    build: '[BUILD]',
    auto: '[AUTO]',
  };
  const modeColor: Record<string, string> = {
    ask: '#3FB950',
    plan: '#D29922',
    build: '#F85149',
    auto: '#00E5FF',
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Activity / Hint Line */}
      <Box paddingX={1} marginBottom={0}>
        {(isStreaming || activeToolCount > 0 || leaderKeyActive) ? (
          <Box>
            <Text color="#00E5FF">{spinner} </Text>
            {isStreaming && <Text color="#6E7681">receiving</Text>}
            {activeToolCount > 0 && <Text color="#D29922"> · {activeToolCount} tool{activeToolCount > 1 ? 's' : ''} active</Text>}
            {leaderKeyActive && <Text color="#FF00AA"> · leader — waiting…</Text>}
          </Box>
        ) : (
          <Text color="#484F58">{activeHint}</Text>
        )}
      </Box>

      {/* Separator */}
      <Text color="#30363D">{'─'.repeat(process.stdout.columns || 80)}</Text>

      {/* HUD Stats Line */}
      <Box justifyContent="space-between" paddingX={1}>
        <Box>
          <Text color="#6E7681">{provider}</Text>
          <Text color="#30363D"> / </Text>
          <Text color="white">{modelId}</Text>
          <Text color="#484F58">  </Text>
          <Text color={modeColor[mode] ?? '#6E7681'} bold>{modeLabel[mode] ?? `[${mode.toUpperCase()}]`}</Text>
          {attachedFiles.length > 0 && (
            <Text color="#484F58">  {attachedFiles.length} attached</Text>
          )}
          {mcpServerCount > 0 && (
            <Text color="#484F58">  {mcpServerCount} mcp</Text>
          )}
        </Box>

        <Box>
          <Text color="#484F58">CTX </Text>
          <Text color={tokenColor}>{barStr}</Text>
          <Text color="#484F58"> {Math.round(progress * 100)}%</Text>
          <Text color="#30363D">  </Text>
          <Text color={cost > 0 ? '#D29922' : '#484F58'}>{costStr}</Text>
        </Box>
      </Box>
    </Box>
  );
}
