import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '@personal-cli/shared';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  message: Message;
}

export function MessageView({ message }: Props) {
  const theme = useTheme();
  const [flicker, setFlicker] = React.useState(true);

  React.useEffect(() => {
    const timer = setInterval(() => setFlicker(v => !v), 500);
    return () => clearInterval(timer);
  }, []);

  if (message.role === 'user') {
    return (
      <Box flexDirection="column" alignItems="flex-end" marginBottom={1} paddingRight={1} width="100%">
        <Box
          borderStyle="single"
          borderColor={theme.userLabel}
          backgroundColor="#0A0A0A"
          paddingX={2}
          paddingY={0}
          flexDirection="column"
        >
          <Box marginBottom={0} justifyContent="flex-end">
            <Text color={theme.userLabel} bold>P1_READY 👾</Text>
          </Box>
          <Text color={theme.text} bold wrap="wrap">
            {message.content}
          </Text>
        </Box>
      </Box>
    );
  }

  if (message.role === 'system') {
    return (
      <Box flexDirection="column" alignItems="center" marginBottom={1} width="100%">
        <Box borderStyle="round" borderColor={theme.dim} backgroundColor="#1A1A1A" paddingX={4}>
          <Text color={theme.warning} wrap="wrap" bold>
            ⚠️ {message.content}
          </Text>
        </Box>
      </Box>
    );
  }

  // Assistant Message (JRPG Dialogue Box)
  return (
    <Box
      flexDirection="column"
      alignItems="flex-start"
      marginBottom={1}
      paddingLeft={0}
      width="100%"
    >
      <Box
        borderStyle="bold"
        borderColor={theme.assistantLabel}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={0}
        paddingBottom={0}
        backgroundColor="#0A0A0A"
        flexDirection="column"
        width="100%"
      >
        {/* Dialogue Header with Portrait */}
        <Box marginBottom={1} borderBottom borderStyle="single" borderColor={theme.dim} justifyContent="space-between">
           <Box>
                <Text bold color={theme.assistantLabel}>🤖 CPU_LINK_ESTABLISHED </Text>
                <Text color={theme.dim}> ▐ </Text>
                <Text color={theme.primary}> [A.I. MATRIX] </Text>
           </Box>
           <Box>
                <Text color={theme.primary} bold> ( •_•) </Text>
           </Box>
        </Box>

        {/* Content Area */}
        <Box paddingBottom={1}>
            <MarkdownRenderer text={message.content} />
        </Box>

        {/* Blinking Next Arrow */}
        <Box alignSelf="flex-end">
            <Text color={flicker ? theme.assistantLabel : 'transparent'} bold> ▼ </Text>
        </Box>
      </Box>
    </Box>
  );
}
