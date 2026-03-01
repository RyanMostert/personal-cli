import React from 'react';
import { Box, Text } from 'ink';
import { MinecraftSpinner } from './MinecraftSpinner.js';
import type { ToolCallInfo } from '@personal-cli/shared';

interface Props {
  tool: ToolCallInfo;
}

export function ToolCallView({ tool }: Props) {
  const isError = Boolean(tool.error);
  const isRunFinished = tool.result !== undefined || isError;

  return (
    <Box marginY={0} paddingLeft={2} borderLeft borderStyle="single" borderColor={isError ? '#F85149' : '#161B22'} flexDirection="row" alignItems="center">
      <Box marginRight={1}>
        {!isRunFinished ? (
          <MinecraftSpinner />
        ) : isError ? (
          <Text color="#F85149">✗</Text>
        ) : (
          <Text color="#3FB950">✓</Text>
        )}
      </Box>
      <Box flexShrink={0}>
        <Text color={isRunFinished && !isError ? '#8C959F' : '#C9D1D9'} bold>{tool.toolName}</Text>
      </Box>
      <Box paddingLeft={1} flexWrap="nowrap">
        <Text color="#484F58">
          {tool.args ? JSON.stringify(tool.args).substring(0, 60) + (JSON.stringify(tool.args).length > 60 ? '...' : '') : '...'}
        </Text>
      </Box>
    </Box>
  );
}
