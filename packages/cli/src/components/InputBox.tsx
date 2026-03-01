import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
// @ts-expect-error Types missing for ink-gradient
import Gradient from 'ink-gradient';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isDisabled?: boolean;
}

export function InputBox({ value, onChange, onSubmit, isDisabled = false }: Props) {
  const lines = value.split('\n');
  const lineCount = lines.length;
  const isMultiLine = lineCount > 1;

  return (
    <Box
      borderStyle="round"
      borderColor={isDisabled ? '#484F58' : '#79C0FF'}
      paddingX={1}
      paddingY={0}
      marginBottom={0}
      flexShrink={0}
      flexDirection="column"
    >
      <Box>
        <Box marginRight={1} flexShrink={0}>
          {isDisabled ? (
            <Text color="#484F58">⚡</Text>
          ) : (
            <Gradient name="pastel">
              <Text bold>⚡</Text>
            </Gradient>
          )}
        </Box>
        <Box flexGrow={1} flexDirection="column">
          <TextInput
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            placeholder={isDisabled ? 'Waiting for agent...' : 'Type a command or question... (/help)'}
            focus={!isDisabled}
          />
        </Box>
        {!isDisabled && (
          <Box paddingLeft={2} flexShrink={0}>
            <Text color="#484F58">
              {isMultiLine ? `[${lineCount} lines]` : 'Enter ↵'}
            </Text>
          </Box>
        )}
      </Box>
      {!isDisabled && isMultiLine && (
        <Box marginTop={0}>
          <Text color="#6E7681" dimColor>
            Shift+Enter for new line · Ctrl+U to clear · Ctrl+W to delete word
          </Text>
        </Box>
      )}
    </Box>
  );
}
