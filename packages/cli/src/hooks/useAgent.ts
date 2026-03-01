import { useState, useCallback, useRef } from 'react';
import { Agent, ProviderManager, loadConfig, getDefaultModel } from '@personal-cli/core';
import type { Message, StreamEvent, ToolCallInfo } from '@personal-cli/shared';
import { DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';
import { createTools } from '@personal-cli/tools';
import type { PendingPermission } from '../components/PermissionPrompt.js';

interface AgentState {
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  tokensUsed: number;
  toolCalls: ToolCallInfo[];
  pendingPermission: PendingPermission | null;
  error: string | null;
}

export function useAgent() {
  const agentRef = useRef<Agent | null>(null);

  const [state, setState] = useState<AgentState>({
    messages: [],
    isStreaming: false,
    streamingText: '',
    tokensUsed: 0,
    toolCalls: [],
    pendingPermission: null,
    error: null,
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

  const getAgent = useCallback((): Agent => {
    if (!agentRef.current) {
      const config = loadConfig();
      const { provider, modelId } = getDefaultModel(config);

      const manager = new ProviderManager({
        provider: provider as ConstructorParameters<typeof ProviderManager>[0]['provider'],
        modelId,
      });

      agentRef.current = new Agent({
        providerManager: manager,
        tokenBudget: DEFAULT_TOKEN_BUDGET,
        tools: createTools(permissionCallback),
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

    setState((prev) => ({
      ...prev,
      isStreaming: true,
      streamingText: '',
      toolCalls: [],
      error: null,
    }));

    try {
      const stream = agent.sendMessage(content);

      for await (const event of stream) {
        if (event.type === 'text-delta' && event.delta) {
          setState((prev) => ({
            ...prev,
            streamingText: prev.streamingText + event.delta,
          }));
        } else if (event.type === 'tool-call-start' && event.toolCall) {
          setState((prev) => ({
            ...prev,
            toolCalls: [...prev.toolCalls, event.toolCall!],
          }));
        } else if (event.type === 'tool-call-result' && event.toolCall) {
          setState((prev) => ({
            ...prev,
            toolCalls: prev.toolCalls.map((tc) =>
              tc.toolCallId === event.toolCall!.toolCallId ? event.toolCall! : tc
            ),
          }));
        } else if (event.type === 'finish') {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            streamingText: '',
            messages: agent.getMessages(),
            tokensUsed: agent.getTokensUsed(),
          }));
        } else if (event.type === 'error') {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            streamingText: '',
            error: event.error?.message ?? 'Unknown error',
          }));
        }
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        streamingText: '',
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [getAgent]);

  return {
    ...state,
    activeModel,
    sendMessage,
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
    switchModel: useCallback((provider: string, modelId: string) => {
      const agent = getAgent();
      agent.switchModel(provider, modelId);
      setState((prev) => ({ ...prev }));
    }, [getAgent]),
    switchMode: useCallback((mode: string) => {
      const agent = getAgent();
      agent.switchMode(mode);
      setState((prev) => ({ ...prev }));
    }, [getAgent]),
  };
}
