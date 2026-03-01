import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
// @ts-expect-error Types missing
import Gradient from 'ink-gradient';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isDisabled?: boolean;
}

export function InputBox({ value, onChange, onSubmit, isDisabled = false }: Props) {
  return (
    <Box
      borderStyle="round"
      borderColor={isDisabled ? '#484F58' : '#79C0FF'}
      paddingX={1}
      paddingY={0}
      marginBottom={0}
      flexShrink={0}
    >
      <Box marginRight={1}>
        {isDisabled ? (
          <Text color="#484F58">⚡</Text>
        ) : (
          <Gradient name="pastel">
            <Text bold>⚡</Text>
          </Gradient>
        )}
      </Box>
      <Box flexGrow={1}>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={isDisabled ? 'Waiting for agent...' : 'Type a command or question... (/help)'}
          focus={!isDisabled}
        />
      </Box>
      {!isDisabled && (
        <Box paddingLeft={2}>
          <Text color="#30363D">
            Enter ↵
          </Text>
        </Box>
      )}
    </Box>
  );
}
