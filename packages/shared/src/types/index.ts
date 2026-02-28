// ─── Provider & Model ─────────────────────────────────────────────────────────

export type ProviderName =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'mistral'
  | 'ollama'
  | 'opencode-zen'
  | 'custom';

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

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
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

// ─── Streaming ────────────────────────────────────────────────────────────────

export type StreamEventType = 'text-delta' | 'finish' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  delta?: string;
  error?: Error;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
