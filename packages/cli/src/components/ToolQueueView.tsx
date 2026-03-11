import React from 'react';
import { Box, Text } from 'ink';
import type { QueuedTool } from '@personal-cli/shared';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  queue: QueuedTool[];
}

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

const TOOL_ICONS: Record<string, string> = {
  readFile: 'R',
  writeFile: 'W',
  editFile: 'E',
  patch: 'P',
  batchEdit: 'B',
  listDir: 'L',
  globFiles: 'G',
  searchFiles: 'S',
  semanticSearch: 'S',
  runCommand: '$',
  runTests: 'T',
  webFetch: '@',
  webSearch: '?',
  gitStatus: 'g',
  gitDiff: 'g',
  gitLog: 'g',
  gitCommit: 'g',
  todoWrite: '#',
  todoRead: '#',
  moveFile: 'M',
  copyFile: 'C',
  deleteFile: 'D',
  memoryWrite: '*',
  memoryRead: '*',
  memoryDelete: '*',
  notifyUser: '!',
  diagnostics: 'd',
  question: '?',
};

export function ToolQueueView({ queue }: Props) {
  const theme = useTheme();

  if (queue.length === 0) {
    return null;
  }

  const pending = queue.filter((t) => t.status === 'pending');
  const executing = queue.filter((t) => t.status === 'executing');
  const completed = queue.filter((t) => t.status === 'completed');
  const failed = queue.filter((t) => t.status === 'failed');

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.dim}
      paddingX={1}
      marginY={1}
    >
      <Box flexDirection="row" alignItems="center">
        <Text color={theme.dim}>Queue: </Text>
        {pending.length > 0 && <Text color={theme.warning}>{pending.length} pending</Text>}
        {executing.length > 0 && <Text color={theme.primary}> {executing.length} executing</Text>}
        {completed.length > 0 && <Text color={theme.success}> {completed.length} done</Text>}
        {failed.length > 0 && <Text color={theme.error}> {failed.length} failed</Text>}
      </Box>

      {queue.map((tool, idx) => {
        const icon = TOOL_ICONS[tool.toolName] ?? '·';
        const primaryArg = getPrimaryArg(tool.toolName, tool.args);
        const statusIcon =
          tool.status === 'pending'
            ? '○'
            : tool.status === 'executing'
              ? '⠶'
              : tool.status === 'completed'
                ? '✔'
                : '✖';
        const statusColor =
          tool.status === 'pending'
            ? theme.warning
            : tool.status === 'executing'
              ? theme.primary
              : tool.status === 'completed'
                ? theme.success
                : theme.error;

        return (
          <Box key={tool.id} flexDirection="row" alignItems="center" paddingLeft={1}>
            <Text color={statusColor} bold>
              {statusIcon}
            </Text>
            <Text color={theme.dim}> [</Text>
            <Text color={theme.toolName}>{icon}</Text>
            <Text color={theme.dim}>] </Text>
            <Text color={theme.toolName}>{tool.toolName}</Text>
            {primaryArg && (
              <Text color={theme.muted}>
                {' '}
                <Text color={theme.dim}>›</Text>{' '}
                {primaryArg.length > 40 ? `${primaryArg.slice(0, 37)}…` : primaryArg}
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
