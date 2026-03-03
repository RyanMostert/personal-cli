import React from 'react';
import { Box, Text } from 'ink';
import { getCommands } from '../commands/registry.js';
import type { Command } from '../commands/registry.js';

// Re-export for backward compatibility
export type { Command };

// Build hint from command and description
function buildHint(cmd: Command): string {
  // Simple heuristic to build hints
  const hints: Record<string, string> = {
    '/add': '/add <path>',
    '/clear': '/clear',
    '/compact': '/compact',
    '/copy': '/copy',
    '/cost': '/cost',
    '/exit': '/exit',
    '/export': '/export [path]',
    '/help': '/help',
    '/history': '/history',
    '/model': '/model [provider/id]',
    '/mode': '/mode <ask|auto|build>',
    '/open': '/open <path>',
    '/provider': '/provider',
    '/rename': '/rename <title>',
    '/theme': '/theme [name]',
  };
  return hints[cmd.cmd] || cmd.cmd;
}

// Convert registry commands to display format
function getDisplayCommands(): Array<Command & { hint: string }> {
  return getCommands().map(cmd => ({
    ...cmd,
    hint: buildHint(cmd),
  }));
}

export function filterCommands(prefix: string): Array<Command & { hint: string }> {
  const q = prefix.toLowerCase();
  return getDisplayCommands().filter(
    c => c.cmd.toLowerCase().startsWith(q) ||
         c.description.toLowerCase().includes(q.slice(1))
  ).slice(0, 8);
}

interface DisplayCommand extends Command {
  hint: string;
}

interface Props {
  filtered: DisplayCommand[];
  selectedIndex: number;
  visible: boolean;
}

// Pure display component — all key handling lives in app.tsx useInput.
export function CommandAutocomplete({ filtered, selectedIndex, visible }: Props) {
  if (!visible || filtered.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1}>
      <Box borderStyle="single" borderColor="#58A6FF" flexDirection="column" paddingX={1}>
        {filtered.map((cmd, index) => (
          <Box key={cmd.cmd}>
            <Text color={index === selectedIndex ? '#58A6FF' : '#8C959F'}>
              {index === selectedIndex ? '▶ ' : '  '}
            </Text>
            <Text
              color={index === selectedIndex ? '#C9D1D9' : '#8C959F'}
              bold={index === selectedIndex}
            >
              {cmd.hint.padEnd(28)}
            </Text>
            <Text color="#484F58">{cmd.description}</Text>
          </Box>
        ))}
      </Box>
      <Text color="#484F58" dimColor>  ↑↓ navigate · Enter/Tab select · Esc dismiss</Text>
    </Box>
  );
}
