import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { StatusBar } from './components/StatusBar.js';
import { MessageView } from './components/MessageView.js';
import { StreamingMessage } from './components/StreamingMessage.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { InputBox } from './components/InputBox.js';
import { ToolCallView } from './components/ToolCallView.js';
import { PermissionPrompt } from './components/PermissionPrompt.js';
import { ModelPicker } from './components/ModelPicker.js';
import { ProviderWizard } from './components/ProviderWizard.js';
import { HistoryPicker } from './components/HistoryPicker.js';
import { useAgent } from './hooks/useAgent.js';
import { DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';
import { setProviderKey, removeProviderKey, readAuth } from '@personal-cli/core';

const MAX_VISIBLE_MESSAGES = 20;

export function App() {
  const [inputValue, setInputValue] = useState('');
  const [pendingProviderAdd, setPendingProviderAdd] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const { messages, isStreaming, streamingText, tokensUsed, cost, toolCalls, pendingPermission, error, activeModel, attachedFiles, sendMessage, addSystemMessage, clearMessages, switchModel, switchMode, isPickingModel, openModelPicker, closeModelPicker, attachFile, clearAttachments, loadHistory } =
    useAgent();
  const { exit } = useApp();

  // Reset to bottom when new messages arrive
  useEffect(() => {
    setScrollOffset(0);
  }, [messages.length]);

  // Ctrl+C / Ctrl+D to exit; Page Up/Down to scroll message history
  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || (key.ctrl && input === 'd')) {
      exit();
      return;
    }
    if (!isPickingModel && !showHistory && !pendingProviderAdd) {
      if (key.pageUp)   setScrollOffset(o => Math.min(o + 5, Math.max(0, messages.length - MAX_VISIBLE_MESSAGES)));
      if (key.pageDown) setScrollOffset(o => Math.max(0, o - 5));
    }
  });

  const handleSubmit = useCallback(
    async (value: string) => {
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
        addSystemMessage('Available commands:\n- /exit, /quit: Exit the application\n- /clear: Clear current conversation\n- /cost: Show token usage and cost\n- /model [provider/modelId]: Switch AI model (opens picker if no args)\n- /mode <ask|auto|build>: Switch agent mode\n- /provider add <name>: Save API key for provider\n- /provider list: Show configured providers\n- /provider remove <name>: Remove provider key\n- /add <filepath>: Attach file contents as context\n- /add --clear, /detach: Remove all attached context files\n- /history: Open conversation history picker\n- /help: Show this message');
        setInputValue('');
        return;
      }
      if (trimmed === '/cost') {
        const costStr = cost > 0 ? `$${cost.toFixed(4)}` : 'unknown (free or unregistered model)';
        addSystemMessage(`Session Cost:\n- Tokens used: ${tokensUsed.toLocaleString()}\n- Estimated cost: ${costStr}`);
        setInputValue('');
        return;
      }
      if (trimmed === '/model') {
        openModelPicker();
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/model ')) {
        const rest = trimmed.slice(7).trim();
        // Support both "provider/modelId" and "provider modelId"
        const parts = rest.includes('/') ? rest.split('/') : rest.split(' ');
        if (parts.length >= 2) {
          switchModel(parts[0], parts.slice(1).join('/'));
          addSystemMessage(`Switched to ${parts[0]}/${parts.slice(1).join('/')}`);
        } else {
          addSystemMessage('Usage: /model <provider/modelId> or type /model to browse');
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
      if (trimmed === '/provider' || trimmed === '/provider add') {
        addSystemMessage(
          'Usage:\n' +
          '  /provider add <name>     Save API key for a provider\n' +
          '  /provider list           Show configured providers\n' +
          '  /provider remove <name>  Remove a provider key\n\n' +
          'Available providers:\n' +
          '  opencode-zen  anthropic  openai  google  mistral  ollama'
        );
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/provider add ')) {
        const name = trimmed.slice(14).trim();
        setPendingProviderAdd(name);
        setInputValue('');
        return;
      }
      if (trimmed === '/provider list') {
        const auth = readAuth();
        const lines = Object.entries(auth).map(([p, v]) => `  ${p}: ${'•'.repeat(Math.min(8, v.key.length))}...`);
        addSystemMessage(lines.length ? `Configured providers:\n${lines.join('\n')}` : 'No providers configured in auth.json.');
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/provider remove ')) {
        const name = trimmed.slice(17).trim();
        removeProviderKey(name);
        addSystemMessage(`Removed key for ${name}.`);
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/add ')) {
        const filePath = trimmed.slice(5).trim();
        const ok = await attachFile(filePath);
        addSystemMessage(ok ? `Attached: ${filePath}` : `Error: could not read ${filePath}`);
        setInputValue('');
        return;
      }
      if (trimmed === '/add --clear' || trimmed === '/detach') {
        clearAttachments();
        addSystemMessage('Cleared all attached files.');
        setInputValue('');
        return;
      }
      if (trimmed === '/history') {
        setShowHistory(true);
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
    [isStreaming, sendMessage, exit, clearMessages, addSystemMessage, tokensUsed, cost, switchModel, switchMode, openModelPicker, pendingProviderAdd, showHistory, loadHistory, attachFile, clearAttachments, attachedFiles],
  );

  // Compute the visible slice of messages
  const totalMessages = messages.length;
  const windowStart = Math.max(0, totalMessages - MAX_VISIBLE_MESSAGES - scrollOffset);
  const windowEnd   = Math.max(0, totalMessages - scrollOffset);
  const visibleMessages = messages.slice(windowStart, windowEnd);
  const hiddenAbove = windowStart;
  const hiddenBelow = totalMessages - windowEnd;

  return (
    <Box flexDirection="column">
      {/* Status bar */}
      <StatusBar
        provider={activeModel.provider}
        modelId={activeModel.modelId}
        tokensUsed={tokensUsed}
        tokenBudget={DEFAULT_TOKEN_BUDGET}
        isStreaming={isStreaming}
        attachedCount={attachedFiles.length}
      />

      {/* Message window */}
      <Box flexDirection="column" paddingX={1}>
        {hiddenAbove > 0 && (
          <Text color="#484F58">↑ {hiddenAbove} message{hiddenAbove !== 1 ? 's' : ''} above — PgUp to scroll</Text>
        )}

        {visibleMessages.length === 0 && !isStreaming && <WelcomeScreen />}

        {visibleMessages.map((message) => (
          <MessageView key={message.id} message={message} />
        ))}

        {hiddenBelow > 0 && (
          <Text color="#484F58">↓ {hiddenBelow} message{hiddenBelow !== 1 ? 's' : ''} below — PgDn to scroll</Text>
        )}

        {toolCalls.map((tc) => (
          <ToolCallView key={tc.toolCallId} tool={tc} />
        ))}

        {isStreaming && <StreamingMessage text={streamingText} />}

        {pendingPermission && <PermissionPrompt permission={pendingPermission} />}

        {error && (
          <Box marginBottom={1} flexDirection="column">
            <Text color="#F85149">Error: {error}</Text>
            {/rate limit|429|FreeUsageLimit/i.test(error) && (
              <Text color="#8C959F">
                {'Tip: Switch model — /model opencode-zen minimax-m2.5-free'}
              </Text>
            )}
          </Box>
        )}

        {isPickingModel && (
          <ModelPicker
            onSelect={(provider, modelId) => {
              switchModel(provider, modelId);
              closeModelPicker();
              addSystemMessage(`Switched to ${provider}/${modelId}`);
            }}
            onClose={closeModelPicker}
          />
        )}

        {pendingProviderAdd && (
          <ProviderWizard
            providerName={pendingProviderAdd}
            onSave={(key) => {
              setProviderKey(pendingProviderAdd, key);
              addSystemMessage(`Saved API key for ${pendingProviderAdd}.`);
              setPendingProviderAdd(null);
            }}
            onClose={() => setPendingProviderAdd(null)}
          />
        )}

        {showHistory && (
          <HistoryPicker
            onSelect={(id) => {
              loadHistory(id);
              setShowHistory(false);
              addSystemMessage('Conversation loaded.');
            }}
            onClose={() => setShowHistory(false)}
          />
        )}
      </Box>

      {/* Input */}
      <InputBox
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        isDisabled={isStreaming || isPickingModel || !!pendingProviderAdd || showHistory}
      />
    </Box>
  );
}
