import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { DEFAULT_KEYBINDINGS, formatKeyCombo, type Keybinding } from '../keybindings/registry.js';

interface Props {
  onClose: () => void;
}

const VISIBLE_COUNT = 15;

export function KeyHintOverlay({ onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const categories: Record<string, Keybinding[]> = {
    ESSENTIAL_TIPS: [
      {
        id: 'tip_cmd',
        combo: { input: '/' },
        action: '',
        description: 'Type / for all commands',
        category: 'global',
      },
      {
        id: 'tip_file',
        combo: { input: '@' },
        action: '',
        description: 'Type @ to attach context',
        category: 'global',
      },
      {
        id: 'tip_mode',
        combo: { key: 'tab' },
        action: '',
        description: 'Cycle ask/plan/build',
        category: 'global',
      },
    ],
    GLOBAL_COMMANDS: DEFAULT_KEYBINDINGS.filter((k) => k.category === 'global'),
    NAVIGATION: DEFAULT_KEYBINDINGS.filter((k) => k.category === 'navigation'),
    PANEL_CONTROLS: DEFAULT_KEYBINDINGS.filter((k) => k.category === 'panel'),
    EDITING: DEFAULT_KEYBINDINGS.filter((k) => k.category === 'editing'),
  };

  const flatList = Object.entries(categories).flatMap(([cat, binds]) => [
    { type: 'header', label: cat },
    ...binds.map((b) => ({ type: 'bind', ...b })),
  ]);

  useInput((input, key) => {
    if (key.escape || input === '?') {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(flatList.length - 1, i + 1));
    }
  });

  const scrollOffset = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(VISIBLE_COUNT / 2),
      Math.max(0, flatList.length - VISIBLE_COUNT),
    ),
  );

  const visibleItems = flatList.slice(scrollOffset, scrollOffset + VISIBLE_COUNT);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="#FF00AA"
      paddingX={2}
      paddingY={1}
      width={60}
      alignSelf="center"
    >
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color="#FF00AA" bold>
          {' '}
          ⌨ NEURAL_INTERFACE:KEYBINDS{' '}
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {visibleItems.map((item, i) => {
          const actualIdx = scrollOffset + i;
          const isSelected = actualIdx === selectedIndex;

          if ('label' in item) {
            return (
              <Box key={item.label} marginTop={1} marginBottom={0}>
                <Text color="#00E5FF" bold>
                  ── {item.label} ──
                </Text>
              </Box>
            );
          }

          const bind = item as Keybinding;
          return (
            <Box key={bind.id} paddingLeft={2} backgroundColor={isSelected ? '#161B22' : undefined}>
              <Text color={isSelected ? '#FF00AA' : '#484F58'}>{isSelected ? '❯ ' : '  '}</Text>
              <Box width={15}>
                <Text color="white" bold>
                  {formatKeyCombo(bind.combo)}
                </Text>
              </Box>
              <Text color={isSelected ? 'white' : '#8C959F'}>{bind.description}</Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} borderTop borderStyle="single" borderColor="#484F58" paddingTop={0}>
        <Text color="#484F58"> ESC:BACK ↑↓:NAVIGATE </Text>
      </Box>
    </Box>
  );
}
