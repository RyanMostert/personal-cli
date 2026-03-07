import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { PatchView } from './PatchView.js';
import type { ToolCallInfo } from '@personal-cli/shared';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  tool: ToolCallInfo;
  startTime?: number;
  focused?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onFocus?: () => void;
}

const RESULT_PREVIEW_CHARS = 500;

// Format duration in seconds
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

/** ASCII icon per tool — no emoji to avoid terminal width issues. */
const TOOL_ICONS: Record<string, string> = {
  readFile:      'R',
  writeFile:     'W',
  editFile:      'E',
  patch:         'P',
  batchEdit:     'B',
  listDir:       'L',
  globFiles:     'G',
  searchFiles:   'S',
  semanticSearch:'S',
  runCommand:    '$',
  runTests:      'T',
  webFetch:      '@',
  webSearch:     '?',
  gitStatus:     'g',
  gitDiff:       'g',
  gitLog:        'g',
  gitCommit:     'g',
  todoWrite:     '#',
  todoRead:      '#',
  moveFile:      'M',
  copyFile:      'C',
  deleteFile:    'D',
  memoryWrite:   '*',
  memoryRead:    '*',
  memoryDelete:  '*',
  notifyUser:    '!',
  diagnostics:   'd',
  question:      '?',
};

/** Return the single most useful arg to show inline in the header. */
function getPrimaryArg(toolName: string, args: Record<string, unknown> | undefined): string | null {
  if (!args) return null;
  const str = (k: string) => (typeof args[k] === 'string' ? String(args[k]) : null);

  switch (toolName) {
    case 'readFile':
    case 'writeFile':
    case 'editFile':
    case 'patch':
    case 'deleteFile':
      return str('path');
    case 'moveFile':
    case 'copyFile':
      return `${str('source') ?? '?'} → ${str('destination') ?? '?'}`;
    case 'runCommand':
      return str('command');
    case 'runTests':
      return str('filter') ?? 'all tests';
    case 'webFetch':
      return str('url');
    case 'webSearch':
      return str('query');
    case 'globFiles':
    case 'searchFiles':
      return str('pattern');
    case 'batchEdit': {
      const pat = str('pattern') ?? '';
      const rep = str('replacement') ?? '';
      const gl = str('glob') ?? '**';
      return `"${pat}" → "${rep}" [${gl}]`;
    }
    case 'gitCommit':
      return str('message');
    case 'gitDiff':
      return str('path') ?? 'workspace';
    case 'memoryWrite':
      return `${str('key')} = ${String(args.value ?? '').slice(0, 40)}`;
    case 'memoryRead':
      return str('key') ?? 'all';
    case 'memoryDelete':
      return str('key');
    case 'notifyUser':
      return str('title');
    case 'semanticSearch':
      return str('query');
    case 'listDir':
      return str('path') ?? '.';
    default:
      return null;
  }
}

/** Extract a human-readable one-line summary from any tool result. */
function summarizeResult(result: unknown): { text: string; isError: boolean; lineCount?: number; fullLength?: number } {
  if (result == null) return { text: 'done', isError: false };

  // Helper to get first meaningful line
  const getFirstLine = (text: string): string => {
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const firstLine = lines[0] || '';
    // Clean up markdown formatting
    return firstLine
      .replace(/^#+\s*/, '') // Remove heading markers
      .replace(/^[-*]\s*/, '') // Remove list markers
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/__/g, '') // Remove underline markers
      .trim();
  };

  if (typeof result === 'string') {
    const t = result.trim();
    const lines = t.split('\n');
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const firstLine = getFirstLine(t);
    const preview = firstLine.slice(0, 100);
    return {
      text: preview + (firstLine.length > 100 || nonEmptyLines.length > 1 ? '…' : ''),
      isError: false,
      lineCount: nonEmptyLines.length > 1 ? nonEmptyLines.length : undefined,
      fullLength: t.length,
    };
  }

  if (typeof result === 'object' && !Array.isArray(result)) {
    const r = result as Record<string, unknown>;

    // Tool returned an error object
    if (typeof r.error === 'string') {
      return { text: r.error.slice(0, 100), isError: true };
    }

    // Common output fields across tools
    for (const key of ['output', 'content', 'result', 'text', 'stdout']) {
      if (typeof r[key] === 'string') {
        const val = (r[key] as string).trim();
        const lines = val.split('\n');
        const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
        const firstLine = getFirstLine(val);
        const preview = firstLine.slice(0, 100);
        return {
          text: preview + (firstLine.length > 100 || nonEmptyLines.length > 1 ? '…' : ''),
          isError: false,
          lineCount: nonEmptyLines.length > 1 ? nonEmptyLines.length : undefined,
          fullLength: val.length,
        };
      }
    }

    // File list
    if (Array.isArray(r.files)) {
      const names = (r.files as string[]).slice(0, 6).join('  ');
      const extra = r.files.length > 6 ? `  +${r.files.length - 6} more` : '';
      return { text: names + extra, isError: false, lineCount: r.files.length };
    }

    // Generic array
    if (Array.isArray(result)) {
      return { text: `${(result as unknown[]).length} items`, isError: false, lineCount: (result as unknown[]).length };
    }

    // Fall back to compact JSON
    const json = JSON.stringify(r);
    return { text: json.slice(0, 100) + (json.length > 100 ? '…' : ''), isError: false };
  }

  const s = String(result).trim();
  const firstLine = getFirstLine(s);
  return {
    text: firstLine.slice(0, 100) + (firstLine.length > 100 ? '…' : ''),
    isError: false,
    lineCount: s.split('\n').filter((line) => line.trim().length > 0).length > 1 ? s.split('\n').length : undefined,
  };
}


