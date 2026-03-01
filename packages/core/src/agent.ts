import { streamText } from 'ai';
import { generateId, type Message, type StreamEvent, type ActiveModel, type AgentMode } from '@personal-cli/shared';
import { APP_NAME, APP_VERSION, DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';
import { ProviderManager } from './providers/manager.js';

const DEFAULT_SYSTEM_PROMPT = `You are ${APP_NAME} v${APP_VERSION}, a powerful AI assistant for software engineers.

You help with coding tasks, debugging, code review, architecture decisions, and general software engineering questions.
You have access to the user's project files and can read, write, and edit them.
You are direct, precise, and prefer concrete solutions over theoretical discussions.
When writing code, match the style and conventions of the existing codebase.`;

export interface AgentOptions {
  providerManager: ProviderManager;
  tools?: Record<string, any>;
  maxSteps?: number;
  systemPrompt?: string;
  tokenBudget?: number;
}

export class Agent {
  private messages: Message[] = [];
  private providerManager: ProviderManager;
  private systemPrompt: string;
  private tokenBudget: number;
  private tools: Record<string, any>;
  private maxSteps: number;
  private totalTokensUsed = 0;
  private totalCost = 0;
  private mode: AgentMode = 'ask';

  constructor(options: AgentOptions) {
    this.providerManager = options.providerManager;
    this.systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    this.tokenBudget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
    this.tools = options.tools ?? {};
    this.maxSteps = options.maxSteps ?? 20;
  }

  getMessages(): Message[] {
    return this.messages;
  }

  getActiveModel(): ActiveModel {
    return this.providerManager.getActiveModel();
  }

  getTokensUsed(): number {
    return this.totalTokensUsed;
  }

  getCost(): number {
    return this.totalCost;
  }

  switchModel(provider: string, modelId: string) {
    this.providerManager.switchModel(provider as any, modelId);
  }

  switchMode(mode: AgentMode) {
    this.mode = mode;
  }

  getMode(): AgentMode {
    return this.mode;
  }

  clearHistory() {
    this.messages = [];
  }

  addSystemMessage(content: string) {
    this.messages.push({
      id: generateId(),
      role: 'system',
      content,
      timestamp: Date.now(),
    });
  }

  async *sendMessage(userContent: string): AsyncGenerator<StreamEvent> {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
    };
    this.messages.push(userMessage);

    const model = this.providerManager.getModel();
    const apiMessages = this.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    try {
      const result = streamText({
        model,
        system: this.systemPrompt,
        messages: apiMessages,
        tools: this.tools,
        maxSteps: this.maxSteps, // multi-step loop
        maxOutputTokens: Math.min(8192, this.tokenBudget - this.totalTokensUsed),
      } as any);

      let fullText = '';

      for await (const part of result.fullStream) {
        switch (part.type) {
          case 'text-delta':
            fullText += part.text;
            yield { type: 'text-delta', delta: part.text };
            break;

          case 'tool-call':
            yield {
              type: 'tool-call-start',
              toolCall: {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args: ('args' in part ? part.args : (part as any).input) as Record<string, unknown>,
              },
            };
            break;

          case 'tool-result':
            yield {
              type: 'tool-call-result',
              toolCall: {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                result: ('result' in part ? part.result : (part as any).output),
              },
            };
            break;

          case 'error':
            throw part.error;
        }
      }

      const usage = await result.usage;
      const promptTokens = usage.inputTokens ?? 0;
      const completionTokens = usage.outputTokens ?? 0;
      this.totalTokensUsed += promptTokens + completionTokens;

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: fullText,
        timestamp: Date.now(),
      };
      this.messages.push(assistantMessage);

      yield {
        type: 'finish',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      };
    } catch (err) {
      // Remove the user message on error so conversation stays consistent
      this.messages.pop();
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
