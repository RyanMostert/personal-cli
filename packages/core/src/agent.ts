import { streamText, type ModelMessage } from 'ai';
import {
  generateId,
  type Message,
  type StreamEvent,
  type ActiveModel,
  type AgentMode,
  type ProviderName,
  getModelEntry,
  type Attachment,
  type TodoItem,
} from '@personal-cli/shared';
import { DEFAULT_TOKEN_BUDGET } from '@personal-cli/shared';
import { ProviderManager } from './providers/manager.js';
import {
  saveConversation,
  loadConversation,
  renameConversation as persistRename,
  saveWorkspace,
  loadWorkspace,
  type SavedWorkspace,
} from './persistence/conversations.js';
import {
  createTools,
<<<<<<< HEAD
=======
  type CreateToolsOptions,
>>>>>>> tools_improvement
  type PermissionCallback,
  type QuestionCallback,
  loadPlugins,
  type LoadedPlugin,
} from '@personal-cli/tools';
import { DEFAULT_SYSTEM_PROMPT } from './prompts/default.js';
import { generateTitle } from './agent/title.js';
import { COMPACTION_PROMPT } from './prompts/compaction.js';
import { UndoStack } from './persistence/undo-stack.js';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
<<<<<<< HEAD
import { ToolFallbackManager, createFallbackManager, type FallbackConfig } from './fallback/tool-fallback.js';
import { AgentEventTracker, createEventTracker, type AgentEvent } from './fallback/event-tracker.js';
import { parseStream } from './streaming-parser.js';
=======
import {
  ToolFallbackManager,
  createFallbackManager,
  type FallbackConfig,
} from './fallback/tool-fallback.js';
import {
  AgentEventTracker,
  createEventTracker,
  type AgentEvent,
} from './fallback/event-tracker.js';
import { parseStream } from './streaming-parser.js';
import { loadProjectHints, formatProjectHints } from './utils/project-hints.js';
import { buildTools as createToolsWithContext } from './utils/tools.js';
>>>>>>> tools_improvement

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
  private loadedPlugins: LoadedPlugin[] = [];
  private fallbackManager: ToolFallbackManager;
  private eventTracker: AgentEventTracker;
  private pendingTodoUpdates: TodoItem[] | null = null;

  constructor(options: AgentOptions & { fallbackConfig?: FallbackConfig }) {
    this.providerManager = options.providerManager;
    this.tokenBudget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
    this.mode = options.mode ?? 'ask';
    this.permissionFn = options.permissionFn;
    this.questionFn = options.questionFn;
    this.maxSteps = options.maxSteps ?? 20;
    this.fallbackManager = createFallbackManager(options.fallbackConfig);
    this.eventTracker = createEventTracker();

    // Inject project context from various hint files if present
<<<<<<< HEAD
    let base = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const projectHints: string[] = [];
    const hintFiles = ['.pcli-hints', 'AGENTS.md', 'CONTEXT.md', 'INSTRUCTIONS.md', '.goosehints', '.cursorrules'];

    for (const file of hintFiles) {
      const p = join(process.cwd(), file);
      if (existsSync(p)) {
        try {
          const content = readFileSync(p, 'utf-8').trim();
          projectHints.push(`### Source: ${file}\n${content}`);
        } catch (err) {
          // Ignore unreadable hint files
        }
      }
    }
=======
    const hints = loadProjectHints(process.cwd());
    const hintsText = formatProjectHints(hints);
>>>>>>> tools_improvement

    let base = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    if (hintsText) {
      base = `# Project Context & Guidelines\n\n${hintsText}\n\n---\n\n${base}`;
    }
    this.systemPrompt = base;

    // Initialize with empty plugins - will load async
    this.tools = createToolsWithContext({
      mode: this.mode,
      permissionFn: this.permissionFn,
      onWrite: (path, before, after) => {
        if (before !== null) this.undoStack.push({ path, before, after });
      },
      questionFn: this.questionFn,
      plugins: this.loadedPlugins,
      onTodoUpdate: (todos) => {
        this.pendingTodoUpdates = todos;
      },
    });

    // Track conversation start
    this.eventTracker.trackConversationStart();

    // Load plugins asynchronously
    this.loadPluginsAsync();
  }

  private async loadPluginsAsync(): Promise<void> {
    try {
      this.loadedPlugins = await loadPlugins();
      if (this.loadedPlugins.length > 0) {
        this.tools = createToolsWithContext({
          mode: this.mode,
          permissionFn: this.permissionFn,
          onWrite: (path, before, after) => {
            if (before !== null) this.undoStack.push({ path, before, after });
          },
          questionFn: this.questionFn,
          plugins: this.loadedPlugins,
          onTodoUpdate: (todos) => {
            this.pendingTodoUpdates = todos;
          },
        });
      }
    } catch (err) {
      console.warn('Failed to load plugins:', err);
    }
  }

