import { streamText } from 'ai';
import { generateId, type Message, type StreamEvent, type ActiveModel, type AgentMode, getModelEntry } from '@personal-cli/shared';
import { APP_NAME, APP_VERSION, DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';
import { ProviderManager } from './providers/manager.js';
import { saveConversation, loadConversation } from './persistence/conversations.js';

const DEFAULT_SYSTEM_PROMPT = `You are ${APP_NAME} v${APP_VERSION}, a powerful AI assistant.

## Tool use — always prefer action over explanation
- When the user asks for information you don't have, USE your tools immediately. Do NOT say "I can't" or ask for a URL — figure it out yourself.
- For web requests: construct the most appropriate URL from context and call webFetch without asking. For example:
  - "steam latest games" → fetch https://store.steampowered.com/api/featured/ or https://store.steampowered.com/explore/new/
  - "news about X" → fetch a relevant URL you know
  - "search X" → fetch a search engine or relevant site
- For file tasks: read the relevant files before answering.
- For system info: run the appropriate command.
- Chain multiple tool calls in sequence when needed. Do not stop after one tool call if you need more data.
- Always return the actual results to the user — summarize and present what you found, not what you tried.

## Behaviour
- Be direct and concrete. Skip disclaimers about limitations unless a tool actually fails.
- If a tool returns an error or empty result, try an alternative URL or approach, then report what happened.
- For coding tasks: match the style and conventions of the existing codebase.`;

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

  async *sendMessage(userContent: string, attachedFiles?: Array<{ path: string; content: string }>): AsyncGenerator<StreamEvent> {
    // Build context block if files are attached
    const contextBlock = attachedFiles?.length
      ? `<context>\n${attachedFiles.map(f => `<file path="${f.path}">\n${f.content}\n</file>`).join('\n')}\n</context>\n\n`
      : '';
    const fullContent = contextBlock + userContent;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: fullContent,
      timestamp: Date.now(),
    };
    this.messages.push(userMessage);

    const model = await this.providerManager.getModel();
    const apiMessages = this.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Declare outside try so catch can silence dangling promises
    const result = streamText({
      model,
      system: this.systemPrompt,
      messages: apiMessages,
      tools: this.tools,
      maxSteps: this.maxSteps,
      maxOutputTokens: Math.min(8192, this.tokenBudget - this.totalTokensUsed),
    } as any);

    try {
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

      // Calculate cost based on model pricing
      const entry = getModelEntry(this.providerManager.getActiveModel().provider, this.providerManager.getActiveModel().modelId);
      if (entry?.inputCostPer1M != null) {
        this.totalCost += (promptTokens / 1_000_000) * entry.inputCostPer1M;
      }
      if (entry?.outputCostPer1M != null) {
        this.totalCost += (completionTokens / 1_000_000) * entry.outputCostPer1M;
      }

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

      // Save conversation — pass userContent as title so context blocks don't corrupt it
      try { saveConversation(this.messages, this.providerManager.getActiveModel(), userContent); } catch {}
    } catch (err) {
      // Silence result.usage — it rejects when fullStream throws, causing an unhandled rejection
      // that Node.js would dump to stderr before Ink can render the error cleanly.
      Promise.resolve(result.usage).catch(() => {});
      this.messages.pop();
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  loadHistory(id: string): boolean {
    const saved = loadConversation(id);
    if (!saved) return false;
    this.messages = saved.messages;
    return true;
  }

  async compact(): Promise<string> {
    if (this.messages.length < 2) {
      return 'Not enough messages to compact.';
    }

    const summaryPrompt = 'Please summarize the conversation so far into a concise recap. Focus on key decisions, code changes, and important information. Keep it brief but comprehensive.';
    
    const model = await this.providerManager.getModel();
    const apiMessages = [
      ...this.messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: summaryPrompt }
    ];

    const result = streamText({
      model,
      system: this.systemPrompt,
      messages: apiMessages,
      maxOutputTokens: 1024,
    } as any);

    let summary = '';
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        summary += part.text;
      }
    }

    // Replace all messages with a single summary message
    this.messages = [{
      id: generateId(),
      role: 'assistant',
      content: `**Conversation Summary:**\n\n${summary}`,
      timestamp: Date.now(),
    }];

    return 'Conversation compacted successfully.';
  }
}
