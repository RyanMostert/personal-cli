import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { listConversations } from '@personal-cli/core';
import type { ConversationMeta } from '@personal-cli/core';

interface Props {
  onSelect: (id: string) => void;
  onClose: () => void;
}

const VISIBLE_HEIGHT = 10;

export function HistoryPicker({ onSelect, onClose }: Props) {
  const [items] = useState<ConversationMeta[]>(() => listConversations());
  const [focusIndex, setFocusIndex] = useState(0);

  useInput((_, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.return && items[focusIndex]) {
      onSelect(items[focusIndex].id);
      return;
    }
    if (key.upArrow) setFocusIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setFocusIndex((i) => Math.min(items.length - 1, i + 1));
  });

  const relativeDate = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  };

  // Windowing
  const scrollTop = Math.max(
    0,
    Math.min(
      focusIndex - Math.floor(VISIBLE_HEIGHT / 2),
      Math.max(0, items.length - VISIBLE_HEIGHT),
    ),
  );
  const visible = items.slice(scrollTop, scrollTop + VISIBLE_HEIGHT);
  const hiddenAbove = scrollTop;
  const hiddenBelow = Math.max(0, items.length - scrollTop - visible.length);

  return (
    <Box borderStyle="round" borderColor="#8B949E" flexDirection="column" paddingX={1} marginY={1}>
      <Text bold color="#8B949E">
        CONVERSATION HISTORY ({items.length} saved)
      </Text>

      {items.length === 0 && <Text color="#484F58">No saved conversations.</Text>}

      {hiddenAbove > 0 && <Text color="#484F58"> ↑ {hiddenAbove} more above</Text>}

      {visible.map((item, i) => {
        const realIdx = scrollTop + i;
        const focused = realIdx === focusIndex;
        return (
          <Box key={item.id} paddingLeft={1}>
            <Text color={focused ? '#58A6FF' : '#8C959F'}>{focused ? '▶ ' : '  '}</Text>
            <Text color={focused ? '#C9D1D9' : '#8C959F'}>{item.title.slice(0, 40).padEnd(41)}</Text>
            <Text color="#484F58">{relativeDate(item.date).padEnd(10)}</Text>
            <Text color="#484F58">{item.model}</Text>
          </Box>
        );
      })}

      {hiddenBelow > 0 && <Text color="#484F58"> ↓ {hiddenBelow} more below</Text>}

      <Box marginTop={1}>
        <Text color="#484F58">↑↓ scroll Enter load Esc cancel</Text>
      </Box>
    </Box>
  );
}
