import { useState, useCallback, useRef } from 'react';
import { Agent, ProviderManager, loadConfig, getDefaultModel } from '@personal-cli/core';
import type { Message, StreamEvent } from '@personal-cli/shared';
import { DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';

interface AgentState {
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  tokensUsed: number;
  error: string | null;
}

export function useAgent() {
  const agentRef = useRef<Agent | null>(null);

  const [state, setState] = useState<AgentState>({
    messages: [],
    isStreaming: false,
    streamingText: '',
    tokensUsed: 0,
    error: null,
  });

  function getAgent(): Agent {
    if (!agentRef.current) {
      const config = loadConfig();
      const { provider, modelId } = getDefaultModel(config);

      const manager = new ProviderManager({
        provider: provider as Parameters<typeof ProviderManager>[0]['provider'],
        modelId,
      });

      agentRef.current = new Agent({
        providerManager: manager,
        tokenBudget: DEFAULT_TOKEN_BUDGET,
      });
    }
    return agentRef.current;
  }

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
  }, []);

  return {
    ...state,
    activeModel,
    sendMessage,
  };
}
