import React from 'react';
import { Box, Text } from 'ink';
import { APP_NAME, APP_VERSION } from '@personal-cli/shared';
import { MarioHeader } from './MarioHeader.js';

interface Props {
  provider: string;
  modelId: string;
  tokensUsed: number;
  tokenBudget: number;
  isStreaming: boolean;
  attachedCount?: number;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function StatusBar({ provider, modelId, tokensUsed, tokenBudget, isStreaming, attachedCount }: Props) {
  const usagePct = tokenBudget > 0 ? tokensUsed / tokenBudget : 0;
  let tokenColor = '#3FB950';
  if (usagePct > 0.8) tokenColor = '#F85149';
  else if (usagePct > 0.6) tokenColor = '#D29922';

  return (
    <Box flexDirection="column" marginBottom={1}>
      <MarioHeader title={APP_NAME} />
      <Box
        backgroundColor="#00E5FF"
        paddingX={2}
        paddingY={0}
        justifyContent="space-between"
      >
        <Box>
          <Text color="black" bold>■ HUD LINK ESTABLISHED</Text>
          <Text color="black"> │ </Text>
          <Text color="black" bold>{provider}/{modelId}</Text>
        </Box>
        <Box>
          {(attachedCount ?? 0) > 0 && (
            <Text color="#58A6FF" bold backgroundColor="black"> 📎 {attachedCount} </Text>
          )}
          <Text color={tokenColor} bold backgroundColor="black">
            ⚡ TOKENS: {formatTokens(tokensUsed)} / {formatTokens(tokenBudget)}
          </Text>
          {isStreaming && (
            <Text color="#FF00AA" bold backgroundColor="black"> [ NEURONS ACTIVE ] </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
