import React from 'react';
import { Box, Text } from 'ink';

export interface Command {
  cmd: string;
  description: string;
  hint: string;
}

export const COMMANDS: Command[] = [
  { cmd: '/add',      description: 'Attach file to context',       hint: '/add <path>' },
  { cmd: '/clear',    description: 'Clear conversation history',   hint: '/clear' },
  { cmd: '/compact',  description: 'Summarize conversation',       hint: '/compact' },
  { cmd: '/copy',     description: 'Copy last response',           hint: '/copy' },
  { cmd: '/cost',     description: 'Show session cost & tokens',   hint: '/cost' },
  { cmd: '/detach',   description: 'Remove all attached files',    hint: '/detach' },
  { cmd: '/exit',     description: 'Exit the app',                 hint: '/exit' },
  { cmd: '/export',   description: 'Export conversation to file',  hint: '/export [path]' },
  { cmd: '/help',     description: 'Show help',                    hint: '/help' },
  { cmd: '/history',  description: 'Browse conversation history',  hint: '/history' },
  { cmd: '/model',    description: 'Switch AI model',              hint: '/model [provider/id]' },
  { cmd: '/mode',     description: 'Switch agent mode',            hint: '/mode <ask|auto|build>' },
  { cmd: '/open',     description: 'Open file in side view',       hint: '/open <path>' },
  { cmd: '/provider', description: 'Manage API keys',              hint: '/provider' },
  { cmd: '/rename',   description: 'Rename this conversation',     hint: '/rename <title>' },
  { cmd: '/theme',    description: 'Switch color theme',           hint: '/theme [name]' },
];

export function filterCommands(prefix: string): Command[] {
  const q = prefix.toLowerCase();
  return COMMANDS.filter(
    c => c.cmd.toLowerCase().startsWith(q) ||
         c.description.toLowerCase().includes(q.slice(1))
  ).slice(0, 8);
}

interface Props {
  filtered: Command[];
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
