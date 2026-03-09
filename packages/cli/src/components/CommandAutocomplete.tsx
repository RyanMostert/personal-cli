import React from 'react';
import { Box, Text } from 'ink';
import { getCommands } from '../commands/registry.js';
import type { Command } from '../commands/types.js';
import { getAllToolSchemas } from '@personal-cli/tools';

// Re-export for backward compatibility
export type { Command };

export interface PaletteItem {
  id: string;
  type: 'command' | 'tool' | 'macro' | 'help';
  title: string;
  subtitle: string;
  action: () => void;
  keywords: string[];
}

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
    '/help': '/help [examples|tools]',
    '/history': '/history',
    '/model': '/model [provider/id]',
    '/mode': '/mode <ask|auto|build>',
    '/open': '/open <path>',
    '/provider': '/provider',
    '/rename': '/rename <title>',
    '/theme': '/theme [name]',
    '/tools': '/tools',
    '/macros': '/macros',
  };
  return hints[cmd.cmd] || cmd.cmd;
}

// Convert registry commands to display format
function getDisplayCommands(): Array<Command & { hint: string }> {
  return getCommands().map((cmd) => ({
    ...cmd,
    hint: buildHint(cmd),
  }));
}

// Fuzzy match score - higher is better
function fuzzyMatch(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact match
  if (t === q) return 100;
  // Starts with
  if (t.startsWith(q)) return 80;
  // Contains
  if (t.includes(q)) return 60;

  // Character matching (fuzzy)
  let score = 0;
  let qIdx = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      score += 10;
      qIdx++;
      // Bonus for consecutive matches
      if (i > 0 && t[i - 1] === q[qIdx - 2]) {
        score += 5;
      }
    }
  }

  // Penalty for not matching all query characters
  if (qIdx < q.length) {
    score -= (q.length - qIdx) * 20;
  }

  return Math.max(0, score);
}

export function filterCommands(prefix: string): Array<Command & { hint: string; score: number }> {
  const q = prefix.toLowerCase().trim();
  const commands = getDisplayCommands();

  return commands
    .map((cmd) => ({
      ...cmd,
      score: fuzzyMatch(q, `${cmd.cmd} ${cmd.description}`),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

// Generate contextual suggestions based on input
export function getSuggestions(input: string): string[] {
  const suggestions: string[] = [];

  // Programming-related suggestions
  if (/explain|how|what/.test(input.toLowerCase())) {
    suggestions.push(
      "Try: 'Explain async/await in JavaScript'",
      "Try: 'What is a closure?'",
      "Try: 'How do for loops work?'",
    );
  }

  // Search-related suggestions
  if (/search|find|look/.test(input.toLowerCase())) {
    suggestions.push(
      "Try: 'Search for React hooks usage'",
      "Try: 'Find files with TODO comments'",
      "Try: 'Look for error handling patterns'",
    );
  }

  // Debug-related suggestions
  if (/error|bug|fix|debug/.test(input.toLowerCase())) {
    suggestions.push(
      "Try: 'Debug: [paste error message]'",
      "Try: 'Find the bug in this code'",
      "Try: 'Explain this error'",
    );
  }

  // No match suggestions
  if (input.length > 3 && suggestions.length === 0) {
    suggestions.push(
      'No exact match found',
      'Try rephrasing with different keywords',
      'Use /help to see available commands',
      "Try 'explain', 'search', or 'debug'",
    );
  }

  return suggestions.slice(0, 3);
}

interface DisplayCommand extends Command {
  hint: string;
}

interface Props {
  filtered: DisplayCommand[];
  selectedIndex: number;
  visible: boolean;
  input?: string;
  showSuggestions?: boolean;
}

// Pure display component — all key handling lives in app.tsx useInput.
export function CommandAutocomplete({
  filtered,
  selectedIndex,
  visible,
  input,
  showSuggestions,
}: Props) {
  if (!visible) return null;

  const suggestions = showSuggestions && input ? getSuggestions(input) : [];
  const selected = filtered[selectedIndex];

  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1}>
      <Box flexDirection="row">
        {/* Command List */}
        {filtered.length > 0 && (
          <Box
            borderStyle="single"
            borderColor="#58A6FF"
            flexDirection="column"
            paddingX={1}
            minWidth={40}
          >
            {filtered.map((cmd, index) => (
              <Box key={cmd.cmd}>
                <Text color={index === selectedIndex ? '#58A6FF' : '#8C959F'}>
                  {index === selectedIndex ? '▶ ' : '  '}
                </Text>
                <Text
                  color={index === selectedIndex ? '#C9D1D9' : '#8C959F'}
                  bold={index === selectedIndex}
                >
                  {cmd.cmd.padEnd(12)}
                </Text>
                <Text color={index === selectedIndex ? '#C9D1D9' : '#484F58'}>
                  {cmd.description.slice(0, 30)}...
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Intelligence Hint Preview */}
        {selected && (
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="#D29922"
            paddingX={1}
            marginLeft={1}
            flexGrow={1}
          >
            <Box
              position="absolute"
              marginTop={-1}
              marginLeft={1}
              backgroundColor="black"
              paddingX={1}
            >
              <Text color="#D29922" bold>
                {' '}
                💡 INTELLIGENCE:HINT{' '}
              </Text>
            </Box>
            <Box marginTop={0} flexDirection="column">
              <Text color="white" bold>
                {selected.hint}
              </Text>
              <Text color="#8C959F" italic>
                {selected.description}
              </Text>
              {selected.examples && selected.examples.length > 0 && (
                <Box flexDirection="column" marginTop={1}>
                  <Text color="#00E5FF">Examples:</Text>
                  {selected.examples.map((ex, i) => (
                    <Text key={i} color="#484F58">
                      {' '}
                      • {ex}
                    </Text>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {suggestions.length > 0 && (
        <Box marginTop={filtered.length > 0 ? 1 : 0} flexDirection="column">
          <Text color="#8C959F" dimColor>
            Suggestions:
          </Text>
          {suggestions.map((s, i) => (
            <Text key={i} color="#58A6FF" dimColor>
              {' '}
              {s}
            </Text>
          ))}
        </Box>
      )}

      <Text color="#484F58" dimColor>
        {' '}
        ↑↓ navigate · Enter/Tab select · Esc dismiss
      </Text>
    </Box>
  );
}