<<<<<<< HEAD
  private buildTools() {
    return createTools(this.mode, this.permissionFn, {
      onWrite: (path, before, after) => {
        if (before !== null) this.undoStack.push({ path, before, after });
      },
      questionFn: this.questionFn,
      plugins: this.loadedPlugins,
      onTodoUpdate: (todos) => { this.pendingTodoUpdates = todos; },
    });
  }

=======
>>>>>>> tools_improvement
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
    this.tools = createToolsWithContext({
      mode: this.mode,
      permissionFn: this.permissionFn,
      onWrite: (path, before, after) => {
        if (before !== null) this.undoStack.push({ path, before, after });
      },
      questionFn: this.questionFn,
      plugins: this.loadedPlugins,
      onTodoUpdate: (todos) => {
        this.pendingTodoUpdates = todos;
      },
    });
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

  async getLoadedPlugins(): Promise<LoadedPlugin[]> {
    if (this.loadedPlugins.length === 0) {
      // Re-try loading if empty
      await this.loadPluginsAsync();
    }
    return this.loadedPlugins;
  }

  getEventTracker(): AgentEventTracker {
    return this.eventTracker;
  }

  getFallbackManager(): ToolFallbackManager {
    return this.fallbackManager;
  }

  getRecentEvents(limit?: number): AgentEvent[] {
    return this.eventTracker.getEvents({ limit });
  }

  exportEvents(): string {
    return this.eventTracker.exportToJSON();
  }

  async synthesizeAnswer(topic: string): Promise<string> {
    try {
      const model = await this.providerManager.getModel();
      const prompt = `The user is asking about "${topic}". Please provide a clear, concise explanation with examples if relevant. Format your response in markdown.`;

      const result = streamText({
        model,
        messages: [{ role: 'user', content: prompt }],
        maxOutputTokens: 2048,
      } as any);

      let answer = '';
      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          answer += part.text;
        }
      }

      return answer.trim();
    } catch (err) {
      return `I apologize, but I'm unable to generate an explanation for "${topic}" at the moment. Please try rephrasing your question or ask about a specific aspect of this topic.`;
    }
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
    } catch (err) {
      // Ignore if we can't read the directory
    }

    let pkgJson = '';
    try {
      const p = join(cwd, 'package.json');
      if (existsSync(p)) pkgJson = readFileSync(p, 'utf-8').slice(0, 1000);
    } catch (err) {
      // Ignore if we can't read package.json
    }

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

