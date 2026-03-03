import { streamText, type ModelMessage } from 'ai';
import { generateId, type Message, type StreamEvent, type ActiveModel, type AgentMode, type ProviderName, getModelEntry } from '@personal-cli/shared';
import { DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';
import { ProviderManager } from './providers/manager.js';
import { saveConversation, loadConversation, renameConversation as persistRename } from './persistence/conversations.js';
import { createTools, type PermissionCallback, type QuestionCallback } from '@personal-cli/tools';
import { DEFAULT_SYSTEM_PROMPT } from './prompts/default.js';
import { generateTitle } from './agent/title.js';
import { COMPACTION_PROMPT } from './prompts/compaction.js';
import { UndoStack } from './persistence/undo-stack.js';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface AgentOptions {
  providerManager: ProviderManager;
  mode?: AgentMode;
  permissionFn?: PermissionCallback;
  questionFn?: QuestionCallback;
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
  private conversationId?: string;
  private currentAbortController: AbortController | null = null;
  private undoStack = new UndoStack();
  private questionFn?: QuestionCallback;

  constructor(options: AgentOptions) {
    this.providerManager = options.providerManager;
    this.tokenBudget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
    this.mode = options.mode ?? 'ask';
    this.permissionFn = options.permissionFn;
    this.questionFn = options.questionFn;
    this.maxSteps = options.maxSteps ?? 20;

    // Inject AGENTS.md project context if present in the working directory
    let base = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const agentsMdPath = join(process.cwd(), 'AGENTS.md');
    if (existsSync(agentsMdPath)) {
      try {
        const agentsMd = readFileSync(agentsMdPath, 'utf-8').trim();
        base = `# Project Context\n\n${agentsMd}\n\n---\n\n${base}`;
      } catch { }
    }
    this.systemPrompt = base;

    this.tools = this.buildTools();
  }

  private buildTools() {
    return createTools(this.mode, this.permissionFn, {
      onWrite: (path, before, after) => {
        if (before !== null) this.undoStack.push({ path, before, after });
      },
      questionFn: this.questionFn,
    });
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
    this.tools = this.buildTools();
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
    this.conversationId = undefined;
    this.conversationTitle = undefined;
    this.undoStack.clear();
  }

  undo(): string {
    const result = this.undoStack.undo();
    if (!result) return 'Nothing to undo.';
    return `Undid change to ${result.path}`;
  }

  redo(): string {
    const result = this.undoStack.redo();
    if (!result) return 'Nothing to redo.';
    return `Redid change to ${result.path}`;
  }

  async initProject(): Promise<string> {
    const cwd = process.cwd();
    const outputPath = join(cwd, 'AGENTS.md');

    // Gather lightweight project context
    let listing = '';
    try {
      listing = readdirSync(cwd).slice(0, 30).join(', ');
    } catch { }

    let pkgJson = '';
    try {
      const p = join(cwd, 'package.json');
      if (existsSync(p)) pkgJson = readFileSync(p, 'utf-8').slice(0, 1000);
    } catch { }

    const prompt = `Analyze the following project and write a concise AGENTS.md file. This file will be prepended to the AI assistant's system prompt on every session, so make it useful: include what the project is, its tech stack, key directories/files, important conventions, and anything an AI coding assistant should know before touching the code.

Project files: ${listing}

${pkgJson ? `package.json (truncated):\n${pkgJson}` : ''}

Write AGENTS.md content only — no markdown code fences, no preamble. Start directly with a heading.`;

    const model = await this.providerManager.getModel();
    const result = streamText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 1024,
    } as any);

    let content = '';
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') content += part.text;
    }

    writeFileSync(outputPath, content.trim(), 'utf-8');

    // Load into current session immediately
    const agentsMd = content.trim();
    this.systemPrompt = `# Project Context\n\n${agentsMd}\n\n---\n\n${DEFAULT_SYSTEM_PROMPT}`;

    return `AGENTS.md created at ${outputPath} and loaded into system prompt.`;
  }

  renameConversation(newTitle: string): boolean {
    if (!this.conversationId) return false;
    this.conversationTitle = newTitle;
    return persistRename(this.conversationId, newTitle);
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

    // Auto-compact when token usage crosses 85% of budget
    if (this.totalTokensUsed > this.tokenBudget * 0.85) {
      await this.compact();
      yield { type: 'system', message: 'Context auto-compacted to stay within token budget.' };
    }

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
          try {
            const id = saveConversation(this.messages, this.providerManager.getActiveModel(), userContent, this.conversationTitle, this.conversationId);
            if (!this.conversationId) this.conversationId = id;
          } catch { }
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

      // Save conversation (reuse same file via conversationId)
      try {
        const id = saveConversation(this.messages, this.providerManager.getActiveModel(), userContent, this.conversationTitle, this.conversationId);
        if (!this.conversationId) this.conversationId = id;
      } catch { }
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
