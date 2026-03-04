import type { ProviderName } from '../types/index.js';

export type ModelTag = 'reasoning' | 'coding' | 'vision' | 'fast' | 'large';

export interface ModelEntry {
  provider: ProviderName;
  id: string;
  label: string;
  contextWindow: number;
  inputCostPer1M: number | null;   // null = free/unknown
  outputCostPer1M: number | null;
  free: boolean;
  tags?: ModelTag[];
}

export const MODEL_REGISTRY: ModelEntry[] = [
  // opencode-zen (free tier) - 4 models
  { provider: 'opencode-zen', id: 'kimi-k2.5-free', label: 'Kimi K2.5', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'opencode-zen', id: 'minimax-m2.5-free', label: 'MiniMax M2.5', contextWindow: 1_000_000, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'opencode-zen', id: 'minimax-m2.1-free', label: 'MiniMax M2.1', contextWindow: 1_000_000, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'opencode-zen', id: 'trinity-large-preview-free', label: 'Trinity Large', contextWindow: 32_768, inputCostPer1M: null, outputCostPer1M: null, free: true },

  // anthropic - 3 models
  { provider: 'anthropic', id: 'claude-opus-4-6', label: 'Claude Opus 4.6', contextWindow: 200_000, inputCostPer1M: 15, outputCostPer1M: 75, free: false },
  { provider: 'anthropic', id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', contextWindow: 200_000, inputCostPer1M: 3, outputCostPer1M: 15, free: false },
  { provider: 'anthropic', id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', contextWindow: 200_000, inputCostPer1M: 0.8, outputCostPer1M: 4, free: false },

  // openai - 8 models (3 existing + 5 new)
  { provider: 'openai', id: 'gpt-4o', label: 'GPT-4o', contextWindow: 128_000, inputCostPer1M: 2.5, outputCostPer1M: 10, free: false },
  { provider: 'openai', id: 'gpt-4o-mini', label: 'GPT-4o Mini', contextWindow: 128_000, inputCostPer1M: 0.15, outputCostPer1M: 0.6, free: false, tags: ['fast'] },
  { provider: 'openai', id: 'gpt-4.1', label: 'GPT-4.1', contextWindow: 1_047_576, inputCostPer1M: 2, outputCostPer1M: 8, free: false, tags: ['large'] },
  { provider: 'openai', id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', contextWindow: 1_047_576, inputCostPer1M: 0.4, outputCostPer1M: 1.6, free: false, tags: ['fast'] },
  { provider: 'openai', id: 'o3', label: 'o3', contextWindow: 200_000, inputCostPer1M: 10, outputCostPer1M: 40, free: false, tags: ['reasoning', 'large'] },
  { provider: 'openai', id: 'o3-mini', label: 'o3 Mini', contextWindow: 200_000, inputCostPer1M: 1.1, outputCostPer1M: 4.4, free: false, tags: ['reasoning', 'fast'] },
  { provider: 'openai', id: 'o4-mini', label: 'o4 Mini', contextWindow: 200_000, inputCostPer1M: 1.1, outputCostPer1M: 4.4, free: false, tags: ['reasoning'] },

  // google - 4 models (3 existing + 1 new)
  { provider: 'google', id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', contextWindow: 1_048_576, inputCostPer1M: 1.25, outputCostPer1M: 10, free: false },
  { provider: 'google', id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', contextWindow: 1_048_576, inputCostPer1M: 0.15, outputCostPer1M: 0.6, free: false, tags: ['fast'] },
  { provider: 'google', id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', contextWindow: 1_048_576, inputCostPer1M: 0.1, outputCostPer1M: 0.4, free: false, tags: ['fast'] },
  { provider: 'google', id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', contextWindow: 1_048_576, inputCostPer1M: 0.1, outputCostPer1M: 0.4, free: false, tags: ['fast'] },

  // mistral - 5 models (3 existing + 2 new)
  { provider: 'mistral', id: 'mistral-large-latest', label: 'Mistral Large', contextWindow: 131_072, inputCostPer1M: 2, outputCostPer1M: 6, free: false },
  { provider: 'mistral', id: 'codestral-latest', label: 'Codestral', contextWindow: 256_000, inputCostPer1M: 0.3, outputCostPer1M: 0.9, free: false, tags: ['coding'] },
  { provider: 'mistral', id: 'mistral-small-latest', label: 'Mistral Small', contextWindow: 131_072, inputCostPer1M: 0.1, outputCostPer1M: 0.3, free: false, tags: ['fast'] },
  { provider: 'mistral', id: 'devstral-small-latest', label: 'Devstral (coding)', contextWindow: 131_072, inputCostPer1M: 0.1, outputCostPer1M: 0.3, free: false, tags: ['coding'] },
  { provider: 'mistral', id: 'mistral-medium-latest', label: 'Mistral Medium', contextWindow: 131_072, inputCostPer1M: 0.4, outputCostPer1M: 2, free: false },

  // ollama (local — free) - 8 models (3 existing + 5 new)
  { provider: 'ollama', id: 'llama3.3', label: 'Llama 3.3', contextWindow: 128_000, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'ollama', id: 'qwen2.5-coder:14b', label: 'Qwen 2.5 Coder 14B', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['coding'] },
  { provider: 'ollama', id: 'deepseek-r1:14b', label: 'DeepSeek R1 14B', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['reasoning'] },
  { provider: 'ollama', id: 'qwen2.5-coder:32b', label: 'Qwen 2.5 Coder 32B', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['coding'] },
  { provider: 'ollama', id: 'deepseek-r1:32b', label: 'DeepSeek R1 32B', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['reasoning'] },
  { provider: 'ollama', id: 'gemma3:12b', label: 'Gemma 3 12B', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'ollama', id: 'phi4', label: 'Phi 4', contextWindow: 16_384, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['fast'] },
  { provider: 'ollama', id: 'mistral-nemo', label: 'Mistral Nemo', contextWindow: 128_000, inputCostPer1M: null, outputCostPer1M: null, free: true },

  // xai - 2 models
  { provider: 'xai', id: 'grok-3', label: 'Grok 3', contextWindow: 131_072, inputCostPer1M: 3, outputCostPer1M: 15, free: false, tags: ['large'] },
  { provider: 'xai', id: 'grok-3-mini', label: 'Grok 3 Mini', contextWindow: 131_072, inputCostPer1M: 0.3, outputCostPer1M: 0.5, free: false, tags: ['fast', 'reasoning'] },

  // deepseek - 2 models
  { provider: 'deepseek', id: 'deepseek-chat', label: 'DeepSeek Chat', contextWindow: 64_000, inputCostPer1M: 0.27, outputCostPer1M: 1.1, free: false },
  { provider: 'deepseek', id: 'deepseek-reasoner', label: 'DeepSeek R1', contextWindow: 64_000, inputCostPer1M: 0.55, outputCostPer1M: 2.19, free: false, tags: ['reasoning'] },

  // groq - 5 models (fast inference)
  { provider: 'groq', id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', contextWindow: 128_000, inputCostPer1M: 0.59, outputCostPer1M: 0.79, free: false, tags: ['fast'] },
  { provider: 'groq', id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', contextWindow: 128_000, inputCostPer1M: 0.05, outputCostPer1M: 0.08, free: false, tags: ['fast'] },
  { provider: 'groq', id: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2', contextWindow: 131_072, inputCostPer1M: 1, outputCostPer1M: 3, free: false },
  { provider: 'groq', id: 'qwen-qwq-32b', label: 'QwQ 32B', contextWindow: 131_072, inputCostPer1M: 0.29, outputCostPer1M: 0.39, free: false, tags: ['reasoning'] },
  { provider: 'groq', id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 70B', contextWindow: 128_000, inputCostPer1M: 0.75, outputCostPer1M: 0.99, free: false, tags: ['reasoning'] },

  // perplexity - 3 models
  { provider: 'perplexity', id: 'sonar-pro', label: 'Sonar Pro', contextWindow: 200_000, inputCostPer1M: 3, outputCostPer1M: 15, free: false },
  { provider: 'perplexity', id: 'sonar', label: 'Sonar', contextWindow: 127_072, inputCostPer1M: 1, outputCostPer1M: 1, free: false },
  { provider: 'perplexity', id: 'sonar-reasoning', label: 'Sonar Reasoning', contextWindow: 127_072, inputCostPer1M: 1, outputCostPer1M: 5, free: false, tags: ['reasoning'] },

  // cerebras - 2 models (ultra-fast inference)
  { provider: 'cerebras', id: 'llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout', contextWindow: 8_192, inputCostPer1M: 0.1, outputCostPer1M: 0.1, free: false, tags: ['fast'] },
  { provider: 'cerebras', id: 'qwen-3-32b', label: 'Qwen 3 32B', contextWindow: 32_768, inputCostPer1M: 0.3, outputCostPer1M: 0.3, free: false, tags: ['fast'] },

  // together - 3 models
  { provider: 'together', id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Turbo', contextWindow: 131_072, inputCostPer1M: 0.88, outputCostPer1M: 0.88, free: false, tags: ['fast'] },
  { provider: 'together', id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen 2.5 Coder 32B', contextWindow: 32_768, inputCostPer1M: 0.8, outputCostPer1M: 0.8, free: false, tags: ['coding'] },
  { provider: 'together', id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1 Full', contextWindow: 64_000, inputCostPer1M: 7, outputCostPer1M: 7, free: false, tags: ['reasoning', 'large'] },

  // github-copilot — available with Copilot Pro/Enterprise subscription
  { provider: 'github-copilot', id: 'gpt-4o', label: 'GPT-4o (Copilot)', contextWindow: 128_000, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['coding'] },
  { provider: 'github-copilot', id: 'gpt-4o-mini', label: 'GPT-4o Mini (Copilot)', contextWindow: 128_000, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['coding', 'fast'] },
  { provider: 'github-copilot', id: 'gpt-4.1', label: 'GPT-4.1 (Copilot)', contextWindow: 1_047_576, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['coding', 'large'] },
  { provider: 'github-copilot', id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Copilot)', contextWindow: 200_000, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['coding', 'reasoning'] },
  { provider: 'github-copilot', id: 'claude-3.7-sonnet', label: 'Claude 3.7 Sonnet (Copilot)', contextWindow: 200_000, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['coding', 'reasoning'] },
  { provider: 'github-copilot', id: 'o3-mini', label: 'o3 Mini (Copilot)', contextWindow: 200_000, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['reasoning', 'fast'] },
  { provider: 'github-copilot', id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Copilot)', contextWindow: 1_048_576, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['fast'] },

  // openrouter — free tier
  { provider: 'openrouter', id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['fast'] },
  { provider: 'openrouter', id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'openrouter', id: 'meta-llama/llama-3.2-11b-vision-instruct:free', label: 'Llama 3.2 11B Vision', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['vision'] },
  { provider: 'openrouter', id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash', contextWindow: 1_048_576, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['fast'] },
  { provider: 'openrouter', id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'openrouter', id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B', contextWindow: 32_768, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['fast'] },
  { provider: 'openrouter', id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1', contextWindow: 163_840, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['reasoning'] },
  { provider: 'openrouter', id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3', contextWindow: 163_840, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'openrouter', id: 'qwen/qwen3-235b-a22b:free', label: 'Qwen3 235B MoE', contextWindow: 40_960, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['large'] },
  { provider: 'openrouter', id: 'qwen/qwen3-30b-a3b:free', label: 'Qwen3 30B MoE', contextWindow: 40_960, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'openrouter', id: 'microsoft/phi-4:free', label: 'Phi-4', contextWindow: 16_384, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'openrouter', id: 'microsoft/phi-4-reasoning:free', label: 'Phi-4 Reasoning', contextWindow: 16_384, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['reasoning'] },
  { provider: 'openrouter', id: 'nvidia/llama-3.1-nemotron-70b-instruct:free', label: 'Nemotron 70B', contextWindow: 131_072, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'openrouter', id: 'tngtech/deepseek-r1t-chimera:free', label: 'DeepSeek R1T Chimera', contextWindow: 163_840, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['reasoning'] },

  // openrouter — paid
  { provider: 'openrouter', id: 'anthropic/claude-opus-4-5', label: 'Claude Opus 4.5', contextWindow: 200_000, inputCostPer1M: 15, outputCostPer1M: 75, free: false, tags: ['large'] },
  { provider: 'openrouter', id: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5', contextWindow: 200_000, inputCostPer1M: 3, outputCostPer1M: 15, free: false },
  { provider: 'openrouter', id: 'openai/gpt-4o', label: 'GPT-4o', contextWindow: 128_000, inputCostPer1M: 2.5, outputCostPer1M: 10, free: false },
  { provider: 'openrouter', id: 'openai/gpt-4.1', label: 'GPT-4.1', contextWindow: 1_047_576, inputCostPer1M: 2, outputCostPer1M: 8, free: false },
  { provider: 'openrouter', id: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini', contextWindow: 1_047_576, inputCostPer1M: 0.4, outputCostPer1M: 1.6, free: false, tags: ['fast'] },
  { provider: 'openrouter', id: 'openai/o3', label: 'o3', contextWindow: 200_000, inputCostPer1M: 10, outputCostPer1M: 40, free: false, tags: ['reasoning', 'large'] },
  { provider: 'openrouter', id: 'openai/o4-mini', label: 'o4 Mini', contextWindow: 200_000, inputCostPer1M: 1.1, outputCostPer1M: 4.4, free: false, tags: ['reasoning', 'fast'] },
  { provider: 'openrouter', id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', contextWindow: 1_048_576, inputCostPer1M: 1.25, outputCostPer1M: 10, free: false },
  { provider: 'openrouter', id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', contextWindow: 1_048_576, inputCostPer1M: 0.15, outputCostPer1M: 0.6, free: false, tags: ['fast'] },
  { provider: 'openrouter', id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', contextWindow: 524_288, inputCostPer1M: 0.19, outputCostPer1M: 0.49, free: false },
  { provider: 'openrouter', id: 'meta-llama/llama-4-scout', label: 'Llama 4 Scout', contextWindow: 524_288, inputCostPer1M: 0.08, outputCostPer1M: 0.3, free: false, tags: ['fast'] },
  { provider: 'openrouter', id: 'mistralai/mistral-large-2411', label: 'Mistral Large', contextWindow: 131_072, inputCostPer1M: 2, outputCostPer1M: 6, free: false },
  { provider: 'openrouter', id: 'qwen/qwen3-235b-a22b', label: 'Qwen3 235B MoE', contextWindow: 40_960, inputCostPer1M: 0.14, outputCostPer1M: 0.6, free: false, tags: ['large'] },
  { provider: 'openrouter', id: 'x-ai/grok-3-beta', label: 'Grok 3', contextWindow: 131_072, inputCostPer1M: 3, outputCostPer1M: 15, free: false, tags: ['large'] },
  { provider: 'openrouter', id: 'x-ai/grok-3-mini-beta', label: 'Grok 3 Mini', contextWindow: 131_072, inputCostPer1M: 0.3, outputCostPer1M: 0.5, free: false, tags: ['fast', 'reasoning'] },
  { provider: 'openrouter', id: 'cohere/command-r-plus-08-2024', label: 'Command R+', contextWindow: 128_000, inputCostPer1M: 2.5, outputCostPer1M: 10, free: false },
  { provider: 'openrouter', id: 'amazon/nova-pro-v1', label: 'Amazon Nova Pro', contextWindow: 300_000, inputCostPer1M: 0.8, outputCostPer1M: 3.2, free: false },
  { provider: 'openrouter', id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3', contextWindow: 163_840, inputCostPer1M: 0.27, outputCostPer1M: 1.1, free: false },

  // google-vertex (uses GCP ADC — no API key cost tracking, billed via GCP)
  { provider: 'google-vertex', id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Vertex)', contextWindow: 1_048_576, inputCostPer1M: 1.25, outputCostPer1M: 10, free: false },
  { provider: 'google-vertex', id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Vertex)', contextWindow: 1_048_576, inputCostPer1M: 0.15, outputCostPer1M: 0.6, free: false, tags: ['fast'] },
  { provider: 'google-vertex', id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Vertex)', contextWindow: 1_048_576, inputCostPer1M: 0.1, outputCostPer1M: 0.4, free: false, tags: ['fast'] },

  // opencode (gateway — free models available without key)
  { provider: 'opencode', id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (opencode)', contextWindow: 200_000, inputCostPer1M: 3, outputCostPer1M: 15, free: false, tags: ['coding'] },
  { provider: 'opencode', id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (opencode)', contextWindow: 1_048_576, inputCostPer1M: 0.15, outputCostPer1M: 0.6, free: false, tags: ['fast'] },
  { provider: 'opencode', id: 'gpt-5-nano', label: 'GPT-5 Nano (opencode)', contextWindow: 128_000, inputCostPer1M: null, outputCostPer1M: null, free: true, tags: ['fast'] },

  // amazon-bedrock (billed via AWS)
  { provider: 'amazon-bedrock', id: 'us.anthropic.claude-sonnet-4-5-20251001-v1:0', label: 'Claude Sonnet 4.5 (Bedrock)', contextWindow: 200_000, inputCostPer1M: 3, outputCostPer1M: 15, free: false, tags: ['coding'] },
  { provider: 'amazon-bedrock', id: 'us.amazon.nova-pro-v1:0', label: 'Nova Pro (Bedrock)', contextWindow: 300_000, inputCostPer1M: 0.8, outputCostPer1M: 3.2, free: false },
  { provider: 'amazon-bedrock', id: 'us.amazon.nova-lite-v1:0', label: 'Nova Lite (Bedrock)', contextWindow: 300_000, inputCostPer1M: 0.06, outputCostPer1M: 0.24, free: false, tags: ['fast'] },

  // azure (uses deployment names as IDs)
  { provider: 'azure', id: 'gpt-4o', label: 'GPT-4o (Azure)', contextWindow: 128_000, inputCostPer1M: 2.5, outputCostPer1M: 10, free: false },
  { provider: 'azure', id: 'gpt-4o-mini', label: 'GPT-4o Mini (Azure)', contextWindow: 128_000, inputCostPer1M: 0.15, outputCostPer1M: 0.6, free: false, tags: ['fast'] },
];

export function getModelEntry(provider: ProviderName, modelId: string): ModelEntry | undefined {
  return MODEL_REGISTRY.find(m => m.provider === provider && m.id === modelId);
}

export function getModelsByProvider(): Map<ProviderName, ModelEntry[]> {
  const map = new Map<ProviderName, ModelEntry[]>();
  for (const m of MODEL_REGISTRY) {
    if (!map.has(m.provider)) map.set(m.provider, []);
    map.get(m.provider)!.push(m);
  }
  return map;
}

export function getModelsByTag(tag: ModelTag): ModelEntry[] {
  return MODEL_REGISTRY.filter(m => m.tags?.includes(tag));
}