<<<<<<< HEAD
  async *sendMessage(userContent: string, attachedFiles?: Attachment[]): AsyncGenerator<StreamEvent> {
=======
  async *sendMessage(
    userContent: string,
    attachedFiles?: Attachment[],
  ): AsyncGenerator<StreamEvent> {
>>>>>>> tools_improvement
    // 1. Check for auto-compaction if over 85% budget
    if (this.totalTokensUsed > this.tokenBudget * 0.85) {
      yield {
        type: 'system',
        message: 'Neural buffer at 85% capacity. Commencing auto-compaction...',
      };
      await this.compact();
      this.totalTokensUsed = 0; // Reset after compaction as we start fresh
    }

    // Build context block if files are attached
    const contextBlock = attachedFiles?.length
      ? `<context>\n${attachedFiles.map((f) => `<file path="${f.path}">\n${f.content || ''}\n</file>`).join('\n')}\n</context>\n\n`
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
      const streamTimeout = setTimeout(
        () => {
          this.currentAbortController?.abort();
        },
        5 * 60 * 1000,
      );

      try {
        for await (const event of parseStream(result.fullStream)) {
          switch (event.type) {
            case 'text-delta': {
              const text = (event as any).delta;
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
                    const partialIdx = buffer.lastIndexOf('</');
                    if (partialIdx !== -1 && '</thought>'.startsWith(buffer.slice(partialIdx))) {
                      const thought = buffer.slice(0, partialIdx);
                      if (thought) {
                        thoughtText += thought;
                        yield { type: 'thought-delta', delta: thought };
                      }
                      buffer = buffer.slice(partialIdx);
                      break;
                    } else {
                      thoughtText += buffer;
                      yield { type: 'thought-delta', delta: buffer };
                      buffer = '';
                    }
                  }
                } else {
                  // Check for both <thought> and <multi_tool_use.parallel>
                  const thoughtOpenIdx = buffer.indexOf('<thought>');
                  const multiToolOpenIdx = buffer.indexOf('<multi_tool_use.parallel>');

                  // Handle <thought>
                  if (
                    thoughtOpenIdx !== -1 &&
                    (multiToolOpenIdx === -1 || thoughtOpenIdx < multiToolOpenIdx)
                  ) {
                    const beforeText = buffer.slice(0, thoughtOpenIdx);
                    if (beforeText) {
                      rawText += beforeText;
                      yield { type: 'text-delta', delta: beforeText };
                    }
                    buffer = buffer.slice(thoughtOpenIdx + 9);
                    inThought = true;
                    continue;
                  }

                  // Handle <multi_tool_use.parallel> - just strip it from rawText/UI
                  if (multiToolOpenIdx !== -1) {
                    const beforeText = buffer.slice(0, multiToolOpenIdx);
                    if (beforeText) {
                      rawText += beforeText;
                      yield { type: 'text-delta', delta: beforeText };
                    }
                    const closeIdx = buffer.indexOf('</multi_tool_use.parallel>', multiToolOpenIdx);
                    if (closeIdx !== -1) {
                      buffer = buffer.slice(closeIdx + 26);
                    } else {
                      // Tag is open but not closed in this buffer, wait for more
                      break;
                    }
                    continue;
                  }

                  // Partial tag check
                  const partialThoughtIdx = buffer.lastIndexOf('<');
                  if (
                    partialThoughtIdx !== -1 &&
                    ('<thought>'.startsWith(buffer.slice(partialThoughtIdx)) ||
                      '<multi_tool_use.parallel>'.startsWith(buffer.slice(partialThoughtIdx)))
                  ) {
                    const beforeText = buffer.slice(0, partialThoughtIdx);
                    if (beforeText) {
                      rawText += beforeText;
                      yield { type: 'text-delta', delta: beforeText };
                    }
                    buffer = buffer.slice(partialThoughtIdx);
                    break;
                  } else {
                    rawText += buffer;
                    yield { type: 'text-delta', delta: buffer };
                    buffer = '';
                  }
                }
              }
              break;
            }

            case 'thought-delta': {
              const rText = (event as any).delta || '';
              thoughtText += rText;
              yield { type: 'thought-delta', delta: rText };
              break;
            }

            case 'tool-call-start': {
              const toolCall = (event as any).toolCall;

              allToolCalls[toolCall.toolCallId] = {
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                args: toolCall.args,
              };

              // Track tool call start
              this.eventTracker.trackToolCall(toolCall.toolName, toolCall.args || {});

              yield {
                type: 'tool-call-start',
                toolCall: allToolCalls[toolCall.toolCallId],
              };
              break;
            }

            case 'tool-call-result': {
              const toolCall = (event as any).toolCall;
              const toolName = toolCall.toolName;
              const rawToolResult = toolCall.result;

              // Normalize tool result - extract output string if it's an object
              const toolResult: unknown = rawToolResult;
              let resultForCheck: unknown = rawToolResult;

              if (typeof rawToolResult === 'object' && rawToolResult !== null) {
                const resultObj = rawToolResult as Record<string, unknown>;
                // If it has an output field, use that for checking
                if (resultObj.output !== undefined) {
                  resultForCheck = resultObj.output;
                }
                // If it has an error field, that's a failure
                if (resultObj.error !== undefined) {
                  resultForCheck = { error: resultObj.error, ...resultObj };
                }
              }

              if (allToolCalls[toolCall.toolCallId]) {
                allToolCalls[toolCall.toolCallId].result = toolResult;
              }

              // Track the tool result
              this.eventTracker.trackToolSuccess(toolName, toolResult, 0);

              // Check if we need fallback - use the normalized result
<<<<<<< HEAD
              const needsFallback = this.fallbackManager.shouldAttemptFallback(toolName, resultForCheck);
=======
              const needsFallback = this.fallbackManager.shouldAttemptFallback(
                toolName,
                resultForCheck,
              );
>>>>>>> tools_improvement

              if (needsFallback && allToolCalls[toolCall.toolCallId]) {
                const args = allToolCalls[toolCall.toolCallId].args || {};

                // Yield fallback attempt event
                yield {
                  type: 'system',
                  message: `Tool "${toolName}" returned no results. Attempting fallback strategies...`,
                };

                // Try fallback asynchronously - use normalized result
<<<<<<< HEAD
                const fallbackResult = await this.fallbackManager.attemptFallback(toolName, args, resultForCheck);
=======
                const fallbackResult = await this.fallbackManager.attemptFallback(
                  toolName,
                  args,
                  resultForCheck,
                );
>>>>>>> tools_improvement

                if (fallbackResult) {
                  // Track fallback success
                  fallbackResult.attempts.forEach((attempt) => {
                    if (attempt.success) {
                      this.eventTracker.trackFallbackSuccess(
                        toolName,
                        attempt.strategy,
                        fallbackResult.output,
                        attempt.duration,
                      );
                    } else {
                      this.eventTracker.trackFallbackFailure(
                        toolName,
                        attempt.strategy,
                        attempt.error || 'Unknown error',
                        attempt.duration,
                      );
                    }
                  });

                  // If it's LLM synthesis needed, generate answer immediately
                  if (fallbackResult.output.includes('[LLM_SYNTHESIS_NEEDED]')) {
                    const query = fallbackResult.output
                      .replace('[LLM_SYNTHESIS_NEEDED]', '')
                      .trim();
                    yield {
                      type: 'system',
                      message: `No instant results found. Generating explanation for: "${query}"...`,
                    };

                    // Synthesize answer
                    const synthesizedAnswer = await this.synthesizeAnswer(query);
                    allToolCalls[toolCall.toolCallId].result = synthesizedAnswer;

                    yield {
                      type: 'system',
                      message: `✓ Generated explanation based on AI knowledge`,
                    };
                  } else if (fallbackResult.output.includes('[CODE_SEARCH_NEEDED]')) {
                    yield {
                      type: 'system',
                      message: `Searching codebase for relevant examples...`,
                    };
                  } else if (fallbackResult.source === 'web_fetch_recovery') {
                    // For web fetch failures, show the helpful recovery message
                    allToolCalls[toolCall.toolCallId].result = fallbackResult.output;
                    yield {
                      type: 'system',
                      message: fallbackResult.output,
                    };
                  } else {
                    // Update the tool result with fallback output
                    allToolCalls[toolCall.toolCallId].result = fallbackResult.output;
                    yield {
                      type: 'system',
                      message: `Fallback successful: ${fallbackResult.output.slice(0, 200)}${fallbackResult.output.length > 200 ? '...' : ''}`,
                    };
                  }
                } else {
                  yield {
                    type: 'system',
                    message: `Fallback strategies exhausted. I'll provide the best answer I can based on available information.`,
                  };
                }
              }

              yield {
                type: 'tool-call-result',
                toolCall: {
                  toolCallId: toolCall.toolCallId,
                  toolName: toolName,
                  result: allToolCalls[toolCall.toolCallId]?.result || toolResult,
                },
              };

              // Drain pending todo updates triggered by this tool call
              if (this.pendingTodoUpdates !== null) {
                yield { type: 'todo-update', todos: this.pendingTodoUpdates };
                this.pendingTodoUpdates = null;
              }
              break;
            }

            case 'system': {
              yield event as any;
              break;
            }

            case 'error':
              throw (event as any).error;

            case 'finish': {
              const usage = (event as any).usage;
              if (usage) {
                // AI SDK v6 uses inputTokens/outputTokens; v4 used promptTokens/completionTokens
                totalPromptTokens += usage.inputTokens ?? usage.promptTokens ?? 0;
                totalCompletionTokens += usage.outputTokens ?? usage.completionTokens ?? 0;
              }
              break;
            }

            default: {
              // unknown event types - surface for debugging
              yield { type: 'system', message: `Unhandled stream event: ${(event as any).type}` };
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

      // Auto-summary: if the model ran tools but produced no text, request a concise summary.
      // This handles models (e.g. gpt-5-mini) that stop after tool calls without a follow-up.
      if (rawText.trim() === '' && Object.keys(allToolCalls).length > 0) {
        try {
          const summaryResult = streamText({
            model,
            system: this.systemPrompt,
            messages: [
              ...this.coreMessages,
<<<<<<< HEAD
              { role: 'user' as const, content: 'Please summarize the above tool results concisely.' },
=======
              {
                role: 'user' as const,
                content: 'Please summarize the above tool results concisely.',
              },
>>>>>>> tools_improvement
            ],
            maxOutputTokens: 1024,
          } as any);

          for await (const part of summaryResult.fullStream) {
            if (part.type === 'text-delta') {
              const delta = (part.text ?? (part as any).delta ?? '') as string;
              if (delta) {
                rawText += delta;
                yield { type: 'text-delta', delta };
              }
            }
          }

          // Incorporate summary into coreMessages so follow-up turns have context
          const summaryResponse = await summaryResult.response;
          for (const msg of summaryResponse.messages) {
            this.coreMessages.push(msg);
          }
        } catch {
          // Silently fail — an empty response is better than crashing
        }
      }

      const entry = getModelEntry(
        this.providerManager.getActiveModel().provider,
        this.providerManager.getActiveModel().modelId,
      );
      if (entry?.inputCostPer1M != null) {
        this.totalCost += (totalPromptTokens / 1_000_000) * entry.inputCostPer1M;
      }
      if (entry?.outputCostPer1M != null) {
        this.totalCost += (totalCompletionTokens / 1_000_000) * entry.outputCostPer1M;
      }

      // Parse any <multi_tool_use.parallel> blocks that weren't captured as tool-call events
      // This handles models that output tool calls as XML instead of structured events
      // Match self-closing format: <multi_tool_use.parallel tool_uses=[...] />
      const multiToolRegex = /<multi_tool_use\.parallel\s+tool_uses=\[(.*?)\]\s*\/?>/g;
      let multiToolMatch;
      while ((multiToolMatch = multiToolRegex.exec(rawText)) !== null) {
        try {
          // Parse the array content - it's not valid JSON, so we need to be clever
          const arrayContent = multiToolMatch[1];
          // Split by },{ to get individual tool objects
          const toolObjects = arrayContent.split(/},\s*{/);

          for (const toolObj of toolObjects) {
            // Clean up the object string
            const cleanObj = toolObj.replace(/^\{/, '').replace(/\}$/, '');

            // Extract recipient_name and parameters using regex
            const recipientMatch = cleanObj.match(/recipient_name:\s*"([^"]+)"/);
            const paramsMatch = cleanObj.match(/parameters:\s*\{([^}]*)\}/);

            if (recipientMatch) {
              const toolCallId = generateId();
              const toolName = recipientMatch[1].replace(/^functions\./, '');

              // Parse parameters
              const args: Record<string, unknown> = {};
              if (paramsMatch) {
                const paramsStr = paramsMatch[1];
                // Parse key: value pairs
                const paramPairs = paramsStr.split(/,\s*/);
                for (const pair of paramPairs) {
                  const [key, ...valueParts] = pair.split(/:\s*/);
                  if (key && valueParts.length > 0) {
                    const value = valueParts.join(':').trim();
                    // Try to parse as number, boolean, or keep as string
                    if (value === 'true') args[key.trim()] = true;
                    else if (value === 'false') args[key.trim()] = false;
                    else if (!isNaN(Number(value))) args[key.trim()] = Number(value);
                    else args[key.trim()] = value.replace(/^"|"$/g, '');
                  }
                }
              }

              allToolCalls[toolCallId] = {
                toolCallId,
                toolName,
                args,
              };
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Final cleanup of rawText to ensure tags are stripped for history
      const finalContent = rawText
        .replace(/<thought>[\s\S]*?<\/thought>/g, '')
        .replace(/<multi_tool_use\.parallel[^>]*\/>/g, '')
        .replace(/<multi_tool_use\.parallel>[\s\S]*?<\/multi_tool_use\.parallel>/g, '')
        .trim();

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: finalContent,
        thought: thoughtText || undefined,
        toolCalls: Object.values(allToolCalls),
        timestamp: Date.now(),
      };
      this.messages.push(assistantMessage);

      if (this.messages.filter((m) => m.role === 'assistant').length === 1) {
        generateTitle(userContent, finalContent, model).then((title) => {
          this.conversationTitle = title;
          try {
            const id = saveConversation(
              this.messages,
              this.providerManager.getActiveModel(),
              userContent,
              this.conversationTitle,
              this.conversationId,
            );
            if (!this.conversationId) this.conversationId = id;
          } catch (err) {
            // Silently fail to save history - avoids breaking UI but could be logged to telemetry
            console.error('Background save history failed', err);
          }
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
        const id = saveConversation(
          this.messages,
          this.providerManager.getActiveModel(),
          userContent,
          this.conversationTitle,
          this.conversationId,
        );
        if (!this.conversationId) this.conversationId = id;
      } catch (err) {
        console.error('Failed to save history:', err);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        yield { type: 'finish', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        return;
      }
      Promise.resolve(result.usage).catch(() => {});
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
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    return true;
  }

  async compact(): Promise<string> {
    if (this.messages.length < 2) {
      return 'Not enough messages to compact.';
    }
    const model = await this.providerManager.getModel();
    const apiMessages = [
      ...this.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: COMPACTION_PROMPT },
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

    this.messages = [
      {
        id: generateId(),
        role: 'assistant',
        content: `**Conversation Summary:**\n\n${summary}`,
        timestamp: Date.now(),
      },
    ];
    this.coreMessages = [{ role: 'assistant', content: `**Conversation Summary:**\n\n${summary}` }];

    return 'Conversation compacted successfully.';
  }

  saveWorkspace(path: string, attachments: Attachment[]) {
    saveWorkspace(path, {
      id: this.conversationId || generateId(),
      title: this.conversationTitle || 'Workspace',
      date: Date.now(),
      model: this.providerManager.getActiveModel(),
      messages: this.messages,
      attachments,
      tokensUsed: this.totalTokensUsed,
      cost: this.totalCost,
    });
  }

  loadWorkspace(path: string): Attachment[] | null {
    const data = loadWorkspace(path);
    if (!data) return null;

    this.messages = data.messages;
    this.coreMessages = this.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    this.totalTokensUsed = data.tokensUsed;
    this.totalCost = data.cost;
    this.conversationId = data.id;
    this.conversationTitle = data.title;
    this.providerManager.switchModel(data.model.provider, data.model.modelId);

    return data.attachments;
  }
}
