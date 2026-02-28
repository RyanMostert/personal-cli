import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isDisabled?: boolean;
}

export function InputBox({ value, onChange, onSubmit, isDisabled = false }: Props) {
  return (
    <Box
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={isDisabled ? '#484F58' : '#58A6FF'}
      paddingX={1}
      paddingY={0}
    >
      <Text color={isDisabled ? '#484F58' : '#58A6FF'}>{'> '}</Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={isDisabled ? 'Waiting for response...' : 'Type a message...'}
        focus={!isDisabled}
      />
      {!isDisabled && (
        <Text color="#484F58" dimColor>
          {' [Enter to send]'}
        </Text>
      )}
    </Box>
  );
}
