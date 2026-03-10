import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  path: string;
  oldText: string;
  newText: string;
  isExpanded?: boolean;
}

const MAX_PREVIEW_LINES = 3;

export function PatchView({ path, oldText, newText, isExpanded: initialExpanded = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  useInput((input, key) => {
    if (key.return || input === 'e') {
      setIsExpanded(!isExpanded);
    }
  });

  const displayOldLines = isExpanded ? oldLines : oldLines.slice(0, MAX_PREVIEW_LINES);
  const displayNewLines = isExpanded ? newLines : newLines.slice(0, MAX_PREVIEW_LINES);
  const hasMore = oldLines.length > MAX_PREVIEW_LINES || newLines.length > MAX_PREVIEW_LINES;

  return (
    <Box flexDirection="column" marginY={1} paddingX={1} borderStyle="round" borderColor="#484F58">
      <Box marginBottom={1} flexDirection="row" justifyContent="space-between">
        <Text color="#00E5FF" bold>
          {' '}
          📂 PATCH: {path}{' '}
        </Text>
<<<<<<< HEAD
        {hasMore && <Text color="#00E5FF"> {isExpanded ? '[Enter: collapse]' : '[Enter: expand]'} </Text>}
=======
        {hasMore && (
          <Text color="#00E5FF"> {isExpanded ? '[Enter: collapse]' : '[Enter: expand]'} </Text>
        )}
>>>>>>> tools_improvement
      </Box>

      <Box flexDirection="column">
        {displayOldLines.map((line, i) => (
          <Box key={`old-${i}`}>
            <Text color="#FF5555" bold>
              -{' '}
            </Text>
            <Text color="#FF5555" dimColor>
              {line.slice(0, 80)}
              {line.length > 80 ? '...' : ''}
            </Text>
          </Box>
        ))}
        {!isExpanded && oldLines.length > MAX_PREVIEW_LINES && (
          <Text color="#484F58">... ({oldLines.length - MAX_PREVIEW_LINES} more lines)</Text>
        )}

        <Text color="#484F58">---</Text>

        {displayNewLines.map((line, i) => (
          <Box key={`new-${i}`}>
            <Text color="#3FB950" bold>
              +{' '}
            </Text>
            <Text color="#3FB950">
              {line.slice(0, 80)}
              {line.length > 80 ? '...' : ''}
            </Text>
          </Box>
        ))}
        {!isExpanded && newLines.length > MAX_PREVIEW_LINES && (
          <Text color="#484F58">... ({newLines.length - MAX_PREVIEW_LINES} more lines)</Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="#484F58" italic>
          {' '}
          (Surgical replacement applied){' '}
        </Text>
      </Box>
    </Box>
  );
}
