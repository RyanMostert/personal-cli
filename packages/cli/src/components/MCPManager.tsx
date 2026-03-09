import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  MCPClientStatus,
  type MCPServerInfo,
  type MCPServerConfig,
} from '@personal-cli/mcp-client';

interface Props {
  servers: MCPServerInfo[];
  onAdd: () => void;
  onAddZenGateway: () => void;
  onEdit: (name: string) => void;
  onRemove: (name: string) => void;
  onConnect: (name: string, config: MCPServerConfig) => void;
  onDisconnect: (name: string) => void;
  onClose: () => void;
  tick?: number;
}

const VISIBLE_HEIGHT = 14;

const STATUS_ICONS = {
  connected: '🟢',
  connecting: '🟡',
  disconnected: '🔴',
  error: '❌',
};

const STATUS_COLORS = {
  connected: '#3FB950',
  connecting: '#D29922',
  disconnected: '#F85149',
  error: '#FF5555',
};

export function MCPManager({
  servers,
  onAdd,
  onAddZenGateway,
  onEdit,
  onRemove,
  onConnect,
  onDisconnect,
  onClose,
  tick = 0,
}: Props) {
  const [filter, setFilter] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, MCPServerConfig>>({});

  // Load configs on mount
  useEffect(() => {
    import('@personal-cli/core').then(({ loadMCPConfig }) => {
      setConfigs(loadMCPConfig());
    });
  }, []);

  const filtered = useMemo(() => {
    const query = filter.toLowerCase();

    const connected = servers.filter(
      (s) =>
        s.status === 'connected' &&
        (s.name.toLowerCase().includes(query) ||
          s.tools.some((t) => t.name.toLowerCase().includes(query))),
    );

    const disconnected = servers.filter(
      (s) => s.status !== 'connected' && s.name.toLowerCase().includes(query),
    );

    // Add configured but not loaded servers
    const configuredNames = new Set(servers.map((s) => s.name));
    Object.entries(configs).forEach(([name, config]) => {
      if (!configuredNames.has(name) && name.toLowerCase().includes(query)) {
        disconnected.push({
          name,
          version: 'unknown',
          tools: [],
          status: MCPClientStatus.DISCONNECTED,
        });
      }
    });

    return { connected, disconnected, total: connected.length + disconnected.length };
  }, [filter, servers, configs]);

  useEffect(() => {
    setFocusIndex(0);
  }, [filter]);

  const allList = [...filtered.connected, ...filtered.disconnected];

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

    if (input === 'z' && !key.ctrl && !key.meta) {
      onAddZenGateway();
      return;
    }

    if (key.return) {
      const s = allList[focusIndex];
      if (s) {
        if (s.status === 'connected') {
          onDisconnect(s.name);
        } else {
          const config = configs[s.name];
          if (config) {
            onConnect(s.name, config);
          }
        }
      }
      return;
    }

    if (input === 'e' && !key.ctrl && !key.meta) {
      const s = allList[focusIndex];
      if (s) {
        onEdit(s.name);
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (filter.length > 0) {
        setFilter((f) => f.slice(0, -1));
      } else {
        const s = allList[focusIndex];
        if (s) {
          setConfirmDelete(s.name);
        }
      }
      return;
    }

    if (key.upArrow) {
      setFocusIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setFocusIndex((i) => Math.min(allList.length - 1, i + 1));
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
        <Text color="#00E5FF" bold>
          {' '}
          NEURAL_LINK:MCP_SERVERS{' '}
        </Text>
      </Box>

      {/* Filter bar */}
      <Box marginBottom={1} paddingX={1} borderStyle="round" borderColor="#484F58">
        <Text color="#FF00AA" bold>
          ❯{' '}
        </Text>
        <Text color="#00E5FF" bold>
          SCAN_NETWORK:{' '}
        </Text>
        <Text color="white" bold>
          {filter}
        </Text>
        <Text color="#00E5FF">{tick % 2 === 0 ? '▌' : ' '}</Text>
      </Box>

      {/* Stats */}
      <Box marginBottom={1} paddingX={1}>
        <Text color="#484F58">ACTIVE_NODES: </Text>
        <Text color="#3FB950" bold>
          {filtered.connected.length}{' '}
        </Text>
        <Text color="#484F58">│ OFFLINE: </Text>
        <Text color="#F85149" bold>
          {filtered.disconnected.length}{' '}
        </Text>
        <Text color="#484F58">│ TOTAL_TOOLS: </Text>
        <Text color="#00E5FF" bold>
          {filtered.connected.reduce((sum, s) => sum + s.tools.length, 0)}
        </Text>
      </Box>

      {/* Scroll indicator top */}
      <Box height={1} alignItems="center" justifyContent="center">
        {hiddenAbove > 0 ? (
          <Text color="#FF00AA"> ▲ {hiddenAbove} above ▲ </Text>
        ) : (
          <Text color="#484F58"> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ </Text>
        )}
      </Box>

      {allList.length === 0 && (
        <Box paddingY={2} alignItems="center">
          <Text color="#FF5555" bold>
            {' '}
            [!] NO_MCP_NODES_DETECTED{' '}
          </Text>
          <Text color="#484F58"> Press 'a' to add a new MCP server </Text>
        </Box>
      )}

      {/* Rows */}
      <Box flexDirection="column">
        {filtered.connected.length > 0 && (
          <Box marginTop={1} marginBottom={1}>
            <Text color="#3FB950" bold>
              ▼ CONNECTED ─── {filtered.connected.length} nodes
            </Text>
          </Box>
        )}

        {visibleItems
          .filter((s) => s.status === 'connected')
          .map((s, i) => {
            const realIdx = scrollTop + i;
            const focused = realIdx === focusIndex;

            return (
              <Box key={s.name} paddingLeft={2} backgroundColor={focused ? '#161b22' : undefined}>
                <Text color={focused ? '#FF00AA' : '#484F58'}>{focused ? '❯❯ ' : '   '}</Text>

                <Box flexDirection="row" justifyContent="space-between" flexGrow={1}>
                  <Box>
                    <Text color={STATUS_COLORS[s.status]}>{STATUS_ICONS[s.status]} </Text>
                    <Text color={focused ? 'white' : '#8C959F'} bold={focused}>
                      {s.name.toUpperCase()}
                    </Text>
                    <Text color="#484F58"> [{s.tools.length} tools] </Text>
                    <Text color="#AA00FF">v{s.version}</Text>
                  </Box>

                  <Box>
                    <Text color={focused ? '#F85149' : '#484F58'}> [E:EDIT] </Text>
                    <Text color={focused ? '#FF5555' : '#484F58'}> [BACKSPACE:DISCONNECT] </Text>
                  </Box>
                </Box>
              </Box>
            );
          })}

        {filtered.disconnected.length > 0 && (
          <Box marginTop={1} marginBottom={1}>
            <Text color="#F85149" bold>
              ▼ DISCONNECTED ─── {filtered.disconnected.length} nodes
            </Text>
          </Box>
        )}

        {visibleItems
          .filter((s) => s.status !== 'connected')
          .map((s, i) => {
            const realIdx = scrollTop + i;
            const focused = realIdx === focusIndex;

            return (
              <Box key={s.name} paddingLeft={2} backgroundColor={focused ? '#161b22' : undefined}>
                <Text color={focused ? '#FF00AA' : '#484F58'}>{focused ? '❯❯ ' : '   '}</Text>

                <Box flexDirection="row" justifyContent="space-between" flexGrow={1}>
                  <Box>
                    <Text color={STATUS_COLORS[s.status]}>{STATUS_ICONS[s.status]} </Text>
                    <Text color={focused ? 'white' : '#8C959F'} bold={focused}>
                      {s.name.toUpperCase()}
                    </Text>
                    {configs[s.name] ? (
                      <Text color="#484F58"> [configured] </Text>
                    ) : (
                      <Text color="#FF5555"> [no config] </Text>
                    )}
                  </Box>

                  <Box>
                    <Text color={focused ? '#00E5FF' : '#484F58'}> [E:EDIT] </Text>
                    {configs[s.name] ? (
                      <Text color={focused ? '#3FB950' : '#484F58'}> [ENTER:CONNECT] </Text>
                    ) : (
                      <Text color={focused ? '#D29922' : '#484F58'}> [E:CONFIGURE] </Text>
                    )}
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
            PURGE MCP NODE {confirmDelete.toUpperCase()}? [Y/N]{' '}
          </Text>
        </Box>
      )}

      <Box marginTop={1} justifyContent="space-between" paddingX={1}>
        <Text color="#484F58"> ESC:ABORT │ A:ADD │ Z:ZEN GATEWAY │ ↑↓:NAVIGATE </Text>
        <Text color="#00E5FF" bold>
          {' '}
          E:EDIT │ ENTER:CONNECT/EDIT{' '}
        </Text>
      </Box>
    </Box>
  );
}
