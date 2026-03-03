import { streamText, type ModelMessage } from 'ai';
import { generateId, type Message, type StreamEvent, type ActiveModel, type AgentMode, type ProviderName, getModelEntry } from '@personal-cli/shared';
import { DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';
import { ProviderManager } from './providers/manager.js';
import { saveConversation, loadConversation } from './persistence/conversations.js';
import { createTools, type PermissionCallback } from '@personal-cli/tools';
import { DEFAULT_SYSTEM_PROMPT } from './prompts/default.js';
import { generateTitle } from './agent/title.js';
import { COMPACTION_PROMPT } from './prompts/compaction.js'; export interface AgentOptions {
  providerManager: ProviderManager;
  mode?: AgentMode;
  permissionFn?: PermissionCallback;
  maxSteps?: number;
  systemPrompt?: string;
  tokenBudget?: number;
}

export class Agent {
  private messages: Message[] = [];
  private coreMessages: ModelMessage[] = [];
  private providerManager: ProviderManager;
  private systemPrompt: string;
  private tokenBudget: number;
  private tools: Record<string, any>;
  private maxSteps: number;
  private totalTokensUsed = 0;
  private totalCost = 0;
  private mode: AgentMode = 'ask';
  private permissionFn?: PermissionCallback;
  private conversationTitle?: string;
  private currentAbortController: AbortController | null = null;

  constructor(options: AgentOptions) {
    this.providerManager = options.providerManager;
    this.systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    this.tokenBudget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
    this.mode = options.mode ?? 'ask';
    this.permissionFn = options.permissionFn;
    this.tools = createTools(this.mode, this.permissionFn);
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

  switchModel(provider: ProviderName, modelId: string) {
    this.providerManager.switchModel(provider, modelId);
  }

  switchMode(mode: AgentMode) {
    this.mode = mode;
    this.tools = createTools(this.mode, this.permissionFn);
  }

  abort(): void {
    this.currentAbortController?.abort();
  }

  getMode(): AgentMode {
    return this.mode;
  }

  clearHistory() {
    this.messages = [];
    this.coreMessages = [];
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

    // Add user message to coreMessages
    this.coreMessages.push({ role: 'user', content: fullContent });

    const model = await this.providerManager.getModel();
    const apiMessages = this.coreMessages;

    this.currentAbortController = new AbortController();

    // Declare outside try so catch can silence dangling promises
    const result = streamText({
      model,
      system: this.systemPrompt,
      messages: apiMessages,
      tools: this.tools,
      maxSteps: this.maxSteps,
      maxOutputTokens: Math.min(8192, this.tokenBudget - this.totalTokensUsed),
      abortSignal: this.currentAbortController.signal,
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

      // Capture response messages from this streamText call (tool-call/result + assistant)
      const response = await result.response;
      for (const msg of response.messages) {
        this.coreMessages.push(msg);
      }

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

      // First assistant response — generate title async (don't await, don't block)
      if (this.messages.filter(m => m.role === 'assistant').length === 1) {
        generateTitle(userContent, fullText, model).then(title => {
          this.conversationTitle = title;
          // Re-save with the new title
          try { saveConversation(this.messages, this.providerManager.getActiveModel(), userContent, this.conversationTitle); } catch { }
        });
      }

      yield {
        type: 'finish',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      };

      // Save conversation
      try { saveConversation(this.messages, this.providerManager.getActiveModel(), userContent, this.conversationTitle); } catch { }
    } catch (err) {
      // AbortError is not a real error — it's user-initiated
      if (err instanceof Error && err.name === 'AbortError') {
        yield { type: 'finish', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        return;
      }
      // Silence result.usage — it rejects when fullStream throws, causing an unhandled rejection
      // that Node.js would dump to stderr before Ink can render the error cleanly.
      Promise.resolve(result.usage).catch(() => { });
      this.messages.pop();
      this.coreMessages.pop(); // also remove the user message added at the start
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
    } finally {
      this.currentAbortController = null;
    }
  }

  loadHistory(id: string): boolean {
    const saved = loadConversation(id);
    if (!saved) return false;
    this.messages = saved.messages;
    // Rebuild coreMessages from plain text messages (tool-call/result lost)
    this.coreMessages = this.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    return true;
  }

  async compact(): Promise<string> {
    if (this.messages.length < 2) {
      return 'Not enough messages to compact.';
    }
    const model = await this.providerManager.getModel();
    const apiMessages = [
      ...this.messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: COMPACTION_PROMPT }
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
    this.coreMessages = [{ role: 'assistant', content: `**Conversation Summary:**\n\n${summary}` }];

    return 'Conversation compacted successfully.';
  }
}
