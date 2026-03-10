import { useState, useCallback, useRef } from 'react';
import {
  Agent,
  ProviderManager,
  loadConfig,
  getDefaultModel,
  loadSettings,
  addRecentModel,
  saveSettings,
} from '@personal-cli/core';
import type {
  Message,
  StreamEvent,
  ToolCallInfo,
  AgentMode,
  ProviderName,
  Attachment,
  TodoItem,
} from '@personal-cli/shared';
import { DEFAULT_TOKEN_BUDGET, loadAttachment } from '@personal-cli/shared';
import type { PendingPermission } from '../components/PermissionPrompt.js';
import type { PendingQuestion } from '../components/QuestionPrompt.js';
import { promises as fs } from 'fs';
import { error } from 'console';

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
  attachedFiles: Attachment[];
  mode: AgentMode;
  todos: TodoItem[];
}

export function useAgent() {
  const agentRef = useRef<Agent | null>(null);
  const attachedFilesRef = useRef<Attachment[]>([]);

  // Split streamingText and streamingThought into isolated state to prevent re-renders of the main state tree
  const [streamingText, setStreamingText] = useState('');
  const [streamingThought, setStreamingThought] = useState('');

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
    todos: [],
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
      const settings = loadSettings();
      const { provider, modelId } = getDefaultModel(config, settings);

      const manager = new ProviderManager({
        provider: provider as ConstructorParameters<typeof ProviderManager>[0]['provider'],
        modelId,
      });

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

  const sendMessage = useCallback(
    async (content: string) => {
      const agent = getAgent();
      // Read from ref — avoids stale closure since useCallback deps don't include state
      const currentAttachedFiles = attachedFilesRef.current;
      attachedFilesRef.current = [];

      setStreamingText('');
      setStreamingThought('');
      setState((prev) => ({
        ...prev,
        isStreaming: true,
        error: null,
        toolCalls: [],
        attachedFiles: [],
      }));

      // Buffer streaming text and flush at most every 80ms to reduce Ink repaints
      // When PERSONAL_CLI_STREAMING_POC is set, reduce flush delay for a lower-latency prototype
      const streamingPOC = !!process.env.PERSONAL_CLI_STREAMING_POC;
      const flushDelay = streamingPOC ? Number(process.env.PERSONAL_CLI_STREAMING_POC) || 30 : 80;

      let textBuf = '';
      let thoughtBuf = '';
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const flush = () => {
        if (textBuf) {
          setStreamingText((prev) => prev + textBuf);
          textBuf = '';
        }
        if (thoughtBuf) {
          setStreamingThought((prev) => prev + thoughtBuf);
          thoughtBuf = '';
        }
        flushTimer = null;
      };

      try {
        const stream = agent.sendMessage(content, currentAttachedFiles);

        // Update state immediately so the user message (and any context messages) are visible
        setState((prev) => ({
          ...prev,
          messages: [...agent.getMessages()],
        }));

        for await (const event of stream) {
          switch (event.type) {
            case 'text-delta':
              if (event.delta) {
                textBuf += event.delta;
                if (!flushTimer) flushTimer = setTimeout(flush, flushDelay);
              }
              break;
            case 'thought-delta':
              if (event.delta) {
                thoughtBuf += event.delta;
                if (!flushTimer) flushTimer = setTimeout(flush, flushDelay);
              }
              break;
            case 'tool-call-start': {
              const toolCall = event.toolCall!;
              const isEditFile = toolCall.toolName === 'edit_file';

              setState((prev) => ({
                ...prev,
                toolCalls: [
                  ...prev.toolCalls,
                  {
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    args: toolCall.args,
                    // Capture oldText/newText for edit_file to show diff
                    ...(isEditFile && {
                      path: toolCall.args?.path as string,
                      oldText: toolCall.args?.oldText as string,
                      newText: toolCall.args?.newText as string,
                    }),
                  },
                ],
              }));
              break;
            }
            case 'tool-call-result':
              setState((prev) => ({
                ...prev,
                toolCalls: prev.toolCalls.map((tc) =>
                  tc.toolCallId === event.toolCall!.toolCallId
                    ? { ...tc, result: event.toolCall!.result }
                    : tc,
                ),
              }));
              break;
            case 'system':
              if (event.message) {
                agent.addSystemMessage(event.message);
                setState((prev) => ({ ...prev, messages: [...agent.getMessages()] }));
              }
              break;
            case 'todo-update':
              if (event.todos) {
                setState((prev) => ({ ...prev, todos: event.todos! }));
              }
              break;
            case 'error':
              throw event.error;
          }
        }

        // Flush any remaining buffered text before clearing streaming state
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        if (textBuf) {
          setStreamingText((prev) => prev + textBuf);
          textBuf = '';
        }
        if (thoughtBuf) {
          setStreamingThought((prev) => prev + thoughtBuf);
          thoughtBuf = '';
        }

        // Stream completed (normal finish or after abort) — always runs
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          messages: [...agent.getMessages()],
          tokensUsed: agent.getTokensUsed(),
          cost: agent.getCost(),
          toolCalls: [],
        }));
        setStreamingText('');
        setStreamingThought('');
      } catch (err) {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        setStreamingText('');
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          toolCalls: [],
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [getAgent],
  );

  const abort = useCallback(() => {
    agentRef.current?.abort();
  }, []);

  return {
    ...state,
    streamingText,
    streamingThought,
    activeModel,
    sendMessage,
    abort,
    addSystemMessage: useCallback(
      (msg: string) => {
        const agent = getAgent();
        agent.addSystemMessage(msg);
        setState((prev) => ({ ...prev, messages: [...agent.getMessages()] }));
      },
      [getAgent],
    ),
    clearMessages: useCallback(() => {
      const agent = getAgent();
      agent.clearHistory();
      setState((prev) => ({ ...prev, messages: [...agent.getMessages()], tokensUsed: 0 }));
    }, [getAgent]),
    switchModel: useCallback(
      (provider: ProviderName, modelId: string) => {
        const agent = getAgent();
        agent.switchModel(provider, modelId);
        // Record as recent and persist last-used provider so next startup selects the same provider
        try {
          addRecentModel(provider, modelId);
          // Persist provider, model, and update per-provider lastUsedModels map
          try {
            const current = loadSettings();
            const lastUsedModels = { ...(current.lastUsedModels ?? {}), [provider]: modelId };
            saveSettings({ defaultProvider: provider, defaultModel: modelId, lastUsedModels });
          } catch (err) {
            // Log errors so failures are visible in logs but don't disrupt the UI
            try {
              // eslint-disable-next-line no-console
              console.error('Failed to persist model selection', err);
            } catch {
              error('Failed to persist model selection and log the error');
            }
          }
        } catch (err) {
          try {
            // eslint-disable-next-line no-console
            console.error('Failed to record recent model', err);
          } catch {
            error('Failed to record recent model and log the error');
          }
        }
        setState((prev) => ({ ...prev }));
      },
      [getAgent],
    ),
    switchMode: useCallback(
      (mode: AgentMode) => {
        const agent = getAgent();
        agent.switchMode(mode);
        setState((prev) => ({ ...prev, mode }));
      },
      [getAgent],
    ),
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
      const attachment = loadAttachment(filePath);
      if (attachment) {
        attachedFilesRef.current = [...attachedFilesRef.current, attachment];
        setState((prev) => ({ ...prev, attachedFiles: attachedFilesRef.current }));
        return true;
      }
      return false;
    }, []),
    clearAttachments: useCallback(() => {
      attachedFilesRef.current = [];
      setState((prev) => ({ ...prev, attachedFiles: [] }));
    }, []),
    loadHistory: useCallback(
      (id: string) => {
        const agent = getAgent();
        const success = agent.loadHistory(id);
        if (success) {
          setState((prev) => ({
            ...prev,
            messages: [...agent.getMessages()],
            tokensUsed: agent.getTokensUsed(),
          }));
        }
        return success;
      },
      [getAgent],
    ),
    renameConversation: useCallback(
      (newTitle: string) => {
        return getAgent().renameConversation(newTitle);
      },
      [getAgent],
    ),
    compact: useCallback(async () => {
      const agent = getAgent();
      const result = await agent.compact();
      setState((prev) => ({
        ...prev,
        messages: [...agent.getMessages()],
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
    synthesizeAnswer: useCallback(
      async (topic: string) => {
        return getAgent().synthesizeAnswer(topic);
      },
      [getAgent],
    ),
    getTools: useCallback(() => {
      return getAgent().getTools();
    }, [getAgent]),
    loadPlugins: useCallback(async () => {
      return getAgent().getLoadedPlugins();
    }, [getAgent]),
    saveWorkspace: useCallback(
      (path: string) => {
        getAgent().saveWorkspace(path, state.attachedFiles);
      },
      [getAgent, state.attachedFiles],
    ),
    loadWorkspace: useCallback(
      (path: string) => {
        const agent = getAgent();
        const attachments = agent.loadWorkspace(path);
        if (attachments) {
          attachedFilesRef.current = attachments;
          setState((prev) => ({
            ...prev,
            messages: [...agent.getMessages()],
            tokensUsed: agent.getTokensUsed(),
            cost: agent.getCost(),
            attachedFiles: attachments,
          }));
        }
      },
      [getAgent],
    ),
  };
}
