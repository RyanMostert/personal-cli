import React from 'react';
import { Box, Text } from 'ink';
import type { DiffLine } from '../utils/diff-parser.js';

interface Props {
  lines: DiffLine[];
}

const MAX_INLINE_LINES = 8;

export function DiffView({ lines }: Props) {
  const displayLines = lines.slice(0, MAX_INLINE_LINES);
  const hasMore = lines.length > MAX_INLINE_LINES;

  return (
    <Box flexDirection="column" paddingLeft={2} marginY={0}>
      <Box flexDirection="column">
        {displayLines.map((line, i) => (
          <Box key={i}>
            {line.type === '+' && (
              <>
                <Text color="#3FB950" bold>
                  +
                </Text>
                <Text color="#3FB950">{line.content}</Text>
              </>
            )}
            {line.type === '-' && (
              <>
                <Text color="#FF5555" bold>
                  -
                </Text>
                <Text color="#FF5555" dimColor>
                  {line.content}
                </Text>
              </>
            )}
            {line.type === 'context' && (
              <>
                <Text color="#484F58"> </Text>
                <Text color="#484F58" dimColor>
                  {line.content}
                </Text>
              </>
            )}
            {line.type === 'header' && (
              <Text color="#00E5FF" bold>
                {line.content}
              </Text>
            )}
          </Box>
        ))}
        {hasMore && (
          <Text color="#484F58" italic>
            ... ({lines.length - MAX_INLINE_LINES} more lines)
          </Text>
        )}
      </Box>
    </Box>
  );
}
