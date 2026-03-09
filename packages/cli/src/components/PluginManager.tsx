import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { LoadedPlugin } from '@personal-cli/tools';

interface Props {
  plugins: LoadedPlugin[];
  onAdd: () => void;
  onEdit: (name: string) => void;
  onRemove: (name: string) => void;
  onClose: () => void;
  tick?: number;
}

const VISIBLE_HEIGHT = 14;

export function PluginManager({ plugins, onAdd, onEdit, onRemove, onClose, tick = 0 }: Props) {
  const [filter, setFilter] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = filter.toLowerCase();
    return plugins.filter(
      (p) =>
        p.manifest.name.toLowerCase().includes(query) ||
        p.manifest.description?.toLowerCase().includes(query) ||
        p.manifest.tools.some((t) => t.name.toLowerCase().includes(query)),
    );
  }, [filter, plugins]);

  useEffect(() => {
    setFocusIndex(0);
  }, [filter]);

  useInput((input, key) => {
    if (confirmDelete) {
      if (input.toLowerCase() === 'y') {
        onRemove(confirmDelete);
        setConfirmDelete(null);
      } else if (input.toLowerCase() === 'n' || key.escape) {
        setConfirmDelete(null);
      }
      return;
    }

    if (key.escape) {
      onClose();
      return;
    }

    if (input === 'a' && !key.ctrl && !key.meta) {
      onAdd();
      return;
    }

    if (input === 'e' && !key.ctrl && !key.meta) {
      const p = filtered[focusIndex];
      if (p) onEdit(p.manifest.name);
      return;
    }

    if (key.backspace || key.delete) {
      if (filter.length > 0) {
        setFilter((f) => f.slice(0, -1));
      } else {
        const p = filtered[focusIndex];
        if (p) setConfirmDelete(p.manifest.name);
      }
      return;
    }

    if (key.upArrow) {
      setFocusIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setFocusIndex((i) => Math.min(filtered.length - 1, i + 1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setFilter((f) => f + input);
    }
  });

  const scrollTop = Math.max(
    0,
    Math.min(
      focusIndex - Math.floor(VISIBLE_HEIGHT / 2),
      Math.max(0, filtered.length - VISIBLE_HEIGHT),
    ),
  );
  const visibleItems = filtered.slice(scrollTop, scrollTop + VISIBLE_HEIGHT);
  const hiddenAbove = scrollTop;
  const hiddenBelow = Math.max(0, filtered.length - scrollTop - visibleItems.length);

  return (
    <Box
      borderStyle="single"
      borderColor="#AA00FF"
      flexDirection="column"
      paddingX={1}
      paddingY={1}
      marginY={1}
    >
      {/* Title */}
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color="#AA00FF" bold>
          {' '}
          NEURAL_EXPANSION:PLUGIN_CORE{' '}
        </Text>
      </Box>

      {/* Filter bar */}
      <Box marginBottom={1} paddingX={1} borderStyle="round" borderColor="#484F58">
        <Text color="#FF00AA" bold>
          ❯{' '}
        </Text>
        <Text color="#AA00FF" bold>
          SEARCH_MODULES:{' '}
        </Text>
        <Text color="white" bold>
          {filter}
        </Text>
        <Text color="#AA00FF">{tick % 2 === 0 ? '▌' : ' '}</Text>
      </Box>

      {/* Scroll indicator top */}
      <Box height={1} alignItems="center" justifyContent="center">
        {hiddenAbove > 0 ? (
          <Text color="#FF00AA"> ▲ {hiddenAbove} above ▲ </Text>
        ) : (
          <Text color="#484F58"> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ️</Text>
        )}
      </Box>

      {filtered.length === 0 && (
        <Box paddingY={2} alignItems="center" flexDirection="column">
          <Text color="#FF5555" bold>
            {' '}
            [!] NO_PLUGINS_ACTIVE{' '}
          </Text>
          <Text color="#484F58"> Press 'a' to initialize a new plugin module </Text>
        </Box>
      )}

      {/* Rows */}
      <Box flexDirection="column">
        {visibleItems.map((p, i) => {
          const realIdx = scrollTop + i;
          const focused = realIdx === focusIndex;

          return (
            <Box
              key={p.manifest.name}
              paddingLeft={2}
              backgroundColor={focused ? '#161b22' : undefined}
            >
              <Text color={focused ? '#FF00AA' : '#484F58'}>{focused ? '❯❯ ' : '   '}</Text>

              <Box flexDirection="row" justifyContent="space-between" flexGrow={1}>
                <Box>
                  <Text color={focused ? 'white' : '#8C959F'} bold={focused}>
                    {p.manifest.name.toUpperCase()}
                  </Text>
                  <Text color="#484F58"> [v{p.manifest.version || '0.1.0'}] </Text>
                  <Text color="#00E5FF">({p.manifest.tools.length} tools)</Text>
                </Box>

                <Box>
                  <Text color={focused ? '#00E5FF' : '#484F58'}> [E:EDIT] </Text>
                  <Text color={focused ? '#FF5555' : '#484F58'}> [BACKSPACE:PURGE] </Text>
                </Box>
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

      {/* Confirmation Modal */}
      {confirmDelete && (
        <Box
          position="absolute"
          alignSelf="center"
          marginTop={5}
          paddingX={2}
          paddingY={1}
          backgroundColor="black"
          borderStyle="double"
          borderColor="#FF5555"
        >
          <Text color="#FF5555" bold>
            {' '}
            UNLINK PLUGIN {confirmDelete.toUpperCase()}? [Y/N]{' '}
          </Text>
        </Box>
      )}

      <Box marginTop={1} justifyContent="space-between" paddingX={1}>
        <Text color="#484F58"> ESC:ABORT │ A:ADD │ ↑↓:NAVIGATE </Text>
        <Text color="#AA00FF" bold>
          {' '}
          E:EDIT │ BACKSPACE:DELETE{' '}
        </Text>
      </Box>
    </Box>
  );
}
