import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useApp, Static } from 'ink';
import {
  StatusBar,
  MessageView,
  StreamingMessage,
  WelcomeScreen,
  GameOverScreen,
  InputBox,
  ToolCallView,
  PermissionPrompt,
  QuestionPrompt,
  ModelPicker,
  ProviderManager,
  ProviderWizard,
  HistoryPicker,
  MCPManager,
  MCPWizard,
  PluginManager,
  PluginWizard,
  OnboardingWizard,
  CommandAutocomplete,
  filterCommands,
  FileAutocomplete,
  SidePanel,
  FileExplorer,
  KeyHintOverlay,
  KeybindingManager,
  CostRecommendation,
  shouldShowRecommendation,
  PasteHandler,
  TodoPanel,
} from '../../tui/src/index.js';
import { dispatch, getCommands, tryMatchIntent } from './commands/registry.js';
import type { CommandContext } from './types/commands.js';
import { useAgent } from './hooks/useAgent.js';
import { useZenGateway } from './hooks/useZenGateway.js';
import { useSidePanel } from './hooks/useSidePanel.js';
import { useOverlay } from './context/OverlayContext.js';
import { useSetTheme } from './context/ThemeContext.js';
import {
  DEFAULT_TOKEN_BUDGET,
  type ProviderName,
  type AgentMode,
  loadAttachment,
  formatAttachmentForDisplay,
  type Attachment,
} from '@personal-cli/shared';
import {
  setProviderKey,
  removeProviderKey,
  readAuth,
  appendHistory,
  loadHistory as loadPromptHistory,
  exportConversation,
  recordAccess,
  refreshProviderModels,
  refreshAllProviders,
  getAllCacheStats,
  loadMCPConfig,
  saveMCPConfig,
  removeMCPConfig,
  getTelemetryEnabled,
  setTelemetryEnabled,
  trackEvent,
} from '@personal-cli/core';
import { MCPClientManager, type MCPServerConfig, type ToolResult } from '@personal-cli/mcp-client';
import {
  ZenGatewayConfigSchema,
  ZenGatewayStatusSchema,
  ZenModelSchema,
  type ZenGatewayConfig,
  type ZenGatewayStatus,
  type ZenModel,
} from '@personal-cli/zen-mcp-server';
import { promises as fs, existsSync } from 'fs';
import { join } from 'path';
import clipboardy from 'clipboardy';
import { parseZenGatewayConfig, parseZenGatewayConfigFromEnv } from './utils/zen-config.js';
import { getToolTextResult } from './utils/tool-result.js';

interface AppProps {
  initialAttachments?: Array<{ path: string; type: 'file' | 'image' }>;
}

