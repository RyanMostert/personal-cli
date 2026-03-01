import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { listConversations } from '@personal-cli/core';
import type { ConversationMeta } from '@personal-cli/core';

interface Props {
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function HistoryPicker({ onSelect, onClose }: Props) {
  const [items] = useState<ConversationMeta[]>(() => listConversations());
  const [focusIndex, setFocusIndex] = useState(0);

  useInput((_, key) => {
    if (key.escape) { onClose(); return; }
    if (key.return && items[focusIndex]) { onSelect(items[focusIndex].id); return; }
    if (key.upArrow) setFocusIndex(i => Math.max(0, i - 1));
    if (key.downArrow) setFocusIndex(i => Math.min(items.length - 1, i + 1));
  });

  const relativeDate = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  };

  return (
    <Box borderStyle="round" borderColor="#8B949E" flexDirection="column" paddingX={1} marginY={1}>
      <Text bold color="#8B949E">CONVERSATION HISTORY</Text>
      {items.length === 0 && <Text color="#484F58">No saved conversations.</Text>}
      {items.map((item, i) => (
        <Box key={item.id} paddingLeft={1}>
          <Text color={i === focusIndex ? '#58A6FF' : '#8C959F'}>{i === focusIndex ? '▶ ' : '  '}</Text>
          <Text color={i === focusIndex ? '#C9D1D9' : '#8C959F'}>
            {item.title.slice(0, 42).padEnd(43)}
          </Text>
          <Text color="#484F58">{relativeDate(item.date).padEnd(10)}</Text>
          <Text color="#484F58">{item.model}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color="#484F58">↑↓ navigate  Enter load  Esc cancel</Text>
      </Box>
    </Box>
  );
}
