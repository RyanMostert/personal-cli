import { useState, useCallback, useRef } from 'react';
import { Agent, ProviderManager, loadConfig, getDefaultModel, loadSettings } from '@personal-cli/core';
import type { Message, StreamEvent, ToolCallInfo, AgentMode, ProviderName } from '@personal-cli/shared';
import { DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';
import type { PendingPermission } from '../components/PermissionPrompt.js';
import type { PendingQuestion } from '../components/QuestionPrompt.js';
import { promises as fs } from 'fs';

interface AttachedFile {
  path: string;
  content: string;
}

interface AgentState {
  messages: Message[];
  isStreaming: boolean;
  tokensUsed: number;
  cost: number;
  toolCalls: ToolCallInfo[];
  pendingPermission: PendingPermission | null;
  pendingQuestion: PendingQuestion | null;
  error: string | null;
  isPickingModel: boolean;
  attachedFiles: AttachedFile[];
  mode: AgentMode;
}

export function useAgent() {
  const agentRef = useRef<Agent | null>(null);
  const attachedFilesRef = useRef<AttachedFile[]>([]);

  // Split streamingText into isolated state to prevent re-renders of the main state tree
  const [streamingText, setStreamingText] = useState('');

  const [state, setState] = useState<AgentState>({
    messages: [],
    isStreaming: false,
    tokensUsed: 0,
    cost: 0,
    toolCalls: [],
    pendingPermission: null,
    pendingQuestion: null,
    error: null,
    isPickingModel: false,
    attachedFiles: [],
    mode: loadSettings().defaultMode ?? 'ask',
  });

  const permissionCallback = useCallback((toolName: string, args?: Record<string, unknown>) => {
    return new Promise<boolean>((resolve) => {
      setState((prev) => ({
        ...prev,
        pendingPermission: {
          toolName,
          args,
          resolve: (allow: boolean) => {
            setState((p) => ({ ...p, pendingPermission: null }));
            resolve(allow);
          },
        },
      }));
    });
  }, []);

  const questionCallback = useCallback((header: string, options: string[]) => {
    return new Promise<string>((resolve) => {
      setState((prev) => ({
        ...prev,
        pendingQuestion: {
          header,
          options,
          resolve: (answer: string) => {
            setState((p) => ({ ...p, pendingQuestion: null }));
            resolve(answer);
          },
        },
      }));
    });
  }, []);

  const getAgent = useCallback((): Agent => {
    if (!agentRef.current) {
      const config = loadConfig();
      const { provider, modelId } = getDefaultModel(config);

      const manager = new ProviderManager({
        provider: provider as ConstructorParameters<typeof ProviderManager>[0]['provider'],
        modelId,
      });

      const settings = loadSettings();

      agentRef.current = new Agent({
        providerManager: manager,
        tokenBudget: settings.tokenBudget ?? DEFAULT_TOKEN_BUDGET,
        maxSteps: settings.maxSteps ?? 20,
        mode: state.mode,
        permissionFn: permissionCallback,
        questionFn: questionCallback,
      });
    }
    return agentRef.current;
  }, [permissionCallback]);

  const activeModel = agentRef.current?.getActiveModel() ?? {
    provider: 'opencode-zen',
    modelId: 'kimi-k2.5-free',
  };

  const sendMessage = useCallback(async (content: string) => {
    const agent = getAgent();
    // Read from ref — avoids stale closure since useCallback deps don't include state
    const currentAttachedFiles = attachedFilesRef.current;
    attachedFilesRef.current = [];

    setStreamingText('');
    setState((prev) => ({
      ...prev,
      isStreaming: true,
      error: null,
      toolCalls: [],
      attachedFiles: [],
    }));

    try {
      const stream = agent.sendMessage(content, currentAttachedFiles);

      // Buffer streaming text and flush at most every 80ms to reduce Ink repaints
      let textBuf = '';
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const flush = () => {
        if (textBuf) { setStreamingText(prev => prev + textBuf); textBuf = ''; }
        flushTimer = null;
      };

      for await (const event of stream) {
        switch (event.type) {
          case 'text-delta':
            if (event.delta) {
              textBuf += event.delta;
              if (!flushTimer) flushTimer = setTimeout(flush, 80);
            }
            break;
          case 'tool-call-start':
            setState((prev) => ({
              ...prev,
              toolCalls: [...prev.toolCalls, {
                toolCallId: event.toolCall!.toolCallId,
                toolName: event.toolCall!.toolName,
                args: event.toolCall!.args,
              }],
            }));
            break;
          case 'tool-call-result':
            setState((prev) => ({
              ...prev,
              toolCalls: prev.toolCalls.map(tc =>
                tc.toolCallId === event.toolCall!.toolCallId
                  ? { ...tc, result: event.toolCall!.result }
                  : tc
              ),
            }));
            break;
          case 'system':
            if (event.message) {
              agent.addSystemMessage(event.message);
              setState((prev) => ({ ...prev, messages: agent.getMessages() }));
            }
            break;
          case 'error':
            throw event.error;
        }
      }

      // Flush any remaining buffered text before clearing streaming state
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      if (textBuf) { setStreamingText(prev => prev + textBuf); textBuf = ''; }

      // Stream completed (normal finish or after abort) — always runs
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        messages: agent.getMessages(),
        tokensUsed: agent.getTokensUsed(),
        cost: agent.getCost(),
        toolCalls: [],
      }));
      setStreamingText('');

    } catch (err) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      setStreamingText('');
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        toolCalls: [],
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [getAgent]);

  const abort = useCallback(() => {
    agentRef.current?.abort();
  }, []);

  return {
    ...state,
    streamingText,
    activeModel,
    sendMessage,
    abort,
    addSystemMessage: useCallback((msg: string) => {
      const agent = getAgent();
      agent.addSystemMessage(msg);
      setState((prev) => ({ ...prev, messages: agent.getMessages() }));
    }, [getAgent]),
    clearMessages: useCallback(() => {
      const agent = getAgent();
      agent.clearHistory();
      setState((prev) => ({ ...prev, messages: agent.getMessages(), tokensUsed: 0 }));
    }, [getAgent]),
    switchModel: useCallback((provider: ProviderName, modelId: string) => {
      const agent = getAgent();
      agent.switchModel(provider, modelId);
      setState((prev) => ({ ...prev }));
    }, [getAgent]),
    switchMode: useCallback((mode: AgentMode) => {
      const agent = getAgent();
      agent.switchMode(mode);
      setState((prev) => ({ ...prev, mode }));
    }, [getAgent]),
    getMode: useCallback(() => {
      const agent = getAgent();
      return agent.getMode();
    }, [getAgent]),
    openModelPicker: useCallback(() => {
      setState((prev) => ({ ...prev, isPickingModel: true }));
    }, []),
    closeModelPicker: useCallback(() => {
      setState((prev) => ({ ...prev, isPickingModel: false }));
    }, []),
    attachFile: useCallback(async (filePath: string) => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const truncated = content.length > 50_000 ? content.slice(0, 50_000) + '\n... [truncated]' : content;
        const entry = { path: filePath, content: truncated };
        attachedFilesRef.current = [...attachedFilesRef.current, entry];
        setState(prev => ({ ...prev, attachedFiles: attachedFilesRef.current }));
        return true;
      } catch {
        return false;
      }
    }, []),
    clearAttachments: useCallback(() => {
      attachedFilesRef.current = [];
      setState(prev => ({ ...prev, attachedFiles: [] }));
    }, []),
    loadHistory: useCallback((id: string) => {
      const agent = getAgent();
      const success = agent.loadHistory(id);
      if (success) {
        setState(prev => ({
          ...prev,
          messages: agent.getMessages(),
          tokensUsed: agent.getTokensUsed(),
        }));
      }
      return success;
    }, [getAgent]),
    renameConversation: useCallback((newTitle: string) => {
      return getAgent().renameConversation(newTitle);
    }, [getAgent]),
    compact: useCallback(async () => {
      const agent = getAgent();
      const result = await agent.compact();
      setState(prev => ({
        ...prev,
        messages: agent.getMessages(),
        tokensUsed: agent.getTokensUsed(),
      }));
      return result;
    }, [getAgent]),
    undo: useCallback(() => {
      return getAgent().undo();
    }, [getAgent]),
    redo: useCallback(() => {
      return getAgent().redo();
    }, [getAgent]),
    initProject: useCallback(async () => {
      return getAgent().initProject();
    }, [getAgent]),
  };
}