export function ToolCallView({
  tool,
  startTime = Date.now(),
  focused = false,
  expanded = false,
  onToggleExpand,
  onFocus,
}: Props) {
  const theme = useTheme();
  const [elapsed, setElapsed] = useState(0);
  const resultSummary = tool.result !== undefined ? summarizeResult(tool.result) : null;
  const isError = Boolean(tool.error) || resultSummary?.isError === true;
  const isRunFinished = tool.result !== undefined || Boolean(tool.error);

  const isEditFile = tool.toolName === 'editFile' || tool.toolName === 'edit_file';
  const editArgs = isEditFile ? (tool.args as any) : null;
  const args = tool.args as Record<string, unknown> | undefined;
  const primaryArg = getPrimaryArg(tool.toolName, args);
  const icon = TOOL_ICONS[tool.toolName] ?? '·';

  // Track elapsed time while running
  useEffect(() => {
    if (isRunFinished) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isRunFinished, startTime]);

  const duration = isRunFinished ? elapsed || (Date.now() - startTime) : Date.now() - startTime;
  const statusColor = isError ? theme.error : isRunFinished ? theme.success : theme.warning;

  // For runTests, show pass/fail counts in the result line
  const isRunTests = tool.toolName === 'runTests';
  const testResult = isRunTests && typeof tool.result === 'object' && tool.result !== null
    ? (tool.result as Record<string, unknown>)
    : null;

  return (
    <Box marginY={0} paddingLeft={1} flexDirection="column">
      {/* Header Row: [icon] STATUS TOOLNAME <primary-arg> <duration> */}
      <Box flexDirection="row" alignItems="center">
        <Text color={statusColor} bold>
          {isRunFinished ? (isError ? '✖' : '✔') : '⠶'}{' '}
        </Text>
        <Text color={theme.dim}>[</Text>
        <Text color={theme.toolName}>{icon}</Text>
        <Text color={theme.dim}>] </Text>
        <Text color={theme.toolName} bold>
          {tool.toolName}
        </Text>
        {primaryArg && (
          <Text color={theme.muted}>
            {' '}<Text color={theme.dim}>›</Text>{' '}
            <Text color={isRunFinished ? theme.dim : theme.primary}>
              {primaryArg.length > 60 ? `${primaryArg.slice(0, 57)}…` : primaryArg}
            </Text>
          </Text>
        )}
        <Text color={theme.dim}> {formatDuration(duration)}</Text>
        {focused && (
          <Text color="#FF00AA" bold> ◀</Text>
        )}
      </Box>

      {/* runTests: structured pass/fail summary */}
      {isRunFinished && isRunTests && testResult && (
        <Box paddingLeft={2} flexDirection="row" gap={1}>
          <Text color={theme.dim}>⎿ </Text>
          {typeof testResult.passed === 'number' && (
            <Text color={theme.success}>✔ {testResult.passed} passed</Text>
          )}
          {typeof testResult.failed === 'number' && testResult.failed > 0 && (
            <Text color={theme.error}>  ✖ {testResult.failed} failed</Text>
          )}
          {typeof testResult.skipped === 'number' && testResult.skipped > 0 && (
            <Text color={theme.dim}>  ⊘ {testResult.skipped} skipped</Text>
          )}
        </Box>
      )}

      {/* Result output */}
      {isRunFinished && resultSummary !== null && !isEditFile && !isRunTests && (
        <Box paddingLeft={2} flexDirection="column">
          <Box flexDirection="row">
            <Text color={theme.dim}>⎿ </Text>
            <Text color={isError ? theme.error : theme.dim} wrap="wrap">
              {expanded
                ? typeof tool.result === 'string'
                  ? tool.result
                  : JSON.stringify(tool.result, null, 2)
                : resultSummary.text}
            </Text>
            {!expanded && resultSummary.lineCount && resultSummary.lineCount > 1 && (
              <Text color={theme.dim}> [{resultSummary.lineCount}L]</Text>
            )}
            {!expanded && focused && (
              <Text color={theme.primary} bold> (ENTER)</Text>
            )}
          </Box>
        </Box>
      )}

      {/* Special rendering for edits */}
      {isEditFile && editArgs && (
        <Box paddingLeft={2}>
          <PatchView path={editArgs.path} oldText={editArgs.oldText} newText={editArgs.newText} />
        </Box>
      )}

      {/* Error display */}
      {isError && tool.error && !expanded && (
        <Box paddingLeft={2} marginTop={0}>
          <Text color={theme.dim}>⎿ </Text>
          <Text color={theme.error} wrap="wrap" bold>
            ERROR: {typeof tool.error === 'string' ? tool.error.slice(0, 120) : 'Operation failed'}
          </Text>
        </Box>
      )}
    </Box>
  );
}
