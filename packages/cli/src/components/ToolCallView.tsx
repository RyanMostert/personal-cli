import React from 'react';
import { Box, Text } from 'ink';
import { MinecraftSpinner } from './MinecraftSpinner.js';
import { PatchView } from './PatchView.js';
import type { ToolCallInfo } from '@personal-cli/shared';
import { useTheme } from '../context/ThemeContext.js';

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
  const theme = useTheme();
  const resultSummary = tool.result !== undefined ? summarizeResult(tool.result) : null;
  const isError = Boolean(tool.error) || resultSummary?.isError === true;
  const isRunFinished = tool.result !== undefined || Boolean(tool.error);

  const isEditFile = tool.toolName === 'edit_file';
  const editArgs = isEditFile ? (tool.args as any) : null;

  const borderColor = isError ? theme.error : isRunFinished ? theme.success : theme.warning;

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
            <Text color={theme.error} bold>💥</Text>
          ) : (
            <Text color={theme.success} bold>★</Text>
          )}
        </Box>
        <Box flexShrink={0} marginRight={1}>
          {!isRunFinished ? (
            <Text color={theme.warning} bold> ⚡ SKILL_ACTIVATE: </Text>
          ) : isError ? (
            <Text color={theme.error} bold> ❌ SKILL_FAILED: </Text>
          ) : (
            <Text color={theme.success} bold> ✔ SKILL_SUCCESS: </Text>
          )}
          <Text color={isRunFinished && !isError ? theme.toolName : isError ? theme.error : theme.assistantLabel} bold>
            [{tool.toolName.toUpperCase()}]
          </Text>
        </Box>
        <Box paddingLeft={1}>
          <Text color={theme.muted}>
            {tool.args
              ? 'TARGET: ' + JSON.stringify(tool.args).substring(0, 80) + (JSON.stringify(tool.args).length > 80 ? '…' : '')
              : '…'}
          </Text>
        </Box>
      </Box>

      {/* Result preview row */}
      {isRunFinished && resultSummary !== null && resultSummary.text && !isEditFile && (
        <Box paddingLeft={4}>
          <Text color={theme.dim}>└ </Text>
          <Text color={resultSummary.isError ? theme.error : theme.dim} wrap="wrap">
            {resultSummary.text}
          </Text>
        </Box>
      )}

      {/* Special rendering for edits */}
      {isEditFile && editArgs && (
        <Box paddingLeft={4}>
          <PatchView path={editArgs.path} oldText={editArgs.oldText} newText={editArgs.newText} />
        </Box>
      )}
    </Box>
  );
}
