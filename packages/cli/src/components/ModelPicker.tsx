import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { MODEL_REGISTRY, type ProviderName, type ModelEntry, type ModelTag } from '@personal-cli/shared';
import fuzzysort from 'fuzzysort';
import {
  getRecentModels,
  addRecentModel,
  getCachedModels,
  convertToModelEntry,
  getAllCacheStats,
  type CacheStats,
} from '@personal-cli/core';

interface Props {
  onSelect: (provider: ProviderName, modelId: string) => void;
  onClose: () => void;
  tick?: number;
}

const TAG_COLORS: Record<ModelTag, string> = {
  reasoning: '#BD93F9',
  coding: '#00E5FF',
  vision: '#FFB86C',
  fast: '#50FA7B',
  large: '#FF00AA',
};

const VISIBLE_HEIGHT = 14;
// Providers with more models than this auto-collapse on open
const COLLAPSE_THRESHOLD = 5;

type RowHeader = { kind: 'header'; provider: string; label: string; collapsed: boolean; modelCount: number };
type RowModel = { kind: 'model'; model: ModelEntry };
type Row = RowHeader | RowModel;

// Compute which providers exceed the threshold (runs once)
function defaultCollapsedSet(): Set<string> {
  const counts = new Map<string, number>();
  for (const m of MODEL_REGISTRY) counts.set(m.provider, (counts.get(m.provider) ?? 0) + 1);
  return new Set([...counts.entries()].filter(([, c]) => c > COLLAPSE_THRESHOLD).map(([p]) => p));
}

