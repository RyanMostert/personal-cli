import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { glob } from 'glob';
import { getBatchFrecency, getTopRecentFiles } from '@personal-cli/core';

interface Props {
  query: string;
  visible: boolean;
  selectedIndex: number;
  onFilesChange: (files: string[]) => void;
}

const GLOB_IGNORE = ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.turbo/**', '*.lock', 'pnpm-lock*'];

export function FileAutocomplete({ query, visible, selectedIndex, onFilesChange }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Strip line range suffix (e.g., "agent.ts#10-20" → "agent.ts")
  const cleanQuery = useMemo(() => {
    const h = query.lastIndexOf('#');
    return h > 0 ? query.slice(0, h) : query;
  }, [query]);

  useEffect(() => {
    if (!visible) {
      setFiles([]);
      onFilesChange([]);
      return;
    }

    // Empty query — show top frecent files instantly (no glob needed)
    if (cleanQuery === '') {
      const recent = getTopRecentFiles(8);
      setFiles(recent);
      onFilesChange(recent);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const search = async () => {
      setIsLoading(true);
      try {
        const matches = await glob(`**/*${cleanQuery}*`, {
          cwd: process.cwd(),
          ignore: GLOB_IGNORE,
          nodir: true,
          absolute: false,
        });

        if (cancelled) return;

        // Cap at 50 before sorting so getBatchFrecency stays fast
        const capped = matches.slice(0, 50);
        const scores = getBatchFrecency(capped);
        const sorted = capped.sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0)).slice(0, 8);

        setFiles(sorted);
        onFilesChange(sorted);
      } catch {
        if (!cancelled) {
          setFiles([]);
          onFilesChange([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    // 200 ms debounce — avoids a glob per keystroke
    const t = setTimeout(search, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [cleanQuery, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const label = cleanQuery === '' ? 'Recent files' : `"${cleanQuery}"`;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box borderStyle="single" borderColor="#58A6FF" paddingX={1} flexDirection="column">
        {isLoading ? (
          <Text color="#8C959F"> Searching for {label}…</Text>
        ) : files.length === 0 ? (
          <Text color="#8C959F"> {cleanQuery === '' ? 'No recent files' : `No files match ${label}`}</Text>
        ) : (
          files.map((file, index) => (
            <Box key={file}>
              <Text color={index === selectedIndex ? '#58A6FF' : '#8C959F'}>
                {index === selectedIndex ? '▶ ' : '  '}
              </Text>
              <Text color={index === selectedIndex ? '#C9D1D9' : '#8C959F'} bold={index === selectedIndex}>
                {file}
              </Text>
            </Box>
          ))
        )}
      </Box>
      <Text color="#484F58">Tab/Enter to attach · ↑↓ navigate · Esc to dismiss</Text>
    </Box>
  );
}
