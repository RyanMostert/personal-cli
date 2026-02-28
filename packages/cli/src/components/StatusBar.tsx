import React from 'react';
import { Box, Text } from 'ink';
import { APP_NAME, APP_VERSION } from '@personal-cli/shared';

interface Props {
  provider: string;
  modelId: string;
  tokensUsed: number;
  tokenBudget: number;
  isStreaming: boolean;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function StatusBar({ provider, modelId, tokensUsed, tokenBudget, isStreaming }: Props) {
  const usagePct = tokenBudget > 0 ? tokensUsed / tokenBudget : 0;
  const tokenColor = usagePct > 0.8 ? '#F85149' : usagePct > 0.6 ? '#D29922' : '#3FB950';

  return (
    <Box
      borderStyle="single"
      borderBottom
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      borderColor="#484F58"
      paddingX={1}
    >
      {/* App name */}
      <Text bold color="#58A6FF">{APP_NAME}</Text>
      <Text color="#484F58"> │ </Text>

      {/* Model */}
      <Text color="#C9D1D9">{provider}/</Text>
      <Text bold color="#C9D1D9">{modelId}</Text>
      <Text color="#484F58"> │ </Text>

      {/* Token usage */}
      <Text color={tokenColor}>
        {formatTokens(tokensUsed)}/{formatTokens(tokenBudget)} tokens
      </Text>

      {/* Streaming indicator */}
      {isStreaming && (
        <>
          <Text color="#484F58"> │ </Text>
          <Text color="#58A6FF">streaming</Text>
        </>
      )}
    </Box>
  );
}
