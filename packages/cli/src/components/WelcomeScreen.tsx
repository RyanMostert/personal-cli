import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { listConversations } from '@personal-cli/core';
import path from 'path';

const ASCII_TITLE = [
  '   _   ___  ___   _   ___  ___ ',
  '  /_\\ | _ \\/ __| /_\\ |   \\| __|',
  ' / _ \\|   / (__ / _ \\| |) | _| ',
  '/_/ \\_\\_|_\\\\___/_/ \\_\\___/|___|',
];

const TITLE_COLORS = ['#00E5FF', '#FF00AA', '#AA00FF'];

function formatTimeAgo(date: number): string {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function WelcomeScreen({ tick = 0 }: { tick?: number }) {
  const stats = useMemo(() => {
    const convos = listConversations();
    const lastConvo = convos[0];
    const project = path.basename(process.cwd()).toLowerCase();
    return [
      { label: 'SESSIONS', value: convos.length.toString() },
      { label: 'PROJECT', value: project },
      { label: 'LAST', value: lastConvo ? formatTimeAgo(lastConvo.date) : 'none' },
    ];
  }, []);

  const colorOffset = Math.floor(tick / 2) % TITLE_COLORS.length;

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        {ASCII_TITLE.map((line, i) => (
          <Text key={i} bold color={TITLE_COLORS[(i + colorOffset) % TITLE_COLORS.length]}>
            {line}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="row" paddingX={2}>
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <Text color="#484F58"> │ </Text>}
            <Text color="#484F58">{s.label}: </Text>
            <Text color="#3FB950" bold>
              {s.value}
            </Text>
          </React.Fragment>
        ))}
      </Box>

      <Box marginTop={2}>
        <Text color="#FF00AA" bold>
          {tick % 2 === 0 ? '► INSERT COIN ◄' : '  INSERT COIN  '}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="#484F58">type /help for manual</Text>
      </Box>
    </Box>
  );
}
