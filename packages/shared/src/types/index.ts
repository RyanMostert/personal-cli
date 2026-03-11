// ─── Provider & Model ─────────────────────────────────────────────────────────

export type ProviderName =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'mistral'
  | 'ollama'
  | 'opencode-zen'
  | 'custom'
  | 'openrouter'
  | 'groq'
  | 'xai'
  | 'deepseek'
  | 'perplexity'
  | 'cerebras'
  | 'together'
  | 'github-copilot'
  | 'google-vertex'
  | 'opencode'
  | 'amazon-bedrock'
  | 'azure';

export interface ModelConfig {
  id: string;
  maxTokens?: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  models: ModelConfig[];
}

export interface ProvidersConfigShape {
  providers: Partial<Record<ProviderName, ProviderConfig>>;
  defaults: {
    provider: ProviderName;
    model: string;
    fallback?: { provider: ProviderName; model: string };
  };
}

export interface ActiveModel {
  provider: ProviderName;
  modelId: string;
  config?: ModelConfig;
}

// ─── Conversation ─────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Attachment {
  id: string;
  path: string;
  name: string;
  type: 'file' | 'image';
  size?: number;
  content?: string; // Base64 encoded for images, text content for files
  mimeType?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  thought?: string;
  toolCalls?: ToolCallInfo[];
  attachments?: Attachment[];
  timestamp: number;
}

export interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: ActiveModel;
  totalTokens: number;
  totalCost: number;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export type PermissionPolicy = 'auto-allow' | 'ask' | 'deny';

export interface ToolPermission {
  default: PermissionPolicy;
  autoAllow?: Array<{ pattern: string }>;
  deny?: Array<{ pattern: string }>;
}

export type PermissionsConfigShape = Record<string, PermissionPolicy | ToolPermission>;

// ─── Agent ────────────────────────────────────────────────────────────────────

export type AgentMode = 'ask' | 'auto' | 'plan' | 'build';

export interface AgentConfig {
  mode: AgentMode;
  maxIterations: number;
  tokenBudget: number;
  systemPrompt?: string;
}

// ─── Todo ─────────────────────────────────────────────────────────────────────

export interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export type StreamEventType =
  | 'text-delta'
  | 'thought-delta'
  | 'tool-call-start'
  | 'tool-call-result'
  | 'tool-queue-update'
  | 'promise-warning'
  | 'step-start'
  | 'step-finish'
  | 'finish'
  | 'error'
  | 'system'
  | 'todo-update';

export interface QueuedTool {
  id: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  addedAt: number;
}

export interface ToolCallInfo {
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  oldText?: string;
  newText?: string;
  path?: string;
}

export interface StreamEvent {
  type: StreamEventType;
  delta?: string;
  message?: string;
  step?: number;
  toolCall?: ToolCallInfo;
  error?: Error | { message: string; name?: string; stack?: string };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  todos?: TodoItem[];
  queue?: QueuedTool[];
  pending?: number;
  inProgress?: number;
  completed?: number;
  unfulfilled?: string[];
  retryCount?: number;
}
