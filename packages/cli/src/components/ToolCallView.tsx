import React from 'react';
import { Box, Text } from 'ink';
import { MinecraftSpinner } from './MinecraftSpinner.js';
import type { ToolCallInfo } from '@personal-cli/shared';

interface Props {
  tool: ToolCallInfo;
}

const RESULT_PREVIEW_CHARS = 320;

/** Extract a human-readable one-line summary from any tool result. */
function summarizeResult(result: unknown): { text: string; isError: boolean } {
  if (result == null) return { text: 'done', isError: false };

  if (typeof result === 'string') {
    const t = result.trim().slice(0, RESULT_PREVIEW_CHARS);
    return { text: t + (result.length > RESULT_PREVIEW_CHARS ? '…' : ''), isError: false };
  }

  if (typeof result === 'object' && !Array.isArray(result)) {
    const r = result as Record<string, unknown>;

    // Tool returned an error object
    if (typeof r.error === 'string') {
      return { text: r.error.slice(0, RESULT_PREVIEW_CHARS), isError: true };
    }

    // Common output fields across tools
    for (const key of ['output', 'content', 'result', 'text', 'stdout']) {
      if (typeof r[key] === 'string') {
        const val = (r[key] as string).trim();
        const t = val.slice(0, RESULT_PREVIEW_CHARS);
        return { text: t + (val.length > RESULT_PREVIEW_CHARS ? '…' : ''), isError: false };
      }
    }

    // File list
    if (Array.isArray(r.files)) {
      const names = (r.files as string[]).slice(0, 6).join('  ');
      const extra = r.files.length > 6 ? `  +${r.files.length - 6} more` : '';
      return { text: names + extra, isError: false };
    }

    // Generic array
    if (Array.isArray(result)) {
      return { text: `${(result as unknown[]).length} items`, isError: false };
    }

    // Fall back to compact JSON
    const json = JSON.stringify(r);
    const t = json.slice(0, RESULT_PREVIEW_CHARS);
    return { text: t + (json.length > RESULT_PREVIEW_CHARS ? '…' : ''), isError: false };
  }

  const s = String(result).trim().slice(0, RESULT_PREVIEW_CHARS);
  return { text: s, isError: false };
}

export function ToolCallView({ tool }: Props) {
  const resultSummary = tool.result !== undefined ? summarizeResult(tool.result) : null;
  const isError = Boolean(tool.error) || resultSummary?.isError === true;
  const isRunFinished = tool.result !== undefined || Boolean(tool.error);

  const borderColor = isError ? '#FF5555' : isRunFinished ? '#3FB950' : '#FFB86C';

  return (
    <Box
      marginY={0}
      paddingLeft={2}
      borderLeft
      borderStyle="single"
      borderColor={borderColor}
      flexDirection="column"
      backgroundColor={isRunFinished ? 'transparent' : '#1A1A1A'}
    >
      {/* Status row */}
      <Box flexDirection="row" alignItems="center">
        <Box marginRight={1}>
          {!isRunFinished ? (
            <MinecraftSpinner />
          ) : isError ? (
            <Text color="#FF5555" bold>💥</Text>
          ) : (
            <Text color="#3FB950" bold>★</Text>
          )}
        </Box>
        <Box flexShrink={0} marginRight={1}>
          {!isRunFinished ? (
            <Text color="#FFB86C" bold> ⚡ SKILL_ACTIVATE: </Text>
          ) : isError ? (
            <Text color="#FF5555" bold> ❌ SKILL_FAILED: </Text>
          ) : (
            <Text color="#3FB950" bold> ✔ SKILL_SUCCESS: </Text>
          )}
          <Text color={isRunFinished && !isError ? '#00E5FF' : isError ? '#FF5555' : '#FF00AA'} bold>
            [{tool.toolName.toUpperCase()}]
          </Text>
        </Box>
        <Box paddingLeft={1}>
          <Text color="#8C959F">
            {tool.args
              ? 'TARGET: ' + JSON.stringify(tool.args).substring(0, 80) + (JSON.stringify(tool.args).length > 80 ? '…' : '')
              : '…'}
          </Text>
        </Box>
      </Box>

      {/* Result preview row */}
      {isRunFinished && resultSummary !== null && resultSummary.text && (
        <Box paddingLeft={4}>
          <Text color="#484F58">└ </Text>
          <Text color={resultSummary.isError ? '#FF5555' : '#6E7681'} wrap="wrap">
            {resultSummary.text}
          </Text>
        </Box>
      )}
    </Box>
  );
}
