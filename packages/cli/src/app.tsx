import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { StatusBar } from './components/StatusBar.js';
import { MessageView } from './components/MessageView.js';
import { StreamingMessage } from './components/StreamingMessage.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { GameOverScreen } from './components/GameOverScreen.js';
import { InputBox } from './components/InputBox.js';
import { ToolCallView } from './components/ToolCallView.js';
import { PermissionPrompt } from './components/PermissionPrompt.js';
import { ModelPicker } from './components/ModelPicker.js';
import { ProviderManager } from './components/ProviderManager.js';
import { ProviderWizard } from './components/ProviderWizard.js';
import { HistoryPicker } from './components/HistoryPicker.js';
import { CommandAutocomplete, filterCommands } from './components/CommandAutocomplete.js';
import { FileAutocomplete } from './components/FileAutocomplete.js';
import { SidePanel } from './components/SidePanel.js';
import { useAgent } from './hooks/useAgent.js';
import { useOverlay } from './context/OverlayContext.js';
import { dispatch } from './commands/registry.js';
import type { CommandContext } from './types/commands.js';
import { matchKeybinding } from './keybindings/registry.js';
import { DEFAULT_TOKEN_BUDGET, type ProviderName } from '@personal-cli/shared';
import {
  setProviderKey, removeProviderKey, readAuth,
  appendHistory, loadHistory as loadPromptHistory,
  exportConversation, recordAccess,
} from '@personal-cli/core';
import { promises as fs } from 'fs';

const MAX_VISIBLE_MESSAGES = 20;

