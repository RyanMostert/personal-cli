import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { glob } from 'glob';
import path from 'path';

interface Props {
  onSelect: (path: string) => void;
  onClose: () => void;
  tick: number;
}

const VISIBLE_COUNT = 15;

export function FileExplorer({ onSelect, onClose, tick }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Use the standard 'glob' package which has better ESM support
    glob('**/*', {
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/build/**', '**/.turbo/**', '**/node_modules'],
      nodir: true,
      dot: false,
    })
      .then((found) => {
        // Normalize paths to forward slashes for consistency
        const normalized = (found as string[]).map((f) => f.replace(/\\/g, '/'));
        setFiles(normalized.sort());
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Glob error:', err);
        setIsLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const query = filter.toLowerCase();
    return files.filter((f) => f.toLowerCase().includes(query));
  }, [files, filter]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      const sel = filtered[selectedIndex];
      if (sel) onSelect(sel);
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : Math.max(0, filtered.length - 1)));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
      return;
    }

    if (key.backspace || key.delete) {
      setFilter((f) => f.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setFilter((f) => f + input);
    }
  });

  const scrollOffset = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(VISIBLE_COUNT / 2), Math.max(0, filtered.length - VISIBLE_COUNT)),
  );

  const visibleItems = filtered.slice(scrollOffset, scrollOffset + VISIBLE_COUNT);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="#00E5FF"
      paddingX={1}
      paddingY={1}
      width={60}
      alignSelf="center"
    >
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color="#00E5FF" bold>
          {' '}
          📂 PROJECT_FILESYSTEM{' '}
        </Text>
      </Box>

      <Box marginBottom={1} paddingX={1} borderStyle="round" borderColor="#484F58">
        <Text color="#FF00AA" bold>
          ❯{' '}
        </Text>
        <Text color="#00E5FF" bold>
          FILTER:{' '}
        </Text>
        <Text color="white">{filter}</Text>
        <Text color="#FF00AA">{tick % 2 === 0 ? '▌' : ' '}</Text>
      </Box>

      {isLoading ? (
        <Box paddingY={2} alignItems="center">
          <Text color="#8C959F">INDEXING_PROJECT_NODES...</Text>
        </Box>
      ) : filtered.length === 0 ? (
        <Box paddingY={2} alignItems="center">
          <Text color="#FF5555" bold>
            {' '}
            [!] NO_MATCHES_FOUND{' '}
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {visibleItems.map((f, i) => {
            const actualIdx = scrollOffset + i;
            const isSelected = actualIdx === selectedIndex;
            const dir = path.dirname(f);
            const name = path.basename(f);

            return (
              <Box key={f} paddingLeft={1} backgroundColor={isSelected ? '#161B22' : undefined}>
                <Text color={isSelected ? '#FF00AA' : '#484F58'}>{isSelected ? '❯ ' : '  '}</Text>
                <Text color="#484F58" dimColor>
                  {dir === '.' ? '' : dir + '/'}
                </Text>
                <Text color={isSelected ? 'white' : '#8C959F'} bold={isSelected}>
                  {name}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1} borderTop borderStyle="single" borderColor="#484F58" paddingTop={0}>
        <Text color="#484F58"> ESC:ABORT ↑↓:NAVIGATE ENTER:OPEN </Text>
      </Box>
    </Box>
  );
}
