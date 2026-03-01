import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '@personal-cli/shared';
import { MarkdownRenderer } from './MarkdownRenderer.js';

interface Props {
  message: Message;
}

export function MessageView({ message }: Props) {
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
          borderColor="#00E5FF" 
          backgroundColor="#0A0A0A" 
          paddingX={2} 
          paddingY={0}
          flexDirection="column"
        >
          <Box marginBottom={0} justifyContent="flex-end">
            <Text color="#00E5FF" bold>P1_READY 👾</Text>
          </Box>
          <Text color="white" bold wrap="wrap">
            {message.content}
          </Text>
        </Box>
      </Box>
    );
  }

  if (message.role === 'system') {
    return (
      <Box flexDirection="column" alignItems="center" marginBottom={1} width="100%">
        <Box borderStyle="round" borderColor="#484F58" backgroundColor="#1A1A1A" paddingX={4}>
          <Text color="#FFB86C" wrap="wrap" bold>
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
        borderColor="#FF00AA"
        paddingLeft={2}
        paddingRight={2}
        paddingTop={0}
        paddingBottom={0}
        backgroundColor="#0A0A0A"
        flexDirection="column"
        width="100%"
      >
        {/* Dialogue Header with Portrait */}
        <Box marginBottom={1} borderBottom borderStyle="single" borderColor="#484F58" justifyContent="space-between">
           <Box>
                <Text bold color="#FF00AA">🤖 CPU_LINK_ESTABLISHED </Text>
                <Text color="#484F58"> ▐ </Text>
                <Text color="#00E5FF"> [A.I. MATRIX] </Text>
           </Box>
           <Box>
                <Text color="#00E5FF" bold> ( •_•) </Text>
           </Box>
        </Box>

        {/* Content Area */}
        <Box paddingBottom={1}>
            <MarkdownRenderer text={message.content} />
        </Box>

        {/* Blinking Next Arrow */}
        <Box alignSelf="flex-end">
            <Text color={flicker ? "#FF00AA" : "transparent"} bold> ▼ </Text>
        </Box>
      </Box>
    </Box>
  );
}