export function App() {
  const [inputValue, setInputValue] = useState('');
  const { overlay, open, close } = useOverlay();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedDraft, setSavedDraft] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [sidePanel, setSidePanel] = useState<{
    type: 'file' | 'diff';
    path: string;
    content?: string;
    oldText?: string;
    newText?: string;
  } | null>(null);
  const [sidePanelScroll, setSidePanelScroll] = useState(0);

  // Command autocomplete — controlled here to prevent Enter conflict with ink-text-input
  const [cmdSelectedIdx, setCmdSelectedIdx] = useState(0);

  // File autocomplete — controlled here to prevent Tab/Enter conflict
  const [fileAutoFiles, setFileAutoFiles] = useState<string[]>([]);
  const [fileAutoSelectedIdx, setFileAutoSelectedIdx] = useState(0);

  const {
    messages, isStreaming, streamingText, tokensUsed, cost, toolCalls,
    pendingPermission, error, activeModel, attachedFiles, mode,
    sendMessage, abort, addSystemMessage, clearMessages, switchModel, switchMode,
    isPickingModel, openModelPicker, closeModelPicker,
    attachFile, clearAttachments, loadHistory,
  } = useAgent();
  const { exit } = useApp();

  // Derived overlay states for backward compatibility
  const isPickingProvider = overlay.type === 'provider-manager';
  const pendingProviderAdd = overlay.type === 'provider-wizard' ? (overlay.props?.providerId as string) : null;
  const showHistory = overlay.type === 'history';

  useEffect(() => { setInputHistory(loadPromptHistory()); }, []);
  useEffect(() => { setScrollOffset(0); }, [messages.length]);
  useEffect(() => { setSidePanelScroll(0); }, [sidePanel?.path]);

  // ── Open file in side panel ──────────────────────────────────────────────
  const openFileInPanel = useCallback(async (fp: string) => {
    try {
      const content = await fs.readFile(fp, 'utf-8');
      recordAccess(fp);
      setSidePanel({ type: 'file', path: fp, content });
    } catch {
      addSystemMessage(`Error: could not open ${fp}`);
    }
  }, [addSystemMessage]);

  // ── Autocomplete visibility ──────────────────────────────────────────────
  const showCommandAutocomplete =
    inputValue.startsWith('/') && !inputValue.includes(' ') &&
    !isPickingModel && !isPickingProvider && !showHistory &&
    !pendingProviderAdd && !isStreaming;

  const fileMatch = inputValue.match(/(@|\/add\s|\/open\s)([^\s]*)$/);
  const showFileAutocomplete =
    !!fileMatch && !isPickingModel && !isPickingProvider &&
    !showHistory && !pendingProviderAdd && !isStreaming;
  const fileTrigger = fileMatch?.[1] ?? '';
  const fileQuery = fileMatch?.[2] ?? '';

  // Derived filtered command list — shared between display and key handler
  const cmdFiltered = showCommandAutocomplete ? filterCommands(inputValue) : [];

  // Reset selection when filter changes
  useEffect(() => { setCmdSelectedIdx(0); }, [inputValue]);

  // Capture edit_file tool calls to show diff in side panel
  useEffect(() => {
    const lastEdit = toolCalls.find(tc => tc.toolName === 'edit_file' && tc.result && !tc.error);
    if (lastEdit && lastEdit.args) {
      const args = lastEdit.args as any;
      setSidePanel({
        type: 'diff',
        path: args.path,
        oldText: args.oldText,
        newText: args.newText
      });
    }
  }, [toolCalls]);

  // All overlays disable the InputBox so ink-text-input never sees Tab/Enter/arrows
  const anyOverlay =
    isPickingModel || isPickingProvider ||
    !!pendingProviderAdd || showHistory ||
    showCommandAutocomplete || showFileAutocomplete;

  // ── Global key handler ───────────────────────────────────────────────────
  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || (key.ctrl && input === 'd')) { setIsGameOver(true); return; }

    if (key.escape && isStreaming) {
      abort();
      return;
    }

    if (key.escape && sidePanel) {
      setSidePanel(null);
      return;
    }

    // ── Side panel scroll ────────────────────────────────────────────────
    if (sidePanel && !showFileAutocomplete && !showCommandAutocomplete) {
      if (key.upArrow) { setSidePanelScroll(s => Math.max(0, s - 1)); return; }
      if (key.downArrow) { setSidePanelScroll(s => s + 1); return; }
      if (key.pageUp) { setSidePanelScroll(s => Math.max(0, s - 10)); return; }
      if (key.pageDown) { setSidePanelScroll(s => s + 10); return; }
    }

    // ── File autocomplete ────────────────────────────────────────────────
    if (showFileAutocomplete) {
      if (key.escape) {
        // If it was @, clear it. If it was /command, just hide picker
        if (fileTrigger === '@') setInputValue(v => v.replace(/@[^\s]*$/, ''));
        setFileAutoSelectedIdx(0);
        return;
      }
      if (key.upArrow) { setFileAutoSelectedIdx(i => Math.max(0, i - 1)); return; }
      if (key.downArrow) { setFileAutoSelectedIdx(i => Math.min(fileAutoFiles.length - 1, i + 1)); return; }
      if (key.return || key.tab) {
        const sel = fileAutoFiles[fileAutoSelectedIdx];
        if (sel) {
          recordAccess(sel);
          if (fileTrigger === '@') {
            setInputValue(v => v.replace(/@[^\s]*$/, ''));
            attachFile(sel).then(ok =>
              addSystemMessage(ok ? `Attached: ${sel}` : `Error: could not read ${sel}`)
            );
          } else if (fileTrigger.trimEnd() === '/open') {
            // Immediately open the file and clear input
            setInputValue('');
            openFileInPanel(sel);
          } else if (fileTrigger.trimEnd() === '/add') {
            // Immediately attach the file and clear input
            setInputValue('');
            attachFile(sel).then(ok =>
              addSystemMessage(ok ? `Attached: ${sel}` : `Error: could not read ${sel}`)
            );
          } else {
            setInputValue(v => v.replace(/([^\s]*)$/, sel));
          }
          setFileAutoSelectedIdx(0);
        }
        return;
      }
      if ((key.backspace || key.delete) && inputValue.length > 0) {
        setInputValue(v => v.slice(0, -1)); setFileAutoSelectedIdx(0); return;
      }
      if (input && !key.ctrl && !key.meta) { setInputValue(v => v + input); setFileAutoSelectedIdx(0); return; }
      return;
    }

    // ── Command autocomplete ─────────────────────────────────────────────
    if (showCommandAutocomplete) {
      if (key.escape) { setInputValue(''); return; }
      if (key.upArrow) {
        setCmdSelectedIdx(i => (i > 0 ? i - 1 : Math.max(0, cmdFiltered.length - 1)));
        return;
      }
      if (key.downArrow) {
        setCmdSelectedIdx(i => (i < cmdFiltered.length - 1 ? i + 1 : 0));
        return;
      }
      if (key.return || key.tab) {
        const sel = cmdFiltered[cmdSelectedIdx];
        if (sel) setInputValue(sel.cmd + ' ');
        return;
      }
      if ((key.backspace || key.delete) && inputValue.length > 0) {
        setInputValue(v => v.slice(0, -1)); return;
      }
      if (input && !key.ctrl && !key.meta) { setInputValue(v => v + input); return; }
      return;
    }

    // ── Normal mode ──────────────────────────────────────────────────────
    if (!isPickingModel && !isPickingProvider && !showHistory && !pendingProviderAdd && !isStreaming) {
      if (key.return && key.shift) { setInputValue(v => v + '\n'); return; }
      if (key.ctrl && input === 'u') { setInputValue(''); return; }
      if (key.ctrl && input === 'w') { setInputValue(v => v.replace(/\S+\s*$/, '')); return; }
      if (key.ctrl && input === 'm') { openModelPicker(); return; }
      if (key.upArrow && inputHistory.length > 0 && !inputValue.includes('\n')) {
        if (historyIndex === -1) setSavedDraft(inputValue);
        const next = historyIndex + 1;
        if (next < inputHistory.length) { setHistoryIndex(next); setInputValue(inputHistory[next]); }
        return;
      }
      if (key.downArrow && historyIndex !== -1 && !inputValue.includes('\n')) {
        const next = historyIndex - 1;
        if (next >= 0) { setHistoryIndex(next); setInputValue(inputHistory[next]); }
        else { setHistoryIndex(-1); setInputValue(savedDraft); }
        return;
      }
      if (key.pageUp) setScrollOffset(o => Math.min(o + 5, Math.max(0, messages.length - MAX_VISIBLE_MESSAGES)));
      if (key.pageDown) setScrollOffset(o => Math.max(0, o - 5));
    }
  });

  // ── Submit (only reached when no autocomplete is active) ─────────────────
  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || showCommandAutocomplete || showFileAutocomplete) return;

    if (trimmed === '/exit' || trimmed === '/quit') { setIsGameOver(true); return; }
    if (trimmed === '/clear') { clearMessages(); setInputValue(''); return; }
    if (trimmed === '/help') {
      addSystemMessage('Commands: /model /mode /provider /add /history /compact /copy /export /rename /theme /cost /clear /help /exit\nType / and use ↑↓ to browse with autocomplete.');
      setInputValue(''); return;
    }
    if (trimmed === '/cost') {
      const costStr = cost > 0 ? `$${cost.toFixed(4)}` : 'unknown (free or unregistered model)';
      addSystemMessage(`Tokens: ${tokensUsed.toLocaleString()}  Cost: ${costStr}`);
      setInputValue(''); return;
    }
    if (trimmed === '/model') { openModelPicker(); setInputValue(''); return; }
    if (trimmed.startsWith('/model ')) {
      const rest = trimmed.slice(7).trim();
      const parts = rest.includes('/') ? rest.split('/') : rest.split(' ');
      if (parts.length >= 2) {
        switchModel(parts[0] as ProviderName, parts.slice(1).join('/'));
        addSystemMessage(`Switched to ${parts[0]}/${parts.slice(1).join('/')}`);
      } else {
        addSystemMessage('Usage: /model <provider/modelId>  or  /model to browse');
      }
      setInputValue(''); return;
    }
    if (trimmed.startsWith('/mode ')) {
      const mode = trimmed.split(' ')[1] as 'ask' | 'auto' | 'build';
      switchMode(mode); addSystemMessage(`Mode: ${mode}`); setInputValue(''); return;
    }
    if (trimmed === '/open') {
      addSystemMessage('Usage: /open <path>  — or type /open and use ↑↓ to pick a file');
      setInputValue(''); return;
    }
    if (trimmed.startsWith('/open ')) {
      const fp = trimmed.slice(6).trim();
      await openFileInPanel(fp);
      setInputValue(''); return;
    }
    if (trimmed.startsWith('/provider')) { open('provider-manager'); setInputValue(''); return; }
    if (trimmed.startsWith('/add ')) {
      const fp = trimmed.slice(5).trim();
      const ok = await attachFile(fp);
      addSystemMessage(ok ? `Attached: ${fp}` : `Error: could not read ${fp}`);
      setInputValue(''); return;
    }
    if (trimmed === '/add --clear' || trimmed === '/detach') {
      clearAttachments(); addSystemMessage('Cleared attached files.'); setInputValue(''); return;
    }
    if (trimmed === '/history') { open('history'); setInputValue(''); return; }
    if (trimmed === '/compact') { addSystemMessage('Compacting conversation…'); setInputValue(''); return; }
    if (trimmed === '/copy') {
      const last = messages.filter(m => m.role === 'assistant').pop();
      addSystemMessage(last ? 'Copied last response.' : 'No assistant response to copy.');
      setInputValue(''); return;
    }
    if (trimmed.startsWith('/export')) {
      const p = trimmed.slice(7).trim() || undefined;
      addSystemMessage(`Exported to: ${exportConversation(messages, activeModel, tokensUsed, cost, p)}`);
      setInputValue(''); return;
    }
    if (trimmed.startsWith('/rename ')) {
      const t = trimmed.slice(8).trim();
      addSystemMessage(t ? `Renamed to: ${t}` : 'Usage: /rename <title>');
      setInputValue(''); return;
    }
    if (trimmed === '/theme') {
      addSystemMessage('Themes: default  dracula  tokyo-night  nord  gruvbox\nUsage: /theme <name>');
      setInputValue(''); return;
    }
    if (trimmed.startsWith('/theme ')) {
      addSystemMessage(`Theme: ${trimmed.slice(7).trim()}`); setInputValue(''); return;
    }
    if (trimmed.startsWith('/')) {
      addSystemMessage(`Unknown command: ${trimmed}. Type / for autocomplete.`);
      setInputValue(''); return;
    }

    setInputValue('');
    setHistoryIndex(-1);
    setSavedDraft('');
    appendHistory(trimmed);
    setInputHistory(loadPromptHistory());
    sendMessage(trimmed);
  }, [
    isStreaming, showCommandAutocomplete, showFileAutocomplete,
    sendMessage, clearMessages, addSystemMessage,
    tokensUsed, cost, switchModel, switchMode, openModelPicker,
    attachFile, clearAttachments, messages, activeModel, openFileInPanel,
  ]);

  // ── Visible message window ───────────────────────────────────────────────
  const totalMessages = messages.length;
  const windowStart = Math.max(0, totalMessages - MAX_VISIBLE_MESSAGES - scrollOffset);
  const windowEnd = Math.max(0, totalMessages - scrollOffset);
  const visibleMessages = messages.slice(windowStart, windowEnd);
  const hiddenAbove = windowStart;
  const hiddenBelow = totalMessages - windowEnd;

  // Full-screen pickers replace the message area so layout height stays stable
  const showFullscreenOverlay = isPickingModel || isPickingProvider || !!pendingProviderAdd || showHistory;

  if (isGameOver) {
    return (
      <GameOverScreen
        tokensUsed={tokensUsed}
        cost={cost}
        messageCount={messages.length}
        onComplete={() => exit()}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <StatusBar
        provider={activeModel.provider}
        modelId={activeModel.modelId}
        tokensUsed={tokensUsed}
        tokenBudget={DEFAULT_TOKEN_BUDGET}
        isStreaming={isStreaming}
        attachedFiles={attachedFiles}
        mode={mode}
      />

      <Box flexDirection="row">
        <Box flexDirection="column" flexGrow={1} width={sidePanel ? "50%" : "100%"}>
          {showFullscreenOverlay ? (
            /* Pickers swap in place of messages — no new lines, no terminal jump */
            <Box flexDirection="column" paddingX={1}>
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
              {isPickingProvider && (
                <ProviderManager
                  configuredProviders={Object.keys(readAuth())}
                  onAdd={(id) => { open('provider-wizard', { providerId: id }); }}
                  onRemove={(id) => { removeProviderKey(id); addSystemMessage(`Removed key for ${id}.`); }}
                  onClose={() => close()}
                />
              )}
              {pendingProviderAdd && (
                <ProviderWizard
                  providerName={pendingProviderAdd}
                  onSave={(key) => {
                    // 'oauth' is a sentinel for OAuth flows where the key is already persisted
                    if (key !== 'oauth') {
                      setProviderKey(pendingProviderAdd, key);
                    }
                    addSystemMessage(`Configured ${pendingProviderAdd}.`);
                    close();
                  }}
                  onClose={() => close()}
                />
              )}
              {showHistory && (
                <HistoryPicker
                  onSelect={(id) => { loadHistory(id); close(); addSystemMessage('Conversation loaded.'); }}
                  onClose={() => close()}
                />
              )}
            </Box>
          ) : (
            /* Normal chat view */
            <Box flexDirection="column" paddingX={1}>
              {hiddenAbove > 0 && (
                <Text color="#484F58">↑ {hiddenAbove} message{hiddenAbove !== 1 ? 's' : ''} above — PgUp</Text>
              )}
              {visibleMessages.length === 0 && !isStreaming && <WelcomeScreen />}
              {visibleMessages.map(message => <MessageView key={message.id} message={message} />)}
              {hiddenBelow > 0 && (
                <Text color="#484F58">↓ {hiddenBelow} message{hiddenBelow !== 1 ? 's' : ''} below — PgDn</Text>
              )}
              {toolCalls.map(tc => <ToolCallView key={tc.toolCallId} tool={tc} />)}
              {isStreaming && <StreamingMessage text={streamingText} />}
              {pendingPermission && <PermissionPrompt permission={pendingPermission} />}
              {error && (
                <Box marginBottom={1} flexDirection="column">
                  <Text color="#F85149">Error: {error}</Text>
                  {/rate limit|429|FreeUsageLimit/i.test(error) && (
                    <Text color="#8C959F">Tip: /model to browse free models</Text>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>

        {sidePanel && (
          <SidePanel
            {...sidePanel}
            scrollOffset={sidePanelScroll}
            onClose={() => setSidePanel(null)}
          />
        )}
      </Box>

      {/* Autocomplete dropdowns sit between content and input — no layout jump
          because InputBox is disabled (focus=false) while they're shown */}
      <CommandAutocomplete
        filtered={cmdFiltered}
        selectedIndex={cmdSelectedIdx}
        visible={showCommandAutocomplete}
      />
      <FileAutocomplete
        query={fileQuery}
        visible={showFileAutocomplete}
        selectedIndex={fileAutoSelectedIdx}
        onFilesChange={(files) => { setFileAutoFiles(files); setFileAutoSelectedIdx(0); }}
      />

      <InputBox
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        isDisabled={anyOverlay}
        isStreaming={isStreaming}
      />
    </Box>
  );
}
