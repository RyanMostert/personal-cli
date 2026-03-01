import React, { useState, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { StatusBar } from './components/StatusBar.js';
import { MessageView } from './components/MessageView.js';
import { StreamingMessage } from './components/StreamingMessage.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { InputBox } from './components/InputBox.js';
import { ToolCallView } from './components/ToolCallView.js';
import { PermissionPrompt } from './components/PermissionPrompt.js';
import { useAgent } from './hooks/useAgent.js';
import { DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';

export function App() {
  const [inputValue, setInputValue] = useState('');
  const { messages, isStreaming, streamingText, tokensUsed, toolCalls, pendingPermission, error, activeModel, sendMessage, addSystemMessage, clearMessages, switchModel, switchMode } =
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
        clearMessages();
        setInputValue('');
        return;
      }
      if (trimmed === '/help') {
        addSystemMessage('Available commands:\n- /exit, /quit: Exit the application\n- /clear: Clear current conversation\n- /cost: Show token usage and cost\n- /model <provider> <modelId>: Switch AI model\n- /mode <ask|auto|build>: Switch agent mode\n- /help: Show this message');
        setInputValue('');
        return;
      }
      if (trimmed === '/cost') {
        addSystemMessage(`Session Cost:\n- Tokens used: ${tokensUsed}`);
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/model ')) {
        const parts = trimmed.split(' ');
        if (parts.length >= 3) {
          switchModel(parts[1], parts[2]);
          addSystemMessage(`Switched model to ${parts[1]}/${parts[2]}`);
        } else {
          addSystemMessage(`Usage: /model <provider> <modelId>`);
        }
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/mode ')) {
        const parts = trimmed.split(' ');
        if (parts.length >= 2) {
          const mode = parts[1] as 'ask' | 'auto' | 'build';
          switchMode(mode);
          addSystemMessage(`Switched mode to ${parts[1]}`);
        } else {
          addSystemMessage(`Usage: /mode <ask|auto|build>`);
        }
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/')) {
        addSystemMessage(`Unknown command: ${trimmed}. Type /help for available commands.`);
        setInputValue('');
        return;
      }

      setInputValue('');
      sendMessage(trimmed);
    },
    [isStreaming, sendMessage, exit, clearMessages, addSystemMessage, tokensUsed, switchModel, switchMode],
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
        {messages.length === 0 && !isStreaming && <WelcomeScreen />}

        {messages.map((message) => (
          <MessageView key={message.id} message={message} />
        ))}

        {toolCalls.map((tc) => (
          <ToolCallView key={tc.toolCallId} tool={tc} />
        ))}

        {isStreaming && <StreamingMessage text={streamingText} />}

        {pendingPermission && <PermissionPrompt permission={pendingPermission} />}

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
