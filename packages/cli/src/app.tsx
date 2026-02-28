import React, { useState, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { StatusBar } from './components/StatusBar.js';
import { MessageView } from './components/MessageView.js';
import { StreamingMessage } from './components/StreamingMessage.js';
import { InputBox } from './components/InputBox.js';
import { useAgent } from './hooks/useAgent.js';
import { DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';

export function App() {
  const [inputValue, setInputValue] = useState('');
  const { messages, isStreaming, streamingText, tokensUsed, error, activeModel, sendMessage } =
    useAgent();
  const { exit } = useApp();

  // Ctrl+C / Ctrl+D to exit
  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || (key.ctrl && input === 'd')) {
      exit();
    }
  });

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isStreaming) return;

      // Handle slash commands
      if (trimmed === '/exit' || trimmed === '/quit') {
        exit();
        return;
      }
      if (trimmed === '/clear') {
        setInputValue('');
        return;
      }

      setInputValue('');
      sendMessage(trimmed);
    },
    [isStreaming, sendMessage, exit],
  );

  return (
    <Box flexDirection="column" minHeight={10}>
      {/* Status bar */}
      <StatusBar
        provider={activeModel.provider}
        modelId={activeModel.modelId}
        tokensUsed={tokensUsed}
        tokenBudget={DEFAULT_TOKEN_BUDGET}
        isStreaming={isStreaming}
      />

      {/* Conversation */}
      <Box flexDirection="column" paddingX={1} paddingY={1} flexGrow={1}>
        {messages.length === 0 && !isStreaming && (
          <Box flexDirection="column" alignItems="center" paddingY={2}>
            <Text bold color="#58A6FF">
              personal-cli
            </Text>
            <Text color="#484F58">Type a message to get started. /exit to quit.</Text>
          </Box>
        )}

        {messages.map((message) => (
          <MessageView key={message.id} message={message} />
        ))}

        {isStreaming && <StreamingMessage text={streamingText} />}

        {error && (
          <Box marginBottom={1}>
            <Text color="#F85149">Error: {error}</Text>
          </Box>
        )}
      </Box>

      {/* Input */}
      <InputBox
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        isDisabled={isStreaming}
      />
    </Box>
  );
}
