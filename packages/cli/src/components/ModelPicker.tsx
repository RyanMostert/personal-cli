import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { MODEL_REGISTRY } from '@personal-cli/shared';
import type { ProviderName } from '@personal-cli/shared';

interface Props {
  onSelect: (provider: ProviderName, modelId: string) => void;
  onClose: () => void;
}

export function ModelPicker({ onSelect, onClose }: Props) {
  const [filter, setFilter] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);

  // Filter and flatten models
  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return MODEL_REGISTRY.filter(
      m => m.id.includes(q) || m.label.toLowerCase().includes(q) || m.provider.includes(q)
    );
  }, [filter]);

  useInput((input, key) => {
    if (key.escape) { onClose(); return; }
    if (key.return) {
      const m = filtered[focusIndex];
      if (m) onSelect(m.provider, m.id);
      return;
    }
    if (key.upArrow) { setFocusIndex(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setFocusIndex(i => Math.min(filtered.length - 1, i + 1)); return; }
    if (key.backspace || key.delete) { setFilter(f => f.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) { setFilter(f => f + input); setFocusIndex(0); }
  });

  // Group filtered models by provider for display
  const byProvider = new Map<ProviderName, typeof filtered>();
  for (const m of filtered) {
    if (!byProvider.has(m.provider)) byProvider.set(m.provider, []);
    byProvider.get(m.provider)!.push(m);
  }

  // Build flat list index for focus tracking
  const flatList: typeof filtered = [];
  for (const [, models] of byProvider) flatList.push(...models);

  const formatCost = (m: typeof MODEL_REGISTRY[0]) => {
    if (m.free) return 'FREE';
    if (m.inputCostPer1M == null) return '?';
    return `$${m.inputCostPer1M}/$${m.outputCostPer1M}`;
  };

  const formatCtx = (n: number) => n >= 1_000_000 ? `${n/1_000_000}M` : `${n/1_000}k`;

  return (
    <Box borderStyle="round" borderColor="#58A6FF" flexDirection="column" paddingX={1} marginY={1}>
      <Box marginBottom={1}>
        <Text bold color="#58A6FF">SELECT MODEL  </Text>
        <Text color="#8C959F">Filter: </Text>
        <Text color="#C9D1D9">{filter || ' '}</Text>
        <Text color="#484F58">_</Text>
      </Box>

      {filtered.length === 0 && (
        <Text color="#484F58">No models match "{filter}"</Text>
      )}

      {Array.from(byProvider.entries()).map(([provider, models]) => (
        <Box key={provider} flexDirection="column" marginBottom={1}>
          <Text color="#484F58" bold>{provider}</Text>
          {models.map(m => {
            const idx = flatList.indexOf(m);
            const focused = idx === focusIndex;
            return (
              <Box key={m.id} paddingLeft={2}>
                <Text color={focused ? '#58A6FF' : '#8C959F'}>{focused ? '▶ ' : '  '}</Text>
                <Text color={focused ? '#C9D1D9' : '#8C959F'} bold={focused}>
                  {m.id.padEnd(38)}
                </Text>
                <Text color="#484F58">{formatCtx(m.contextWindow).padEnd(8)}</Text>
                <Text color={m.free ? '#3FB950' : '#8C959F'}>{formatCost(m)}</Text>
              </Box>
            );
          })}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color="#484F58">↑↓ navigate  Enter select  Esc cancel</Text>
      </Box>
    </Box>
  );
}
