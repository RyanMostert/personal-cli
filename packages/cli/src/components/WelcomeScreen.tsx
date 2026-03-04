import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { listConversations } from '@personal-cli/core';
import path from 'path';

const ASCII_TITLE = [
  " █████╗ ███████╗███╗   ██╗██╗██╗   ██╗███████╗",
  "██╔══██╗██╔════╝████╗  ██║██║██║   ██║██╔════╝",
  "███████║█████╗  ██╔██╗ ██║██║██║   ██║███████╗",
  "██╔══██║██╔══╝  ██║╚██╗██║██║██║   ██║╚════██║",
  "██║  ██║███████╗██║ ╚████║██║╚██████╔╝███████║",
  "╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚══════╝"
];

const TITLE_COLORS = ['#00E5FF', '#FF00AA', '#AA00FF', '#3FB950', '#FFB86C', '#00E5FF'];

function formatTimeAgo(date: number): string {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return `${seconds}S_AGO`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}M_AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H_AGO`;
  return `${Math.floor(hours / 24)}D_AGO`;
}

export function WelcomeScreen({ tick = 0 }: { tick?: number }) {
  const stats = useMemo(() => {
    const convos = listConversations();
    const lastConvo = convos[0];
    const project = path.basename(process.cwd()).toUpperCase();
    return [
      { label: 'TOTAL_SESSIONS', value: convos.length.toString().padStart(7, '0') },
      { label: 'PROJECT_NODE',   value: project.slice(0, 15) },
      { label: 'LAST_ACTIVITY',  value: lastConvo ? formatTimeAgo(lastConvo.date) : 'NEVER' },
    ];
  }, []);

  // Cycle title colors on each tick
  const colorOffset = tick % TITLE_COLORS.length;

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      {ASCII_TITLE.map((line, i) => (
        <Text key={i} bold color={TITLE_COLORS[(i + colorOffset) % TITLE_COLORS.length]}>
          {line}
        </Text>
      ))}

      <Box marginTop={2} flexDirection="column" alignItems="center" borderStyle="double" borderColor="#484F58" paddingX={4} paddingY={1}>
        <Text color="#00E5FF" bold> --- SYSTEM STATS --- </Text>
        {stats.map(s => (
          <Box key={s.label} width={35} justifyContent="space-between">
            <Text color="#FF00AA">{s.label.padEnd(16)}</Text>
            <Text color="white">❯❯</Text>
            <Text color="#3FB950">{s.value.padStart(12)}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={2} paddingX={4}>
        <Text color="#FF00AA" bold>► INSERT COIN TO CONTINUE ◄</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="#484F58"> [ Type a command to start | /help for manual ] </Text>
      </Box>
    </Box>
  );
}
