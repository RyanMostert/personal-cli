import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { highlightCode } from '../highlight.js';

const VISIBLE_LINES = 35;

interface Props {
  type: 'file' | 'diff';
  path: string;
  content?: string;
  oldText?: string;
  newText?: string;
  scrollOffset: number;
  onClose: () => void;
}

export function SidePanel({ type, path, content, oldText, newText, scrollOffset, onClose }: Props) {
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    setHighlighted(null);
    if (type === 'file' && content) {
      const ext = path.split('.').pop() || 'txt';
      highlightCode(content, ext).then(setHighlighted);
    }
  }, [type, path, content]);

  const lines = (highlighted ?? content ?? '').split('\n');
  const totalLines = lines.length;
  const visibleLines = lines.slice(scrollOffset, scrollOffset + VISIBLE_LINES);
  const hiddenAbove = scrollOffset;
  const hiddenBelow = Math.max(0, totalLines - scrollOffset - VISIBLE_LINES);

  const fileName = path.split('/').pop() ?? path;

  return (
    <Box
      flexDirection="column"
      width="50%"
      borderStyle="double"
      borderColor="#00E5FF"
      paddingX={1}
      marginLeft={1}
    >
      {/* Header */}
      <Box borderBottom borderStyle="single" borderColor="#484F58" marginBottom={1}>
        <Text color="#00E5FF" bold> {type === 'file' ? '🔍 FILE_VIEWER' : '🔧 DIFF_TERMINAL'} </Text>
        <Text color="#8C959F"> {fileName.toUpperCase()} </Text>
        <Text color="#484F58"> ({totalLines} lines) </Text>
        <Text color="#FF00AA" bold> [ESC] </Text>
      </Box>

      {type === 'file' && (
        <Box flexDirection="column">
          {hiddenAbove > 0 && (
            <Text color="#484F58">  ↑ {hiddenAbove} lines above</Text>
          )}
          {visibleLines.map((line, i) => (
            <Box key={scrollOffset + i}>
              <Text color="#484F58">{String(scrollOffset + i + 1).padStart(4)} </Text>
              <Text wrap="truncate">{line}</Text>
            </Box>
          ))}
          {hiddenBelow > 0 && (
            <Text color="#484F58">  ↓ {hiddenBelow} lines below · ↑↓ scroll</Text>
          )}
        </Box>
      )}

      {type === 'diff' && (
        <Box flexDirection="column">
          <Box flexDirection="column" marginBottom={1}>
            <Text color="#FF5555" bold> [-] PREVIOUS </Text>
            <Box borderStyle="single" borderColor="#FF5555" paddingX={1}>
              <Text color="#FF5555" dimColor wrap="wrap">{oldText}</Text>
            </Box>
          </Box>
          <Box flexDirection="column">
            <Text color="#3FB950" bold> [+] PATCHED </Text>
            <Box borderStyle="single" borderColor="#3FB950" paddingX={1}>
              <Text color="#3FB950" wrap="wrap">{newText}</Text>
            </Box>
          </Box>
          <Box marginTop={1}>
            <Text color="#00E5FF" bold>  PATCH_APPLIED ✓ </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
