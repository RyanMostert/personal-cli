import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  DEFAULT_KEYBINDINGS,
  formatKeyCombo,
  type Keybinding,
  type KeyCombo,
} from '../keybindings/registry.js';

interface Props {
  onClose: () => void;
}

export function KeybindingManager({ onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [bindings, setBindings] = useState<Keybinding[]>(DEFAULT_KEYBINDINGS);

  useInput((input, key) => {
    if (isListening) {
      // Logic to capture combo would go here
      // For now, just cancel listening
      setIsListening(false);
      return;
    }

    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(bindings.length - 1, i + 1));
    }
    if (key.return) {
      setIsListening(true);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="#00E5FF"
      paddingX={2}
      paddingY={1}
      width={70}
      alignSelf="center"
    >
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color="#00E5FF" bold>
          {' '}
          🔧 KEY_REMAPPING_CORE{' '}
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {bindings.map((bind, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Box key={bind.id} paddingLeft={2} backgroundColor={isSelected ? '#161B22' : undefined}>
              <Text color={isSelected ? '#FF00AA' : '#484F58'}>{isSelected ? '❯ ' : '  '}</Text>
              <Box width={20}>
                <Text color="white" bold>
                  {bind.id.toUpperCase()}
                </Text>
              </Box>
              <Box width={15}>
                <Text color="#00E5FF" bold>
                  {formatKeyCombo(bind.combo)}
                </Text>
              </Box>
              <Text color={isSelected ? 'white' : '#8C959F'}>{bind.description}</Text>
            </Box>
          );
        })}
      </Box>

      {isListening && (
        <Box
          position="absolute"
          alignSelf="center"
          marginTop={5}
          paddingX={2}
          paddingY={1}
          backgroundColor="black"
          borderStyle="double"
          borderColor="#FF00AA"
        >
          <Text color="#FF00AA" bold>
            {' '}
            LISTENING_FOR_COMBO... [PRESS_KEY]{' '}
          </Text>
        </Box>
      )}

      <Box
        marginTop={1}
        borderTop
        borderStyle="single"
        borderColor="#484F58"
        paddingTop={0}
        justifyContent="space-between"
      >
        <Text color="#484F58"> ESC:EXIT ↑↓:NAVIGATE ENTER:REMAP </Text>
        <Text color="#D29922"> [DEV_NOTE: PERSISTENCE_PENDING] </Text>
      </Box>
    </Box>
  );
}