export function App({ initialAttachments = [] }: AppProps) {
  const [focusedToolCallId, setFocusedToolCallId] = useState<string | null>(null);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());

  const {
    messages,
    isStreaming,
    streamingText,
    streamingThought,
    tokensUsed,
    cost,
    toolCalls,
    pendingPermission,
    pendingQuestion,
    error,
    activeModel,
    attachedFiles,
    mode,
    sendMessage,
    abort,
    addSystemMessage,
    clearMessages,
    switchModel,
    switchMode,
    isPickingModel,
    openModelPicker,
    closeModelPicker,
    attachFile,
    clearAttachments,
    loadHistory,
    compact,
    renameConversation,
    undo,
    redo,
    initProject,
    getTools,
    loadPlugins,
    saveWorkspace,
    loadWorkspace,
    synthesizeAnswer,
    todos,
  } = useAgent();

  const allVisibleToolCalls = useMemo(() => {
    const historical = messages.flatMap((m) => m.toolCalls || []);
    return [...historical, ...toolCalls];
  }, [messages, toolCalls]);

  const [inputValue, setInputValue] = useState('');
  const { overlay, open, close } = useOverlay();
  const setThemeName = useSetTheme();
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedDraft, setSavedDraft] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [sidePanel, setSidePanel] = useState<{
    type: 'file' | 'diff' | 'thoughts' | 'patches';
    path?: string;
    content?: string;
    oldText?: string;
    newText?: string;
    thought?: string;
  } | null>(null);
  const [isSidePanelFocused, setIsSidePanelFocused] = useState(false);
  const [patchHistory, setPatchHistory] = useState<
    Array<{ path: string; oldText: string; newText: string; timestamp: number }>
  >([]);

  // MCP State
  const [mcpManager] = useState(() => new MCPClientManager());
  const [mcpServers, setMcpServers] = useState<import('@personal-cli/mcp-client').MCPServerInfo[]>(
    [],
  );
  const [mcpServerCount, setMcpServerCount] = useState(0);

  // Zen Gateway
  const {
    zenConfig,
    setZenConfig,
    resolveZenGatewayConfig,
    callZenGatewayTool,
    parseZenGatewayStatusResult,
    parseZenGatewayModelsResult,
    syncZenConfigFromMcp,
    saveZenConfigFromMcp,
  } = useZenGateway(mcpManager);

  const [cmdSelectedIdx, setCmdSelectedIdx] = useState(0);
  const [fileAutoFiles, setFileAutoFiles] = useState<string[]>([]);
  const [fileAutoSelectedIdx, setFileAutoSelectedIdx] = useState(0);

  const { exit } = useApp();

  // Side Panel
  const { openFileInPanel, handleSaveFile, handleExplainChange } = useSidePanel(
    setSidePanel,
    addSystemMessage,
    synthesizeAnswer,
    pendingPermission,
  );

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (isGameOver) return;
    // Always tick — StatusBar uses this for the braille spinner during streaming
    // and for rotating hints when idle. 100ms ≈ 10fps, smooth braille animation.
    const timer = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(timer);
  }, [isGameOver]);

  const isPickingProvider = overlay.type === 'provider-manager';
  const pendingProviderAdd =
    overlay.type === 'provider-wizard' ? (overlay.props?.providerId as string) : null;
  const showHistory = overlay.type === 'history';
  const showFileExplorer = overlay.type === 'file-explorer';
  const showKeyHelp = overlay.type === 'key-help';
  const showKeybindManager = overlay.type === 'keybind-manager';
  const isManagingMCP = overlay.type === 'mcp-manager';
  const mcpWizardMode =
    overlay.type === 'mcp-wizard' ? (overlay.props?.mode as 'add' | 'edit') : null;
  const mcpWizardServer =
    overlay.type === 'mcp-wizard' ? (overlay.props?.serverName as string) : null;
  const mcpWizardServerType =
    overlay.type === 'mcp-wizard' ? (overlay.props?.serverType as 'zen-gateway' | 'custom') : null;

  const isManagingPlugins = overlay.type === 'plugin-manager';
  const pluginWizardMode =
    overlay.type === 'plugin-wizard' ? (overlay.props?.mode as 'add' | 'edit') : null;
  const pluginWizardName =
    overlay.type === 'plugin-wizard' ? (overlay.props?.pluginName as string) : null;
  const isOnboarding = overlay.type === 'onboarding';
  const [activePlugins, setActivePlugins] = useState<import('@personal-cli/tools').LoadedPlugin[]>(
    [],
  );

  useEffect(() => {
    setInputHistory(loadPromptHistory());

    // Trigger onboarding if no providers are configured
    const auth = readAuth();
    if (Object.keys(auth).length === 0 && messages.length === 0) {
      open('onboarding');
    }
  }, []);

  // Load initial attachments from CLI arguments
  useEffect(() => {
    if (initialAttachments.length > 0) {
      const loadedAttachments: Attachment[] = [];
      const failedPaths: string[] = [];

      for (const att of initialAttachments) {
        const loaded = loadAttachment(att.path, att.type);
        if (loaded) {
          loadedAttachments.push(loaded);
        } else {
          failedPaths.push(att.path);
        }
      }

      if (loadedAttachments.length > 0) {
        // Add loaded attachments to the agent
        loadedAttachments.forEach((att) => attachFile(att.path));

        // Show confirmation message
        const attachmentList = loadedAttachments.map(formatAttachmentForDisplay).join(', ');
        addSystemMessage(`Attached: ${attachmentList}`);
      }

      if (failedPaths.length > 0) {
        addSystemMessage(`Failed to attach: ${failedPaths.join(', ')}`);
      }
    }
  }, []); // Run once on mount

  useEffect(() => {
    if (sidePanel) setIsSidePanelFocused(true);
    else setIsSidePanelFocused(false);
  }, [sidePanel?.path, sidePanel?.type]);

  useEffect(() => {
    if (isStreaming && sidePanel?.type === 'thoughts') {
      setSidePanel((prev) => (prev ? { ...prev, thought: streamingThought } : null));
    }
  }, [streamingThought, isStreaming, sidePanel?.type]);

  const handleCreatePlugin = useCallback(
    async (data: {
      name: string;
      version: string;
      description: string;
      createTemplate: boolean;
    }) => {
      try {
        const { getPluginDir } = await import('@personal-cli/tools');
        const pluginDir = getPluginDir();
        const dir = join(pluginDir, data.name.toLowerCase().replace(/\s+/g, '-'));

        if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });

        const manifest: any = {
          name: data.name,
          version: data.version,
          description: data.description,
          tools: [],
        };

        await fs.writeFile(join(dir, 'plugin.json'), JSON.stringify(manifest, null, 2));

        if (data.createTemplate) {
          const template = `// Personal CLI Plugin: ${data.name}
export const helloWorld = async ({ name = 'World' }) => {
  return { output: \`Hello, \${name}! from ${data.name}\` };
};
`;
          await fs.writeFile(join(dir, 'index.js'), template);

          // Update manifest with the helloWorld tool
          manifest.tools = [
            {
              name: 'helloWorld',
              description: 'A sample tool from the plugin',
              category: 'custom',
              args: { name: { type: 'string', required: false } },
            } as any,
          ];
          await fs.writeFile(join(dir, 'plugin.json'), JSON.stringify(manifest, null, 2));
        }

        const plugins = await loadPlugins();
        setActivePlugins(plugins);
        close();
      } catch (err) {
        addSystemMessage(
          `✗ Failed to create plugin: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [addSystemMessage, close, loadPlugins],
  );

  const handleDeletePlugin = useCallback(
    async (name: string) => {
      try {
        const { getPluginDir } = await import('@personal-cli/tools');
        const pluginDir = getPluginDir();
        const dir = join(pluginDir, name.toLowerCase().replace(/\s+/g, '-'));

        if (existsSync(dir)) {
          await fs.rm(dir, { recursive: true, force: true });
          const plugins = await loadPlugins();
          setActivePlugins(plugins);
        }
      } catch (err) {
        addSystemMessage(
          `✗ Failed to delete plugin: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [addSystemMessage, loadPlugins],
  );

  const showCommandAutocomplete =
    inputValue.startsWith('/') &&
    !inputValue.includes(' ') &&
    !isPickingModel &&
    !isPickingProvider &&
    !showHistory &&
    !pendingProviderAdd &&
    !isStreaming;

  const fileMatch = inputValue.match(/(@|\/add\s|\/open\s)([^\s]*)$/);
  const showFileAutocomplete =
    !!fileMatch &&
    !isPickingModel &&
    !isPickingProvider &&
    !showHistory &&
    !pendingProviderAdd &&
    !isStreaming;
  const fileTrigger = fileMatch?.[1] ?? '';
  const fileQuery = fileMatch?.[2] ?? '';

  const cmdFiltered = showCommandAutocomplete ? filterCommands(inputValue) : [];
  useEffect(() => {
    setCmdSelectedIdx(0);
  }, [inputValue]);

  useEffect(() => {
    const lastEdit = toolCalls.find((tc) => tc.toolName === 'edit_file' && tc.result && !tc.error);
    if (lastEdit && lastEdit.args) {
      const args = lastEdit.args as any;
      setSidePanel({ type: 'diff', path: args.path, oldText: args.oldText, newText: args.newText });

      // Add to session patch history if not already there (simple de-dupe by id)
      setPatchHistory((prev) => {
        if (prev.some((p) => p.timestamp === (lastEdit as any).timestamp)) return prev;
        return [
          ...prev,
          {
            path: args.path,
            oldText: args.oldText,
            newText: args.newText,
            timestamp: Date.now(),
          },
        ];
      });
    }
  }, [toolCalls]);

  const anyOverlay =
    isPickingModel ||
    isPickingProvider ||
    !!pendingProviderAdd ||
    showHistory ||
    showCommandAutocomplete ||
    showFileAutocomplete ||
    showFileExplorer ||
    showKeyHelp ||
    showKeybindManager ||
    isManagingMCP ||
    !!mcpWizardMode ||
    isManagingPlugins ||
    !!pluginWizardMode;

  const [leaderKeyActive, setLeaderKeyActive] = useState(false);

  useInput((input, key) => {
    // 1. Leader Key Detection (Ctrl+X)
    if (key.ctrl && input === 'x') {
      setLeaderKeyActive(true);
      return;
    }

    // 2. Handling Leader Key Sequences
    if (leaderKeyActive) {
      setLeaderKeyActive(false); // Reset after any key

      // Ctrl+X + E: Explain Change (Context: pendingPermission)
      if (
        input === 'e' &&
        pendingPermission &&
        (pendingPermission.toolName === 'edit_file' || pendingPermission.toolName === 'patch')
      ) {
        handleExplainChange();
        return;
      }

      // Ctrl+X + R: Toggle Reasoning (Context: always)
      if (input === 'r') {
        if (sidePanel?.type === 'thoughts') setSidePanel(null);
        else {
          const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
          const thoughtContent = isStreaming
            ? streamingThought
            : lastAssistantMsg?.thought || 'No active reasoning captured.';
          setSidePanel({ type: 'thoughts', thought: thoughtContent });
        }
        return;
      }

      // Ctrl+X + P: Patch History
      if (input === 'p') {
        if (sidePanel?.type === 'patches') setSidePanel(null);
        else setSidePanel({ type: 'patches' });
        return;
      }

      // Ctrl+X + L: Toggle SidePanel Focus
      if (input === 'l' && sidePanel && !anyOverlay && !isStreaming) {
        setIsSidePanelFocused(!isSidePanelFocused);
        return;
      }

      return; // Leader sequence handled or invalid, don't fall through
    }

    // 3. Global Hotkeys (Standard)
    if (allVisibleToolCalls.length > 0 && !anyOverlay && !isSidePanelFocused) {
      if (focusedToolCallId) {
        // Toggle expand/collapse
        if (key.return) {
          setExpandedToolCalls((prev) => {
            const next = new Set(prev);
            if (next.has(focusedToolCallId)) next.delete(focusedToolCallId);
            else next.add(focusedToolCallId);
            return next;
          });
          return;
        }
        // Escape to unfocus
        if (key.escape) {
          setFocusedToolCallId(null);
          return;
        }
      }
    }
    // Contextual interruption: Escape aborts streaming; Ctrl+C aborts or exits
    if (key.escape && isStreaming) {
      abort();
      addSystemMessage('INTERRUPTED: SYSTEM_HALTED');
      return;
    }

    if (key.ctrl && input === 'c') {
      const activeToolCount = toolCalls.filter((tc) => !tc.result && !tc.error).length;
      if (isStreaming || activeToolCount > 0) {
        abort();
        addSystemMessage('INTERRUPTED: SYSTEM_HALTED');
        return;
      }
      setIsGameOver(true);
      return;
    }

    if (key.escape && sidePanel && isSidePanelFocused) {
      setSidePanel(null);
      return;
    }

    const isInputEmpty = inputValue.length === 0;

    if (!anyOverlay && !isStreaming) {
      if (input === '?' && isInputEmpty) {
        open('key-help');
        return;
      }
      if (key.ctrl && (input === 'k' || input === '\u000b')) {
        open('keybind-manager');
        return;
      }
      if (key.ctrl && (input === 'p' || input === '\u0010')) {
        open('provider-manager');
        return;
      }
      if (key.ctrl && (input === 'h' || input === '\u0008')) {
        open('history');
        return;
      }
      if (key.ctrl && (input === '/' || input === '\u001f')) {
        open('key-help');
        return;
      }
    }

    if (isSidePanelFocused && sidePanel && !anyOverlay) {
      // SidePanel handles its own input via its own useInput
      return;
    }

    if (showFileAutocomplete) {
      if (key.escape) {
        if (fileTrigger === '@') setInputValue((v) => v.replace(/@[^\s]*$/, ''));
        setFileAutoSelectedIdx(0);
        return;
      }
      if (key.upArrow) {
        setFileAutoSelectedIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setFileAutoSelectedIdx((i) => Math.min(fileAutoFiles.length - 1, i + 1));
        return;
      }
      if (key.return || key.tab) {
        const sel = fileAutoFiles[fileAutoSelectedIdx];
        if (sel) {
          recordAccess(sel);
          if (fileTrigger === '@') {
            setInputValue((v) => v.replace(/@[^\s]*$/, ''));
            attachFile(sel).then((ok) =>
              addSystemMessage(ok ? `Attached: ${sel}` : `Error: could not read ${sel}`),
            );
          } else if (fileTrigger.trimEnd() === '/open') {
            setInputValue('');
            openFileInPanel(sel);
          } else if (fileTrigger.trimEnd() === '/add') {
            setInputValue('');
            attachFile(sel).then((ok) =>
              addSystemMessage(ok ? `Attached: ${sel}` : `Error: could not read ${sel}`),
            );
          } else {
            setInputValue((v) => v.replace(/([^\s]*)$/, sel));
          }
          setFileAutoSelectedIdx(0);
        }
        return;
      }
      if ((key.backspace || key.delete) && inputValue.length > 0) {
        setInputValue((v) => v.slice(0, -1));
        setFileAutoSelectedIdx(0);
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setInputValue((v) => v + input);
        setFileAutoSelectedIdx(0);
        return;
      }
      return;
    }

    if (showCommandAutocomplete) {
      if (key.escape) {
        setInputValue('');
        return;
      }
      if (key.upArrow) {
        setCmdSelectedIdx((i) => (i > 0 ? i - 1 : Math.max(0, cmdFiltered.length - 1)));
        return;
      }
      if (key.downArrow) {
        setCmdSelectedIdx((i) => (i < cmdFiltered.length - 1 ? i + 1 : 0));
        return;
      }
      if (key.return || key.tab) {
        const sel = cmdFiltered[cmdSelectedIdx];
        if (sel) setInputValue(sel.cmd + ' ');
        return;
      }
      if ((key.backspace || key.delete) && inputValue.length > 0) {
        setInputValue((v) => v.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setInputValue((v) => v + input);
        return;
      }
      return;
    }

    if (!anyOverlay && !isStreaming) {
      if (key.return && key.shift) {
        setInputValue((v) => v + '\n');
        return;
      }
      if (key.ctrl && (input === 'u' || input === '\u0015')) {
        setInputValue('');
        return;
      }
      if (key.ctrl && (input === 'w' || input === '\u0017')) {
        setInputValue((v) => v.replace(/\S+\s*$/, ''));
        return;
      }
      if (key.ctrl && (input === 'm' || input === '\u000d')) {
        openModelPicker();
        return;
      }
      if (key.ctrl && (input === 'o' || input === '\u000f')) {
        open('file-explorer');
        return;
      }

      // Cycle modes with CTRL+TAB (or regular TAB as fallback) if no tool calls are being navigated
      if (key.tab && focusedToolCallId === null) {
        // We'll allow both Tab and Ctrl+Tab for now as some terminals swallow Ctrl+Tab
        const cycle: AgentMode[] = ['ask', 'plan', 'build', 'auto'];
        const next = cycle[(cycle.indexOf(mode as AgentMode) + 1) % cycle.length];
        switchMode(next);
        return;
      }
      if (key.upArrow && inputHistory.length > 0 && !inputValue.includes('\n')) {
        if (historyIndex === -1) setSavedDraft(inputValue);
        const next = historyIndex + 1;
        if (next < inputHistory.length) {
          setHistoryIndex(next);
          setInputValue(inputHistory[next]);
        }
        return;
      }
      if (key.downArrow && historyIndex !== -1 && !inputValue.includes('\n')) {
        const next = historyIndex - 1;
        if (next >= 0) {
          setHistoryIndex(next);
          setInputValue(inputHistory[next]);
        } else {
          setHistoryIndex(-1);
          setInputValue(savedDraft);
        }
        return;
      }
    }
  });

  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isStreaming || showCommandAutocomplete || showFileAutocomplete) return;

      // Command Context for the registry dispatcher
      const ctx: CommandContext = {
        messages,
        tokensUsed,
        cost,
        addSystemMessage,
        clearMessages,
        switchModel: (p, m) => switchModel(p as ProviderName, m),
        switchMode: (m) => switchMode(m),
        openModelPicker,
        openProviderManager: () => open('provider-manager'),
        openPluginManager: async () => {
          const plugins = await loadPlugins();
          setActivePlugins(plugins);
          open('plugin-manager');
        },
        openHistory: () => open('history'),
        openMCPManager: () => open('mcp-manager'),
        attachFile,
        clearAttachments,
        openFileInPanel,
        exportConversation: (p) => exportConversation(messages, activeModel, tokensUsed, cost, p),
        compact,
        renameConversation,
        undo,
        redo,
        initProject,
        exit: () => setIsGameOver(true),
        abort,
        loadPlugins,
        saveWorkspace,
        loadWorkspace,
        // Zen Gateway methods
        getZenGatewayStatus: async (): Promise<ZenGatewayStatus | null> => {
          return callZenGatewayTool('zen_get_status', parseZenGatewayStatusResult);
        },
        listZenModels: async (): Promise<ZenModel[] | null> => {
          return callZenGatewayTool('zen_list_models', parseZenGatewayModelsResult);
        },
        configureZenGateway: async (): Promise<void> => {
          // Open the MCP wizard with Zen Gateway preset
          open('mcp-wizard', { mode: 'add', serverType: 'zen-gateway' });
        },
        removeZenGateway: async (): Promise<void> => {
          setZenConfig(null);
          // Also remove from MCP config if it exists there
          const mcpConfigs = loadMCPConfig();
          if (mcpConfigs['zen-gateway']) {
            removeMCPConfig('zen-gateway');
          }
        },
      };

      // Try dispatching to the command registry first
      if (trimmed.startsWith('/')) {
        const handled = await dispatch(trimmed, ctx);
        if (handled) {
          setInputValue('');
          return;
        }
      }

      // Try intent mapping for natural language commands
      const intentMatch = tryMatchIntent(trimmed);
      if (intentMatch) {
        const fullCmd = `${intentMatch.cmd} ${intentMatch.args}`.trim();
        trackEvent('command_intent', { original: trimmed, mapped: fullCmd });
        const handled = await dispatch(fullCmd, ctx);
        if (handled) {
          setInputValue('');
          return;
        }
      }

      // Track raw command execution (if it looks like a slash command)
      if (trimmed.startsWith('/')) {
        trackEvent('command_run', { command: trimmed.split(' ')[0] });
      }

      // Original manual cases (kept for compatibility or until migrated)
      if (trimmed === '/telemetry on' || trimmed === '/telemetry off') {
        const turnOn = trimmed === '/telemetry on';
        setTelemetryEnabled(turnOn);
        addSystemMessage(turnOn ? 'Telemetry enabled.' : 'Telemetry disabled.');
        setInputValue('');
        return;
      }
      if (trimmed === '/telemetry') {
        const isEnabled = getTelemetryEnabled();
        addSystemMessage(
          `Telemetry is currently ${isEnabled ? 'ON' : 'OFF'}. Use /telemetry [on|off] to change.`,
        );
        setInputValue('');
        return;
      }
      if (trimmed === '/exit' || trimmed === '/quit') {
        setIsGameOver(true);
        return;
      }
      if (trimmed === '/clear') {
        clearMessages();
        setInputValue('');
        return;
      }
      if (trimmed === '/help') {
        addSystemMessage(
          'Commands: /model /model refresh [provider] /mode /provider /tools /add /history /open /compact /copy /export /rename /theme /cost /clear /undo /redo /init /help /exit\nModes: cycle ask → plan → build with Tab, or use /mode <name>.\nType / and use ↑↓ to browse with autocomplete.',
        );
        setInputValue('');
        return;
      }
      if (trimmed === '/tools') {
        const tools = getTools();
        const toolList = tools
          .map(
            (t) =>
              `  ⚡ [${t.name.toUpperCase()}] — ${t.description || 'No description available'}`,
          )
          .join('\n');
        addSystemMessage(`Active Neuro-Tools:\n${toolList}`);
        setInputValue('');
        return;
      }
      if (trimmed === '/cost') {
        const costStr = cost > 0 ? `$${cost.toFixed(4)}` : 'unknown (free or unregistered model)';
        addSystemMessage(`Tokens: ${tokensUsed.toLocaleString()}  Cost: ${costStr}`);
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

        // Handle refresh commands
        if (rest === 'refresh') {
          addSystemMessage('Refreshing models from all providers...');
          setInputValue('');
          refreshAllProviders().then((results) => {
            const successCount = results.filter((r) => r.success).length;
            const totalModels = results
              .filter((r) => r.success)
              .reduce((sum, r) => sum + r.modelCount, 0);
            addSystemMessage(
              `✓ Refreshed ${successCount}/${results.length} providers (${totalModels} models)`,
            );
            results
              .filter((r) => !r.success)
              .forEach((r) => {
                addSystemMessage(`✗ ${r.provider}: ${r.error}`);
              });
          });
          return;
        }

        if (rest.startsWith('refresh ')) {
          const provider = rest.slice(8).trim() as ProviderName;
          addSystemMessage(`Refreshing models from ${provider}...`);
          setInputValue('');
          refreshProviderModels(provider).then((result) => {
            if (result.success) {
              addSystemMessage(`✓ Fetched ${result.modelCount} models from ${provider}`);
            } else {
              addSystemMessage(`✗ Failed: ${result.error}`);
            }
          });
          return;
        }

        // Handle model switching
        const parts = rest.includes('/') ? rest.split('/') : rest.split(' ');
        if (parts.length >= 2) {
          switchModel(parts[0] as ProviderName, parts.slice(1).join('/'));
          addSystemMessage(`Switched to ${parts[0]}/${parts.slice(1).join('/')}`);
        } else {
          addSystemMessage(
            'Usage: /model <provider/modelId>  or  /model to browse  or  /model refresh [provider]',
          );
        }
        setInputValue('');
        return;
      }
      if (trimmed === '/mcp') {
        open('mcp-manager');
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/mcp ')) {
        const parts = trimmed.slice(5).trim().split(' ');
        const subcommand = parts[0];
        const serverName = parts[1];

        switch (subcommand) {
          case 'list': {
            const servers = mcpManager.getAllServerInfo();
            const configs = loadMCPConfig();
            const allNames = new Set([...servers.map((s) => s.name), ...Object.keys(configs)]);

            if (allNames.size === 0) {
              addSystemMessage('No MCP servers configured. Use /mcp add to add one.');
            } else {
              const lines = Array.from(allNames).map((name) => {
                const server = servers.find((s) => s.name === name);
                const config = configs[name];
                if (server?.status === 'connected') {
                  return `  🟢 ${name} (${server.tools.length} tools)`;
                } else if (config) {
                  return `  🔴 ${name} (${config.transport}) - disconnected`;
                }
                return `  ⚪ ${name} - unknown`;
              });
              addSystemMessage(`MCP Servers:\n${lines.join('\n')}`);
            }
            break;
          }
          case 'add':
            open('mcp-wizard', { mode: 'add' });
            break;
          case 'edit':
            if (serverName) {
              open('mcp-wizard', { mode: 'edit', serverName });
            } else {
              addSystemMessage('Usage: /mcp edit <server-name>');
            }
            break;
          case 'remove':
            if (serverName) {
              await mcpManager.disconnectServer(serverName);
              removeMCPConfig(serverName);
              if (serverName === 'zen-gateway') {
                setZenConfig(null);
              }
              addSystemMessage(`Removed MCP server: ${serverName}`);
              // Refresh server list
              setMcpServers(mcpManager.getAllServerInfo());
              setMcpServerCount(mcpManager.getConnectedServers().length);
            } else {
              addSystemMessage('Usage: /mcp remove <server-name>');
            }
            break;
          case 'connect':
            if (serverName) {
              const configs = loadMCPConfig();
              const config = configs[serverName];
              if (config) {
                try {
                  await mcpManager.connectServer(serverName, config);
                  if (serverName === 'zen-gateway') {
                    syncZenConfigFromMcp(config);
                  }
                  addSystemMessage(`Connected to MCP server: ${serverName}`);
                  setMcpServers(mcpManager.getAllServerInfo());
                  setMcpServerCount(mcpManager.getConnectedServers().length);
                } catch (error) {
                  addSystemMessage(
                    `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              } else {
                addSystemMessage(`No configuration found for: ${serverName}`);
              }
            } else {
              addSystemMessage('Usage: /mcp connect <server-name>');
            }
            break;
          case 'disconnect':
            if (serverName) {
              await mcpManager.disconnectServer(serverName);
              if (serverName === 'zen-gateway') {
                setZenConfig(resolveZenGatewayConfig());
              }
              addSystemMessage(`Disconnected from MCP server: ${serverName}`);
              setMcpServers(mcpManager.getAllServerInfo());
              setMcpServerCount(mcpManager.getConnectedServers().length);
            } else {
              addSystemMessage('Usage: /mcp disconnect <server-name>');
            }
            break;
          case 'reload': {
            const configs = loadMCPConfig();
            let connected = 0;
            for (const [name, config] of Object.entries(configs)) {
              if (config.enabled !== false) {
                try {
                  await mcpManager.connectServer(name, config);
                  if (name === 'zen-gateway') {
                    syncZenConfigFromMcp(config);
                  }
                  connected++;
                } catch (error) {
                  addSystemMessage(
                    `Failed to connect ${name}: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              }
            }
            addSystemMessage(`Reloaded MCP servers: ${connected} connected`);
            setMcpServers(mcpManager.getAllServerInfo());
            setMcpServerCount(mcpManager.getConnectedServers().length);
            break;
          }
          default:
            addSystemMessage('Usage: /mcp [list|add|edit|remove|connect|disconnect|reload]');
        }
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/mode ')) {
        const mode = trimmed.split(' ')[1] as 'ask' | 'auto' | 'build';
        switchMode(mode);
        addSystemMessage(`Mode: ${mode}`);
        setInputValue('');
        return;
      }
      if (trimmed === '/open') {
        addSystemMessage('Usage: /open <path>  — or type /open and use ↑↓ to pick a file');
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/open ')) {
        const fp = trimmed.slice(6).trim();
        await openFileInPanel(fp);
        setInputValue('');
        return;
      }
      if (trimmed === '/provider') {
        open('provider-manager');
        setInputValue('');
        return;
      }
      if (trimmed === '/plugins') {
        await ctx.openPluginManager();
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/plugins ')) {
        const sub = trimmed.split(' ')[1];
        if (sub === 'ui' || sub === 'manage') {
          await ctx.openPluginManager();
          setInputValue('');
          return;
        }
      }
      if (trimmed.startsWith('/add ')) {
        const fp = trimmed.slice(5).trim();
        await attachFile(fp);
        setInputValue('');
        return;
      }
      if (trimmed === '/add --clear' || trimmed === '/detach') {
        clearAttachments();
        setInputValue('');
        return;
      }
      if (trimmed === '/history') {
        open('history');
        setInputValue('');
        return;
      }
      if (trimmed === '/compact') {
        addSystemMessage('Compacting conversation…');
        setInputValue('');
        compact().then((result) => addSystemMessage(result));
        return;
      }
      if (trimmed === '/copy') {
        const last = messages.filter((m) => m.role === 'assistant').pop();
        if (last) {
          clipboardy
            .write(last.content)
            .then(() => addSystemMessage('Copied last response to clipboard.'))
            .catch(() => addSystemMessage('Failed to write to clipboard.'));
        } else {
          addSystemMessage('No assistant response to copy.');
        }
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/export')) {
        const p = trimmed.slice(7).trim() || undefined;
        addSystemMessage(
          `Exported to: ${exportConversation(messages, activeModel, tokensUsed, cost, p)}`,
        );
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/rename ')) {
        const t = trimmed.slice(8).trim();
        if (!t) {
          addSystemMessage('Usage: /rename <title>');
          setInputValue('');
          return;
        }
        const ok = renameConversation(t);
        addSystemMessage(ok ? `Renamed to: ${t}` : 'Nothing to rename yet — send a message first.');
        setInputValue('');
        return;
      }
      if (trimmed === '/theme') {
        addSystemMessage(
          'Themes: default  dracula  tokyo-night  nord  gruvbox\nUsage: /theme <name>',
        );
        setInputValue('');
        return;
      }
      if (trimmed.startsWith('/theme ')) {
        const name = trimmed.slice(7).trim();
        setThemeName(name);
        addSystemMessage(`Theme: ${name}`);
        setInputValue('');
        return;
      }
      if (trimmed === '/undo') {
        addSystemMessage(undo());
        setInputValue('');
        return;
      }
      if (trimmed === '/redo') {
        addSystemMessage(redo());
        setInputValue('');
        return;
      }
      if (trimmed === '/init') {
        addSystemMessage('Analyzing project and generating AGENTS.md…');
        setInputValue('');
        initProject().then((result) => addSystemMessage(result));
        return;
      }
      if (trimmed.startsWith('/')) {
        addSystemMessage(`Unknown command: ${trimmed}. Type / for autocomplete.`);
        setInputValue('');
        return;
      }

      setInputValue('');
      setHistoryIndex(-1);
      setSavedDraft('');
      appendHistory(trimmed);
      try {
        await sendMessage(trimmed);
      } catch (err) {
        addSystemMessage(`CRITICAL_ERROR: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [
      isStreaming,
      showCommandAutocomplete,
      showFileAutocomplete,
      sendMessage,
      clearMessages,
      addSystemMessage,
      compact,
      tokensUsed,
      cost,
      callZenGatewayTool,
      parseZenGatewayStatusResult,
      parseZenGatewayModelsResult,
      switchModel,
      switchMode,
      openModelPicker,
      attachFile,
      clearAttachments,
      messages,
      activeModel,
      openFileInPanel,
      undo,
      redo,
      initProject,
    ],
  );

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

  const showFullscreenOverlay =
    isPickingModel ||
    isPickingProvider ||
    !!pendingProviderAdd ||
    showHistory ||
    showFileExplorer ||
    showKeyHelp ||
    showKeybindManager ||
    isManagingMCP ||
    !!mcpWizardMode ||
    isManagingPlugins ||
    !!pluginWizardMode ||
    isOnboarding;

  return (
    <>
      <PasteHandler
        onAttach={async (attachment) => {
          if (attachment.type === 'error') {
            addSystemMessage(`Clipboard Error: ${attachment.mimeType}`);
          } else if (attachment.type === 'path') {
            const ok = await attachFile(attachment.path);
            addSystemMessage(
              ok
                ? `Attached (Paste/Drop): ${attachment.path}`
                : `Error: could not attach ${attachment.path}`,
            );
          } else {
            const ok = await attachFile(attachment.path);
            addSystemMessage(
              ok
                ? `Attached Image (Clipboard): ${attachment.name}`
                : `Error: could not attach clipboard image`,
            );
          }
        }}
      />
      <Static items={messages}>
        {(message) => (
          <MessageView
            key={message.id}
            message={message}
            focusedToolCallId={focusedToolCallId}
            expandedToolCalls={expandedToolCalls}
            onToggleToolCall={(id: string) => {
              setExpandedToolCalls((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onFocusToolCall={(id: string) => setFocusedToolCallId(id)}
          />
        )}
      </Static>

      <Box flexDirection="column">
        {showFullscreenOverlay ? (
          <Box flexDirection="column" paddingX={1}>
            {isPickingModel && (
              <ModelPicker
                tick={tick}
                onSelect={(provider, modelId) => {
                  switchModel(provider, modelId);
                  closeModelPicker();
                }}
                onClose={closeModelPicker}
              />
            )}
            {isPickingProvider && (
              <ProviderManager
                tick={tick}
                configuredProviders={Object.keys(readAuth())}
                onAdd={(id) => {
                  open('provider-wizard', { providerId: id });
                }}
                onRemove={(id) => {
                  removeProviderKey(id);
                }}
                onClose={() => close()}
              />
            )}
            {pendingProviderAdd && (
              <ProviderWizard
                providerName={pendingProviderAdd}
                onSave={(key) => {
                  if (key !== 'oauth') {
                    setProviderKey(pendingProviderAdd, key);
                  }
                  close();
                }}
                onClose={() => close()}
              />
            )}
            {showHistory && (
              <HistoryPicker
                onSelect={(id) => {
                  loadHistory(id);
                  close();
                }}
                onClose={() => close()}
              />
            )}
            {showFileExplorer && (
              <FileExplorer
                tick={tick}
                onSelect={(path) => {
                  openFileInPanel(path);
                  close();
                }}
                onClose={() => close()}
              />
            )}
            {showKeyHelp && <KeyHintOverlay onClose={() => close()} />}
            {showKeybindManager && <KeybindingManager onClose={() => close()} />}
            {isManagingMCP && (
              <MCPManager
                servers={mcpServers}
                onAdd={() => open('mcp-wizard', { mode: 'add' })}
                onAddZenGateway={() =>
                  open('mcp-wizard', { mode: 'add', serverType: 'zen-gateway' })
                }
                onEdit={(name) => open('mcp-wizard', { mode: 'edit', serverName: name })}
                onRemove={async (name) => {
                  await mcpManager.disconnectServer(name);
                  removeMCPConfig(name);
                  addSystemMessage(`Removed MCP server: ${name}`);
                  setMcpServers(mcpManager.getAllServerInfo());
                  setMcpServerCount(mcpManager.getConnectedServers().length);
                }}
                onConnect={async (name, config) => {
                  try {
                    await mcpManager.connectServer(name, config);
                    if (name === 'zen-gateway') {
                      syncZenConfigFromMcp(config);
                    }
                    addSystemMessage(`Connected to MCP server: ${name}`);
                    setMcpServers(mcpManager.getAllServerInfo());
                    setMcpServerCount(mcpManager.getConnectedServers().length);
                  } catch (error) {
                    addSystemMessage(
                      `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
                    );
                  }
                }}
                onDisconnect={async (name) => {
                  await mcpManager.disconnectServer(name);
                  if (name === 'zen-gateway') {
                    setZenConfig(resolveZenGatewayConfig());
                  }
                  addSystemMessage(`Disconnected from MCP server: ${name}`);
                  setMcpServers(mcpManager.getAllServerInfo());
                  setMcpServerCount(mcpManager.getConnectedServers().length);
                }}
                onClose={() => close()}
              />
            )}
            {isManagingPlugins && (
              <PluginManager
                tick={tick}
                plugins={activePlugins}
                onAdd={() => open('plugin-wizard', { mode: 'add' })}
                onEdit={(name) => open('plugin-wizard', { mode: 'edit', pluginName: name })}
                onRemove={handleDeletePlugin}
                onClose={() => close()}
              />
            )}
            {pluginWizardMode && (
              <PluginWizard
                mode={pluginWizardMode}
                pluginName={pluginWizardName || undefined}
                onSave={handleCreatePlugin}
                onClose={() => close()}
              />
            )}
            {mcpWizardMode && (
              <MCPWizard
                mode={mcpWizardMode}
                serverName={mcpWizardServer || undefined}
                existingConfig={mcpWizardServer ? loadMCPConfig()[mcpWizardServer] : undefined}
                serverType={mcpWizardServerType || 'custom'}
                onSave={async (name, config) => {
                  saveMCPConfig(name, config);

                  // If this is the Zen Gateway, sync CLI state from the saved MCP config
                  if (name === 'zen-gateway') {
                    saveZenConfigFromMcp(config);
                  }

                  if (config.enabled !== false) {
                    try {
                      await mcpManager.connectServer(name, config);
                      addSystemMessage(
                        `MCP server ${mcpWizardMode === 'add' ? 'added' : 'updated'} and connected: ${name}`,
                      );
                    } catch (error) {
                      addSystemMessage(
                        `Saved config but failed to connect: ${error instanceof Error ? error.message : String(error)}`,
                      );
                    }
                  } else {
                    addSystemMessage(
                      `MCP server ${mcpWizardMode === 'add' ? 'added' : 'updated'}: ${name}`,
                    );
                  }
                  setMcpServers(mcpManager.getAllServerInfo());
                  setMcpServerCount(mcpManager.getConnectedServers().length);
                  close();
                }}
                onClose={() => close()}
              />
            )}
            {isOnboarding && (
              <OnboardingWizard
                configuredProviders={Object.keys(readAuth())}
                onAddProvider={(id) => open('provider-wizard', { providerId: id })}
                onComplete={() => close()}
              />
            )}
          </Box>
        ) : (
          <Box flexDirection="row">
            <Box flexDirection="column" flexGrow={1} width={sidePanel ? '50%' : '100%'}>
              <Box flexDirection="column" paddingX={1}>
                {messages.length === 0 && !isStreaming && <WelcomeScreen tick={tick} />}
                {todos.length > 0 && <TodoPanel todos={todos} />}
                {toolCalls.map((tc) => (
                  <ToolCallView
                    key={tc.toolCallId}
                    tool={tc}
                    focused={focusedToolCallId === tc.toolCallId}
                    expanded={expandedToolCalls.has(tc.toolCallId)}
                    onToggleExpand={() => {
                      setExpandedToolCalls((prev) => {
                        const next = new Set(prev);
                        if (next.has(tc.toolCallId)) next.delete(tc.toolCallId);
                        else next.add(tc.toolCallId);
                        return next;
                      });
                    }}
                    onFocus={() => setFocusedToolCallId(tc.toolCallId)}
                  />
                ))}
                {isStreaming && (
                  <StreamingMessage text={streamingText} thought={streamingThought} />
                )}
                {pendingPermission && (
                  <PermissionPrompt
                    permission={pendingPermission}
                    onExplain={
                      pendingPermission.toolName === 'edit_file' ||
                      pendingPermission.toolName === 'patch'
                        ? handleExplainChange
                        : undefined
                    }
                  />
                )}
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
                    onSelect={(provider, modelId) => {
                      switchModel(provider, modelId);
                    }}
                  />
                )}
              </Box>
            </Box>

            {sidePanel && (
              <SidePanel
                {...sidePanel}
                isFocused={isSidePanelFocused}
                onClose={() => setSidePanel(null)}
                patches={patchHistory}
                onSave={(content) => {
                  if (sidePanel.path) {
                    handleSaveFile(sidePanel.path, content);
                  }
                }}
              />
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
          mcpServerCount={mcpServerCount}
          activeToolCount={toolCalls.filter((tc) => !tc.result && !tc.error).length}
          leaderKeyActive={leaderKeyActive}
        />

        <CommandAutocomplete
          filtered={cmdFiltered}
          selectedIndex={cmdSelectedIdx}
          visible={showCommandAutocomplete}
        />
        <FileAutocomplete
          query={fileQuery}
          visible={showFileAutocomplete}
          selectedIndex={fileAutoSelectedIdx}
          onFilesChange={(files) => {
            setFileAutoFiles(files);
            setFileAutoSelectedIdx(0);
          }}
        />

        <InputBox
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          isDisabled={anyOverlay || isSidePanelFocused}
          isStreaming={isStreaming}
          attachedFiles={attachedFiles}
        />
      </Box>
    </>
  );
}
