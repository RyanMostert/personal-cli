import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { PROVIDER_REGISTRY, type ProviderEntry } from '@personal-cli/shared';

interface Props {
  configuredProviders: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  tick?: number;
}

const VISIBLE_HEIGHT = 14;

export function ProviderManager({ configuredProviders, onAdd, onRemove, onClose, tick = 0 }: Props) {
  const [filter, setFilter] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = filter.toLowerCase();
    
    // Get all providers from registry that match query
    const registryMatches = PROVIDER_REGISTRY.filter(p =>
      p.id.includes(query) ||
      p.label.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags.some(t => t.includes(query))
    );

    const configured = registryMatches.filter(p => configuredProviders.includes(p.id));
    
    // Add configured providers that are NOT in registry but match query
    configuredProviders.forEach(id => {
      if (!PROVIDER_REGISTRY.find(p => p.id === id) && id.toLowerCase().includes(query)) {
        configured.push({
          id: id as any,
          label: id,
          description: 'Custom/Unknown provider',
          color: '#8C959F',
          tags: ['configured'],
        });
      }
    });

    const available = registryMatches.filter(p => !configuredProviders.includes(p.id));

    return { configured, available, total: configured.length + available.length };
  }, [filter, configuredProviders]);

  useEffect(() => { setFocusIndex(0); }, [filter]);

  const allList = [...filtered.configured, ...filtered.available];

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

    if (key.escape) { onClose(); return; }

    if (key.return) {
      const p = allList[focusIndex];
      if (p) {
        if (!configuredProviders.includes(p.id)) {
          onAdd(p.id);
        }
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (filter.length > 0) {
        setFilter(f => f.slice(0, -1));
      } else {
        const p = allList[focusIndex];
        if (p && configuredProviders.includes(p.id)) {
          setConfirmDelete(p.id);
        }
      }
      return;
    }

    if (key.upArrow) { setFocusIndex(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setFocusIndex(i => Math.min(allList.length - 1, i + 1)); return; }

    if (input && !key.ctrl && !key.meta) { setFilter(f => f + input); }
  });

  // Windowing
  const scrollTop = Math.max(
    0,
    Math.min(
      focusIndex - Math.floor(VISIBLE_HEIGHT / 2),
      Math.max(0, allList.length - VISIBLE_HEIGHT),
    ),
  );
  const visibleItems = allList.slice(scrollTop, scrollTop + VISIBLE_HEIGHT);
  const hiddenAbove = scrollTop;
  const hiddenBelow = Math.max(0, allList.length - scrollTop - visibleItems.length);

  return (
    <Box
      borderStyle="single"
      borderColor="#00E5FF"
      flexDirection="column"
      paddingX={1}
      paddingY={1}
      marginY={1}
    >
      {/* Title */}
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color="#00E5FF" bold> NEURAL_LINK:PROVIDER_CORE </Text>
      </Box>

      {/* Filter bar */}
      <Box marginBottom={1} paddingX={1} borderStyle="round" borderColor="#484F58">
        <Text color="#FF00AA" bold>❯ </Text>
        <Text color="#00E5FF" bold>SCAN_NETWORK: </Text>
        <Text color="white" bold>{filter}</Text>
        <Text color="#00E5FF">{tick % 2 === 0 ? '▌' : ' '}</Text>
      </Box>

      {/* Scroll indicator top */}
      <Box height={1} alignItems="center" justifyContent="center">
        {hiddenAbove > 0
          ? <Text color="#FF00AA"> ▲ {hiddenAbove} above ▲ </Text>
          : <Text color="#484F58"> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ </Text>
        }
      </Box>

      {allList.length === 0 && (
        <Box paddingY={2} alignItems="center">
          <Text color="#FF5555" bold> [!] NO_NODES_DETECTED </Text>
        </Box>
      )}

      {/* Rows */}
      <Box flexDirection="column">
        {visibleItems.map((p, i) => {
          const realIdx = scrollTop + i;
          const focused = realIdx === focusIndex;
          const isConfigured = configuredProviders.includes(p.id);
          
          return (
            <Box key={p.id} paddingLeft={2} backgroundColor={focused ? '#161b22' : undefined}>
              <Text color={focused ? '#FF00AA' : '#484F58'}>{focused ? '❯❯ ' : '   '}</Text>
              
              <Box flexDirection="row" justifyContent="space-between" flexGrow={1}>
                <Box>
                  <Text color={focused ? 'white' : '#8C959F'} bold={focused}>{p.label.toUpperCase()}</Text>
                  {isConfigured ? (
                    <Text color="#3FB950"> [CONNECTED] </Text>
                  ) : (
                    <Text color="#484F58"> [{p.id}] </Text>
                  )}
                </Box>
                
                <Box>
                  {isConfigured ? (
                    <Text color={focused ? '#FF5555' : '#484F58'}> [BACKSPACE:PURGE] </Text>
                  ) : (
                    <Text color={focused ? '#00E5FF' : '#484F58'}> 
                      {p.oauthFlow ? '[ENTER:AUTHORIZE]' : '[ENTER:ESTABLISH]'} 
                    </Text>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Scroll indicator bottom */}
      <Box height={1} alignItems="center" justifyContent="center" marginTop={1}>
        {hiddenBelow > 0
          ? <Text color="#FF00AA"> ▼ {hiddenBelow} below ▼ </Text>
          : <Text color="#484F58"> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ </Text>
        }
      </Box>

      {/* Confirmation Modal (Inline) */}
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
          <Text color="#FF5555" bold> PURGE CONNECTION TO {confirmDelete.toUpperCase()}? [Y/N] </Text>
        </Box>
      )}

      <Box marginTop={1} justifyContent="space-between" paddingX={1}>
        <Text color="#484F58"> ESC:ABORT · ↑↓:NAVIGATE </Text>
        <Text color="#00E5FF" bold> {filter ? 'TYPE:FILTER' : 'TYPE_TO_SEARCH'} </Text>
      </Box>
    </Box>
  );
}
