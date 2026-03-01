import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '@personal-cli/shared';
import { MarkdownRenderer } from './MarkdownRenderer.js';

interface Props {
  message: Message;
}

export function MessageView({ message }: Props) {
  if (message.role === 'user') {
    return (
      <Box flexDirection="column" alignItems="flex-end" marginBottom={1} paddingRight={1} width="100%">
        <Box 
          backgroundColor="#00E5FF" 
          paddingX={2} 
          paddingY={1}
          flexDirection="row"
        >
          <Text color="black" bold>{'> '}</Text>
          <Text color="black" bold wrap="wrap">
            {message.content}
          </Text>
        </Box>
      </Box>
    );
  }

  if (message.role === 'system') {
    return (
      <Box flexDirection="column" alignItems="center" marginBottom={1} width="100%">
        <Box backgroundColor="#1A1A1A" paddingX={4}>
          <Text color="#555555" wrap="wrap" bold dimColor>
            -- {message.content} --
          </Text>
        </Box>
      </Box>
    );
  }

  // Assistant Message
  return (
    <Box 
      flexDirection="column" 
      alignItems="flex-start" 
      marginBottom={1} 
      paddingLeft={0} 
      width="100%"
    >
      <Box 
        borderLeft
        borderStyle="single"
        borderColor="#FF00AA"
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        backgroundColor="#0A0A0A"
        flexDirection="column"
        width="100%"
      >
        <Box marginBottom={1}>
           <Text bold color="#FF00AA">⚡ [AGENT RESPONSE]</Text>
        </Box>
        <MarkdownRenderer text={message.content} />
      </Box>
    </Box>
  );
}
