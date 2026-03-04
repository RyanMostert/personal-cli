import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useApp, Static } from 'ink';
import { StatusBar } from './components/StatusBar.js';
import { MessageView } from './components/MessageView.js';
import { StreamingMessage } from './components/StreamingMessage.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { GameOverScreen } from './components/GameOverScreen.js';
import { InputBox } from './components/InputBox.js';
import { ToolCallView } from './components/ToolCallView.js';
import { PermissionPrompt } from './components/PermissionPrompt.js';
import { QuestionPrompt } from './components/QuestionPrompt.js';
import { ModelPicker } from './components/ModelPicker.js';
import { ProviderManager } from './components/ProviderManager.js';
import { ProviderWizard } from './components/ProviderWizard.js';
import { HistoryPicker } from './components/HistoryPicker.js';
import { CommandAutocomplete, filterCommands } from './components/CommandAutocomplete.js';
import { FileAutocomplete } from './components/FileAutocomplete.js';
import { SidePanel } from './components/SidePanel.js';
import { CostRecommendation, shouldShowRecommendation } from './components/CostRecommendation.js';
import { useAgent } from './hooks/useAgent.js';
import { useOverlay } from './context/OverlayContext.js';
import { useSetTheme } from './context/ThemeContext.js';
import { DEFAULT_TOKEN_BUDGET, type ProviderName, type AgentMode } from '@personal-cli/shared';
import {
  setProviderKey, removeProviderKey, readAuth,
  appendHistory, loadHistory as loadPromptHistory,
  exportConversation, recordAccess,
} from '@personal-cli/core';
import { promises as fs } from 'fs';
import clipboardy from 'clipboardy';


