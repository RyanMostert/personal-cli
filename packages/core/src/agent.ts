import { streamText } from 'ai';
import { generateId, type Message, type StreamEvent, type ActiveModel } from '@personal-cli/shared';
import { APP_NAME, APP_VERSION, DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';
import { ProviderManager } from './providers/manager.js';

const DEFAULT_SYSTEM_PROMPT = `You are ${APP_NAME} v${APP_VERSION}, a powerful AI assistant for software engineers.

You help with coding tasks, debugging, code review, architecture decisions, and general software engineering questions.
You have access to the user's project files and can read, write, and edit them.
You are direct, precise, and prefer concrete solutions over theoretical discussions.
When writing code, match the style and conventions of the existing codebase.`;

export interface AgentOptions {
  providerManager: ProviderManager;
  systemPrompt?: string;
  tokenBudget?: number;
}

export class Agent {
  private messages: Message[] = [];
  private providerManager: ProviderManager;
  private systemPrompt: string;
  private tokenBudget: number;
  private totalTokensUsed = 0;
  private totalCost = 0;

  constructor(options: AgentOptions) {
    this.providerManager = options.providerManager;
    this.systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    this.tokenBudget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
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

  clearHistory() {
    this.messages = [];
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
        maxOutputTokens: Math.min(8192, this.tokenBudget - this.totalTokensUsed),
      });

      let fullText = '';

      for await (const delta of result.textStream) {
        fullText += delta;
        yield { type: 'text-delta', delta };
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