export function ModelPicker({ onSelect, onClose, tick = 0 }: Props) {
  const [filter, setFilter] = useState('');
  const [rowFocus, setRowFocus] = useState(0);
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(defaultCollapsedSet);
  const [costSavingMode, setCostSavingMode] = useState(false);
  const [cachedModels, setCachedModels] = useState<ModelEntry[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats[]>([]);

  // Load cached models on mount
  useEffect(() => {
    const loadCached = async () => {
      const providers: ProviderName[] = ['openrouter', 'github-copilot', 'opencode', 'opencode-zen'];
      const allCached: ModelEntry[] = [];

      for (const provider of providers) {
        const cached = await getCachedModels(provider);
        if (cached) {
          allCached.push(...cached.map(convertToModelEntry));
        }
      }

      setCachedModels(allCached);

      const stats = await getAllCacheStats();
      setCacheStats(stats);
    };

    loadCached();
  }, []);

  // Calculate average cost for comparison
  const getAvgCost = (m: ModelEntry): number => {
    if (m.free) return 0;
    if (m.inputCostPer1M == null || m.outputCostPer1M == null) return 10; // Unknown = expensive
    return (m.inputCostPer1M + m.outputCostPer1M) / 2;
  };

  // Parse filter for tags (e.g., "gpt #fast #free")
  const { searchQuery, tags, freeOnly } = useMemo(() => {
    const parts = filter.split(' ').filter(Boolean);
    const tagSet = new Set<ModelTag>();
    let isFreeOnly = false;
    const queryParts: string[] = [];
    for (const part of parts) {
      if (part.startsWith('#')) {
        const tag = part.slice(1);
        if (tag === 'free') isFreeOnly = true;
        else if (['reasoning', 'coding', 'vision', 'fast', 'large'].includes(tag)) tagSet.add(tag as ModelTag);
      } else {
        queryParts.push(part);
      }
    }
    return { searchQuery: queryParts.join(' '), tags: tagSet, freeOnly: isFreeOnly };
  }, [filter]);

  // Recent models (only shown when no filter)
  const recentModels = useMemo(() => {
    const recent = getRecentModels();
    return recent
      .map((r: { provider: string; modelId: string }) =>
        MODEL_REGISTRY.find((m) => m.provider === r.provider && m.id === r.modelId),
      )
      .filter((m): m is ModelEntry => m !== undefined);
  }, []);

  // Merge static and cached models
  const allModels = useMemo(() => {
    // Create a map to deduplicate (cached takes precedence over static)
    const modelMap = new Map<string, ModelEntry>();

    // Add static models first
    for (const m of MODEL_REGISTRY) {
      modelMap.set(`${m.provider}/${m.id}`, m);
    }

    // Override with cached models
    for (const m of cachedModels) {
      modelMap.set(`${m.provider}/${m.id}`, m);
    }

    return Array.from(modelMap.values());
  }, [cachedModels]);

  // Filter models
  const filtered = useMemo(() => {
    let models = allModels;
    if (tags.size > 0) models = models.filter((m) => Array.from(tags).some((tag) => m.tags?.includes(tag)));
    if (freeOnly) models = models.filter((m) => m.free);
    // Cost-saving mode: filter to cheaper models (avg cost <$2/1M tokens)
    if (costSavingMode && !freeOnly) {
      models = models.filter((m) => {
        if (m.free) return true;
        const avg = getAvgCost(m);
        return avg < 2;
      });
    }
    if (searchQuery) {
      models = fuzzysort
        .go(searchQuery, models, {
          keys: ['id', 'label', 'provider'],
          threshold: -10000,
        })
        .map((r) => r.obj);
    }
    return models;
  }, [allModels, searchQuery, tags, freeOnly, costSavingMode]);

  // When filter is active, expand all so results are fully visible
  const effectiveCollapsed = filter ? new Set<string>() : collapsedProviders;

  // Build flat rows (headers + models, headers navigable too)
  const allRows = useMemo<Row[]>(() => {
    const rows: Row[] = [];

    // Recent section is never collapsed
    const showRecent = !filter && recentModels.length > 0;
    if (showRecent) {
      rows.push({
        kind: 'header',
        provider: '__recent__',
        label: '★ Recent',
        collapsed: false,
        modelCount: recentModels.length,
      });
      for (const m of recentModels) rows.push({ kind: 'model', model: m });
    }

    // Group remaining by provider
    const byProvider = new Map<string, ModelEntry[]>();
    for (const m of filtered) {
      if (!byProvider.has(m.provider)) byProvider.set(m.provider, []);
      byProvider.get(m.provider)!.push(m);
    }
    for (const [provider, models] of byProvider) {
      const collapsed = effectiveCollapsed.has(provider);
      rows.push({ kind: 'header', provider, label: provider, collapsed, modelCount: models.length });
      if (!collapsed) {
        for (const m of models) rows.push({ kind: 'model', model: m });
      }
    }

    return rows;
  }, [filtered, recentModels, filter, effectiveCollapsed]);

  useEffect(() => {
    setRowFocus(0);
  }, [filter]);

  const toggleCollapse = (provider: string) => {
    setCollapsedProviders((s) => {
      const next = new Set(s);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setRowFocus((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setRowFocus((i) => Math.min(allRows.length - 1, i + 1));
      return;
    }

    if (key.return || input === ' ') {
      const row = allRows[rowFocus];
      if (!row) return;
      if (row.kind === 'header') {
        if (row.provider !== '__recent__') toggleCollapse(row.provider);
        return;
      }
      // Model row — select it
      const m = row.model;
      addRecentModel(m.provider, m.id);
      onSelect(m.provider, m.id);
      return;
    }

    if (key.backspace || key.delete) {
      setFilter((f) => f.slice(0, -1));
      return;
    }
    if (input === '$') {
      setCostSavingMode((s) => !s);
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setFilter((f) => f + input);
    }
  });

  // Windowing centred on the focused row
  const scrollTop = Math.max(
    0,
    Math.min(rowFocus - Math.floor(VISIBLE_HEIGHT / 2), Math.max(0, allRows.length - VISIBLE_HEIGHT)),
  );
  const visibleRows = allRows.slice(scrollTop, scrollTop + VISIBLE_HEIGHT);
  const hiddenAbove = scrollTop;
  const hiddenBelow = Math.max(0, allRows.length - scrollTop - visibleRows.length);

  const formatCost = (m: ModelEntry) => {
    if (m.free) return 'FREE';
    if (m.inputCostPer1M == null) return '?';
    return `$${m.inputCostPer1M}/$${m.outputCostPer1M}`;
  };

  const getCostColor = (m: ModelEntry): string => {
    if (m.free) return '#3FB950'; // Green for free
    const avg = getAvgCost(m);
    if (avg > 5) return '#FF00AA'; // Magenta for expensive (>$5)
    if (avg > 2) return '#FFB86C'; // Orange for moderate (>$2)
    return '#8C959F'; // Gray for cheap
  };

  const isExpensive = (m: ModelEntry): boolean => {
    return getAvgCost(m) > 5;
  };

  const formatCtx = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1_000}k`);

  return (
    <Box borderStyle="single" borderColor="#00E5FF" flexDirection="column" paddingX={1} paddingY={1} marginY={1}>
      {/* Title */}
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color="#00E5FF" bold>
          {' '}
          NEURAL_LINK:MODEL_SELECTION{' '}
        </Text>
      </Box>

      {/* Filter bar */}
      <Box marginBottom={1} paddingX={1} borderStyle="round" borderColor="#484F58">
        <Text color="#FF00AA" bold>
          ❯{' '}
        </Text>
        <Text color="#00E5FF" bold>
          FILTER:{' '}
        </Text>
        <Text color="white" bold>
          {filter}
        </Text>
        <Text color="#00E5FF">{tick % 2 === 0 ? '▌' : ' '}</Text>
      </Box>

      {(tags.size > 0 || freeOnly || costSavingMode) && (
        <Box marginBottom={1} paddingX={1}>
          <Text color="#484F58">FILTERS: </Text>
          {freeOnly && (
            <Text color="#3FB950" bold>
              ✦free{' '}
            </Text>
          )}
          {costSavingMode && (
            <Text color="#00E5FF" bold>
              ✦$cheap{' '}
            </Text>
          )}
          {Array.from(tags).map((tag) => (
            <Text key={tag} color={TAG_COLORS[tag]} bold>
              ◈{tag}{' '}
            </Text>
          ))}
        </Box>
      )}

      {/* Scroll indicator top */}
      <Box height={1} alignItems="center" justifyContent="center">
        {hiddenAbove > 0 ? (
          <Text color="#FF00AA"> ▲ {hiddenAbove} above ▲ </Text>
        ) : (
          <Text color="#484F58"> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ </Text>
        )}
      </Box>

      {allRows.length === 0 && (
        <Box paddingY={2} alignItems="center">
          <Text color="#FF5555" bold>
            {' '}
            [!] NO MODELS MATCH{' '}
          </Text>
        </Box>
      )}

      {/* Rows */}
      <Box flexDirection="column">
        {visibleRows.map((row, i) => {
          const focused = scrollTop + i === rowFocus;

          if (row.kind === 'header') {
            const isRecent = row.provider === '__recent__';
            const stat = cacheStats.find((s) => s.provider === row.provider);
            const hasCache = stat && stat.modelCount > 0;
            const isStale = stat?.isStale;
            return (
              <Box
                key={`h-${row.provider}-${i}`}
                marginTop={i === 0 ? 0 : 1}
                backgroundColor={focused ? '#161b22' : undefined}
              >
                <Text color={focused ? '#FF00AA' : '#484F58'} bold>
                  {' '}
                  {isRecent ? '╭─ ' : row.collapsed ? '▶ ' : '▼ '}
                </Text>
                <Text color={focused ? '#00E5FF' : '#484F58'} bold>
                  {row.label.toUpperCase()}
                </Text>
                {!isRecent && (
                  <Text color={focused ? '#8C959F' : '#484F58'}>
                    {' ─── '}
                    {row.collapsed ? `${row.modelCount} models  [Enter/Space to expand]` : `[Enter/Space to collapse]`}
                  </Text>
                )}
                {hasCache && <Text color={isStale ? '#FFB86C' : '#50FA7B'}> {isStale ? '⚠ cached' : '🔄 cached'}</Text>}
              </Box>
            );
          }

          // Model row
          const m = row.model;
          const expensive = isExpensive(m);
          return (
            <Box key={`m-${i}-${m.provider}-${m.id}`} paddingLeft={2} backgroundColor={focused ? '#161b22' : undefined}>
              <Text color={focused ? '#FF00AA' : '#484F58'}>{focused ? '❯❯ ' : '   '}</Text>
              <Text color={focused ? 'white' : '#8C959F'} bold={focused}>
                {m.id.padEnd(40)}
              </Text>
              <Box marginLeft={1}>
                <Text color="#484F58">Ctx:</Text>
                <Text color="#00E5FF" bold={focused}>
                  {formatCtx(m.contextWindow).padStart(5)}{' '}
                </Text>
              </Box>
              <Box marginLeft={1} width={18}>
                <Text color={getCostColor(m)} bold={expensive}>
                  {expensive && !m.free ? '⚠ ' : '  '}
                  {formatCost(m).padStart(13)}
                </Text>
              </Box>
              <Box marginLeft={1}>
                {m.tags?.map((tag) => (
                  <Text key={tag} color={TAG_COLORS[tag]}>
                    •{tag}{' '}
                  </Text>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Scroll indicator bottom */}
      <Box height={1} alignItems="center" justifyContent="center" marginTop={1}>
        {hiddenBelow > 0 ? (
          <Text color="#FF00AA"> ▼ {hiddenBelow} below ▼ </Text>
        ) : (
          <Text color="#484F58"> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ </Text>
        )}
      </Box>

      <Box marginTop={1} justifyContent="space-between" paddingX={1}>
        <Text color="#484F58"> ESC abort · type to filter · #free #fast · $ cheap mode · Ctrl+R refresh </Text>
        <Text color="#00E5FF" bold>
          {' '}
          Enter select/toggle{' '}
        </Text>
      </Box>
    </Box>
  );
}