export function App() {
  const [inputValue, setInputValue] = useState('');
  const { overlay, open, close } = useOverlay();
  const setThemeName = useSetTheme();
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

  const [cmdSelectedIdx, setCmdSelectedIdx] = useState(0);
  const [fileAutoFiles, setFileAutoFiles] = useState<string[]>([]);
  const [fileAutoSelectedIdx, setFileAutoSelectedIdx] = useState(0);

  const {
    messages, isStreaming, streamingText, tokensUsed, cost, toolCalls,
    pendingPermission, pendingQuestion, error, activeModel, attachedFiles, mode,
    sendMessage, abort, addSystemMessage, clearMessages, switchModel, switchMode,
    isPickingModel, openModelPicker, closeModelPicker,
    attachFile, clearAttachments, loadHistory, compact, renameConversation,
    undo, redo, initProject,
  } = useAgent();
  const { exit } = useApp();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (isStreaming) return;
    const timer = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(timer);
  }, [isStreaming]);

  const isPickingProvider = overlay.type === 'provider-manager';
  const pendingProviderAdd = overlay.type === 'provider-wizard' ? (overlay.props?.providerId as string) : null;
  const showHistory = overlay.type === 'history';

  useEffect(() => { setInputHistory(loadPromptHistory()); }, []);
  useEffect(() => { setSidePanelScroll(0); }, [sidePanel?.path]);

  const openFileInPanel = useCallback(async (fp: string) => {
    try {
      const content = await fs.readFile(fp, 'utf-8');
      recordAccess(fp);
      setSidePanel({ type: 'file', path: fp, content });
    } catch {
      addSystemMessage(`Error: could not open ${fp}`);
    }
  }, [addSystemMessage]);

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

  const cmdFiltered = showCommandAutocomplete ? filterCommands(inputValue) : [];
  useEffect(() => { setCmdSelectedIdx(0); }, [inputValue]);

  useEffect(() => {
    const lastEdit = toolCalls.find(tc => tc.toolName === 'edit_file' && tc.result && !tc.error);
    if (lastEdit && lastEdit.args) {
      const args = lastEdit.args as any;
      setSidePanel({ type: 'diff', path: args.path, oldText: args.oldText, newText: args.newText });
    }
  }, [toolCalls]);

  const anyOverlay = isPickingModel || isPickingProvider || !!pendingProviderAdd || showHistory || showCommandAutocomplete || showFileAutocomplete;

  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || (key.ctrl && input === 'd')) { setIsGameOver(true); return; }
    if (key.escape && isStreaming) { abort(); return; }
    if (key.escape && sidePanel) { setSidePanel(null); return; }

    if (sidePanel && !showFileAutocomplete && !showCommandAutocomplete) {
      if (key.upArrow) { setSidePanelScroll(s => Math.max(0, s - 1)); return; }
      if (key.downArrow) { setSidePanelScroll(s => s + 1); return; }
    }

    if (showFileAutocomplete) {
      if (key.escape) {
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
            attachFile(sel).then(ok => addSystemMessage(ok ? `Attached: ${sel}` : `Error: could not read ${sel}`));
          } else if (fileTrigger.trimEnd() === '/open') {
            setInputValue(''); openFileInPanel(sel);
          } else if (fileTrigger.trimEnd() === '/add') {
            setInputValue(''); attachFile(sel).then(ok => addSystemMessage(ok ? `Attached: ${sel}` : `Error: could not read ${sel}`));
          } else {
            setInputValue(v => v.replace(/([^\s]*)$/, sel));
          }
          setFileAutoSelectedIdx(0);
        }
        return;
      }
      if ((key.backspace || key.delete) && inputValue.length > 0) { setInputValue(v => v.slice(0, -1)); setFileAutoSelectedIdx(0); return; }
      if (input && !key.ctrl && !key.meta) { setInputValue(v => v + input); setFileAutoSelectedIdx(0); return; }
      return;
    }

    if (showCommandAutocomplete) {
      if (key.escape) { setInputValue(''); return; }
      if (key.upArrow) { setCmdSelectedIdx(i => (i > 0 ? i - 1 : Math.max(0, cmdFiltered.length - 1))); return; }
      if (key.downArrow) { setCmdSelectedIdx(i => (i < cmdFiltered.length - 1 ? i + 1 : 0)); return; }
      if (key.return || key.tab) {
        const sel = cmdFiltered[cmdSelectedIdx];
        if (sel) setInputValue(sel.cmd + ' ');
        return;
      }
      if ((key.backspace || key.delete) && inputValue.length > 0) { setInputValue(v => v.slice(0, -1)); return; }
      if (input && !key.ctrl && !key.meta) { setInputValue(v => v + input); return; }
      return;
    }

    if (!anyOverlay && !isStreaming) {
      if (key.return && key.shift) { setInputValue(v => v + '\n'); return; }
      if (key.ctrl && input === 'u') { setInputValue(''); return; }
      if (key.ctrl && input === 'w') { setInputValue(v => v.replace(/\S+\s*$/, '')); return; }
      if (key.ctrl && input === 'm') { openModelPicker(); return; }
      if (key.tab) {
        const cycle: AgentMode[] = ['ask', 'build', 'plan'];
        const next = cycle[(cycle.indexOf(mode as AgentMode) + 1) % cycle.length];
        switchMode(next);
        addSystemMessage(`Mode: ${next}`);
        return;
      }
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
    }
  });

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || showCommandAutocomplete || showFileAutocomplete) return;

    if (trimmed === '/exit' || trimmed === '/quit') { setIsGameOver(true); return; }
    if (trimmed === '/clear') { clearMessages(); setInputValue(''); return; }
    if (trimmed === '/help') {
      addSystemMessage('Commands: /model /mode /provider /add /history /open /compact /copy /export /rename /theme /cost /clear /undo /redo /init /help /exit\nModes: cycle ask → plan → build with Tab, or use /mode <name>.\nType / and use ↑↓ to browse with autocomplete.');
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
    if (trimmed === '/compact') {
      addSystemMessage('Compacting conversation…'); setInputValue('');
      compact().then(result => addSystemMessage(result)); return;
    }
    if (trimmed === '/copy') {
      const last = messages.filter(m => m.role === 'assistant').pop();
      if (last) {
        clipboardy.write(last.content)
          .then(() => addSystemMessage('Copied last response to clipboard.'))
          .catch(() => addSystemMessage('Failed to write to clipboard.'));
      } else {
        addSystemMessage('No assistant response to copy.');
      }
      setInputValue(''); return;
    }
    if (trimmed.startsWith('/export')) {
      const p = trimmed.slice(7).trim() || undefined;
      addSystemMessage(`Exported to: ${exportConversation(messages, activeModel, tokensUsed, cost, p)}`);
      setInputValue(''); return;
    }
    if (trimmed.startsWith('/rename ')) {
      const t = trimmed.slice(8).trim();
      if (!t) { addSystemMessage('Usage: /rename <title>'); setInputValue(''); return; }
      const ok = renameConversation(t);
      addSystemMessage(ok ? `Renamed to: ${t}` : 'Nothing to rename yet — send a message first.');
      setInputValue(''); return;
    }
    if (trimmed === '/theme') {
      addSystemMessage('Themes: default  dracula  tokyo-night  nord  gruvbox\nUsage: /theme <name>');
      setInputValue(''); return;
    }
    if (trimmed.startsWith('/theme ')) {
      const name = trimmed.slice(7).trim();
      setThemeName(name); addSystemMessage(`Theme: ${name}`); setInputValue(''); return;
    }
    if (trimmed === '/undo') { addSystemMessage(undo()); setInputValue(''); return; }
    if (trimmed === '/redo') { addSystemMessage(redo()); setInputValue(''); return; }
    if (trimmed === '/init') {
      addSystemMessage('Analyzing project and generating AGENTS.md…'); setInputValue('');
      initProject().then(result => addSystemMessage(result)); return;
    }
    if (trimmed.startsWith('/')) { addSystemMessage(`Unknown command: ${trimmed}. Type / for autocomplete.`); setInputValue(''); return; }

    setInputValue(''); setHistoryIndex(-1); setSavedDraft('');
    appendHistory(trimmed); 
    try {
      await sendMessage(trimmed);
    } catch (err) {
      addSystemMessage(`CRITICAL_ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [
    isStreaming, showCommandAutocomplete, showFileAutocomplete,
    sendMessage, clearMessages, addSystemMessage, compact,
    tokensUsed, cost, switchModel, switchMode, openModelPicker,
    attachFile, clearAttachments, messages, activeModel, openFileInPanel,
    undo, redo, initProject,
  ]);

  if (isGameOver) {
    return (
      <GameOverScreen tokensUsed={tokensUsed} cost={cost} messageCount={messages.length} onComplete={() => exit()} />
    );
  }

  const showFullscreenOverlay = isPickingModel || isPickingProvider || !!pendingProviderAdd || showHistory;

  return (
    <>
      <Static items={messages}>
        {(message) => <MessageView key={message.id} message={message} />}
      </Static>

      <Box flexDirection="column">
        {showFullscreenOverlay ? (
          <Box flexDirection="column" paddingX={1}>
            {isPickingModel && (
              <ModelPicker
                tick={tick}
                onSelect={(provider, modelId) => { switchModel(provider, modelId); closeModelPicker(); addSystemMessage(`Switched to ${provider}/${modelId}`); }}
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
                onSave={(key) => { if (key !== 'oauth') { setProviderKey(pendingProviderAdd, key); } addSystemMessage(`Configured ${pendingProviderAdd}.`); close(); }}
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
          <Box flexDirection="row">
            <Box flexDirection="column" flexGrow={1} width={sidePanel ? "50%" : "100%"}>
              <Box flexDirection="column" paddingX={1}>
                {messages.length === 0 && !isStreaming && <WelcomeScreen tick={tick} />}
                {toolCalls.map(tc => <ToolCallView key={tc.toolCallId} tool={tc} />)}
                {isStreaming && <StreamingMessage text={streamingText} />}
                {pendingPermission && <PermissionPrompt permission={pendingPermission} />}
                {pendingQuestion && <QuestionPrompt question={pendingQuestion} />}
                {error && (
                  <Box marginBottom={1} flexDirection="column">
                    <Text color="#F85149">Error: {error}</Text>
                    {/rate limit|429|FreeUsageLimit/i.test(error) && (
                      <Text color="#8C959F">Tip: /model to browse free models</Text>
                    )}
                  </Box>
                )}
                {shouldShowRecommendation(cost, 5) && (
                  <CostRecommendation
                    currentProvider={activeModel.provider}
                    currentModelId={activeModel.modelId}
                    currentCost={cost}
                    onSelect={(provider, modelId) => { switchModel(provider, modelId); addSystemMessage(`Switched to ${provider}/${modelId} for cost savings`); }}
                  />
                )}
              </Box>
            </Box>

            {sidePanel && (
              <SidePanel {...sidePanel} scrollOffset={sidePanelScroll} onClose={() => setSidePanel(null)} />
            )}
          </Box>
        )}

        <StatusBar
          provider={activeModel.provider}
          modelId={activeModel.modelId}
          tokensUsed={tokensUsed}
          tokenBudget={DEFAULT_TOKEN_BUDGET}
          isStreaming={isStreaming}
          attachedFiles={attachedFiles}
          mode={mode}
          tick={tick}
          cost={cost}
        />

        <CommandAutocomplete filtered={cmdFiltered} selectedIndex={cmdSelectedIdx} visible={showCommandAutocomplete} />
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
    </>
  );
}
