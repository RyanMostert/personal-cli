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

    // Inject project context from various hint files if present
    let base = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const projectHints: string[] = [];
    const hintFiles = ['.pcli-hints', 'AGENTS.md', 'CONTEXT.md', 'INSTRUCTIONS.md', '.goosehints', '.cursorrules'];
    
    for (const file of hintFiles) {
      const p = join(process.cwd(), file);
      if (existsSync(p)) {
        try {
          const content = readFileSync(p, 'utf-8').trim();
          projectHints.push(`### Source: ${file}\n${content}`);
        } catch { }
      }
    }

    if (projectHints.length > 0) {
      base = `# Project Context & Guidelines\n\n${projectHints.join('\n\n')}\n\n---\n\n${base}`;
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

  getTools(): Array<{ name: string; description?: string }> {
    return Object.entries(this.tools).map(([name, tool]) => ({
      name,
      description: (tool as any).description,
    }));
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

    const prompt = `Analyze the following project and write a concise AGENTS.md file. This file will be prepended to the AI assistant's system prompt on every session, so make it useful: include what the project is, its tech stack, key directories/files, important conventions, and anything an AI coding assistant should know before touching the code.\n\nProject files: ${listing}\n\n${pkgJson ? `package.json (truncated):\n${pkgJson}` : ''}\n\nWrite AGENTS.md content only — no markdown code fences, no preamble. Start directly with a heading.`;

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

    // Auto-compact when token usage crosses 85% of budget
    if (this.totalTokensUsed > this.tokenBudget * 0.85) {
      await this.compact();
      yield { type: 'system', message: 'Context auto-compacted to stay within token budget.' };
    }

    // Add user message to coreMessages
    this.coreMessages.push({ role: 'user', content: fullContent });

    const model = await this.providerManager.getModel();
    const apiMessages = this.coreMessages;

    this.currentAbortController = new AbortController();

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
      let rawText = '';
      let thoughtText = '';
      const allToolCalls: Record<string, any> = {};
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;

      // Thought parser state machine
      let buffer = '';
      let inThought = false;

      // Stream timeout to prevent stalling
      const streamTimeout = setTimeout(() => {
        this.currentAbortController?.abort();
      }, 5 * 60 * 1000);

      try {
        for await (const part of result.fullStream) {
          switch (part.type) {
            case 'text-delta': {
              const text = part.text;
              buffer += text;
              
              while (buffer.length > 0) {
                if (inThought) {
                  const closeIdx = buffer.indexOf('</thought>');
                  if (closeIdx !== -1) {
                    const thought = buffer.slice(0, closeIdx);
                    if (thought) {
                      thoughtText += thought;
                      yield { type: 'thought-delta', delta: thought };
                    }
                    buffer = buffer.slice(closeIdx + 10);
                    inThought = false;
                  } else {
                    // Check if the buffer ends with a partial closing tag
                    const partialIdx = buffer.lastIndexOf('</');
                    if (partialIdx !== -1 && '</thought>'.startsWith(buffer.slice(partialIdx))) {
                      const thought = buffer.slice(0, partialIdx);
                      if (thought) {
                        thoughtText += thought;
                        yield { type: 'thought-delta', delta: thought };
                      }
                      buffer = buffer.slice(partialIdx);
                      break; // Wait for more data
                    } else {
                      thoughtText += buffer;
                      yield { type: 'thought-delta', delta: buffer };
                      buffer = '';
                    }
                  }
                } else {
                  const openIdx = buffer.indexOf('<thought>');
                  if (openIdx !== -1) {
                    const beforeText = buffer.slice(0, openIdx);
                    if (beforeText) {
                      rawText += beforeText;
                      yield { type: 'text-delta', delta: beforeText };
                    }
                    buffer = buffer.slice(openIdx + 9);
                    inThought = true;
                  } else {
                    // Check if the buffer ends with a partial opening tag
                    const partialIdx = buffer.lastIndexOf('<');
                    if (partialIdx !== -1 && '<thought>'.startsWith(buffer.slice(partialIdx))) {
                      const beforeText = buffer.slice(0, partialIdx);
                      if (beforeText) {
                        rawText += beforeText;
                        yield { type: 'text-delta', delta: beforeText };
                      }
                      buffer = buffer.slice(partialIdx);
                      break; // Wait for more data
                    } else {
                      rawText += buffer;
                      yield { type: 'text-delta', delta: buffer };
                      buffer = '';
                    }
                  }
                }
              }
              break;
            }

            case 'reasoning-delta': {
              const rText = (part as any).reasoning || (part as any).text || '';
              thoughtText += rText;
              yield { type: 'thought-delta', delta: rText };
              break;
            }

            case 'tool-call': {
              const toolName = part.toolName;
              const args = ('args' in part ? part.args : (part as any).input) as Record<string, unknown>;

              allToolCalls[part.toolCallId] = {
                toolCallId: part.toolCallId,
                toolName: toolName,
                args: args,
              };
              yield {
                type: 'tool-call-start',
                toolCall: allToolCalls[part.toolCallId],
              };
              break;
            }

            case 'tool-result': {
              if (allToolCalls[part.toolCallId]) {
                allToolCalls[part.toolCallId].result = ('result' in part ? part.result : (part as any).output);
              }
              yield {
                type: 'tool-call-result',
                toolCall: {
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  result: ('result' in part ? part.result : (part as any).output),
                },
              };
              break;
            }

            case 'error':
              throw part.error;

            default: {
              if ((part as any).type === 'step-finish') {
                const p = part as any;
                if (p.usage) {
                  totalPromptTokens += p.usage.promptTokens ?? 0;
                  totalCompletionTokens += p.usage.completionTokens ?? 0;
                }
              }
              break;
            }
          }
        }
      } finally {
        clearTimeout(streamTimeout);
      }

      this.totalTokensUsed += totalPromptTokens + totalCompletionTokens;

      const response = await result.response;
      for (const msg of response.messages) {
        this.coreMessages.push(msg);
      }

      const entry = getModelEntry(this.providerManager.getActiveModel().provider, this.providerManager.getActiveModel().modelId);
      if (entry?.inputCostPer1M != null) {
        this.totalCost += (totalPromptTokens / 1_000_000) * entry.inputCostPer1M;
      }
      if (entry?.outputCostPer1M != null) {
        this.totalCost += (totalCompletionTokens / 1_000_000) * entry.outputCostPer1M;
      }

      // Final cleanup of rawText to ensure tags are stripped for history
      const finalContent = rawText.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim();

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: finalContent,
        thought: thoughtText || undefined,
        toolCalls: Object.values(allToolCalls),
        timestamp: Date.now(),
      };
      this.messages.push(assistantMessage);

      if (this.messages.filter(m => m.role === 'assistant').length === 1) {
        generateTitle(userContent, finalContent, model).then(title => {
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
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          totalTokens: totalPromptTokens + totalCompletionTokens,
        },
      };

      try {
        const id = saveConversation(this.messages, this.providerManager.getActiveModel(), userContent, this.conversationTitle, this.conversationId);
        if (!this.conversationId) this.conversationId = id;
      } catch { }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        yield { type: 'finish', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        return;
      }
      Promise.resolve(result.usage).catch(() => { });
      this.messages.pop();
      this.coreMessages.pop();
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
    } finally {
      this.currentAbortController = null;
    }
  }

  loadHistory(id: string): boolean {
    const saved = loadConversation(id);
    if (!saved) return false;
    this.messages = saved.messages;
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
