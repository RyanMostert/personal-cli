import type { ProviderName } from '../types/index.js';

export interface ModelEntry {
  provider: ProviderName;
  id: string;
  label: string;
  contextWindow: number;
  inputCostPer1M: number | null;   // null = free/unknown
  outputCostPer1M: number | null;
  free: boolean;
}

export const MODEL_REGISTRY: ModelEntry[] = [
  // opencode-zen (free tier)
  { provider: 'opencode-zen', id: 'kimi-k2.5-free',             label: 'Kimi K2.5',          contextWindow: 131_072,   inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'opencode-zen', id: 'minimax-m2.5-free',           label: 'MiniMax M2.5',        contextWindow: 1_000_000, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'opencode-zen', id: 'minimax-m2.1-free',           label: 'MiniMax M2.1',        contextWindow: 1_000_000, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'opencode-zen', id: 'trinity-large-preview-free',  label: 'Trinity Large',       contextWindow: 32_768,    inputCostPer1M: null, outputCostPer1M: null, free: true },
  // anthropic
  { provider: 'anthropic', id: 'claude-opus-4-6',                label: 'Claude Opus 4.6',     contextWindow: 200_000,   inputCostPer1M: 15,   outputCostPer1M: 75,   free: false },
  { provider: 'anthropic', id: 'claude-sonnet-4-6',              label: 'Claude Sonnet 4.6',   contextWindow: 200_000,   inputCostPer1M: 3,    outputCostPer1M: 15,   free: false },
  { provider: 'anthropic', id: 'claude-haiku-4-5-20251001',      label: 'Claude Haiku 4.5',    contextWindow: 200_000,   inputCostPer1M: 0.8,  outputCostPer1M: 4,    free: false },
  // openai
  { provider: 'openai', id: 'gpt-4o',                            label: 'GPT-4o',              contextWindow: 128_000,   inputCostPer1M: 2.5,  outputCostPer1M: 10,   free: false },
  { provider: 'openai', id: 'gpt-4o-mini',                       label: 'GPT-4o Mini',         contextWindow: 128_000,   inputCostPer1M: 0.15, outputCostPer1M: 0.6,  free: false },
  { provider: 'openai', id: 'o4-mini',                           label: 'o4 Mini',             contextWindow: 200_000,   inputCostPer1M: 1.1,  outputCostPer1M: 4.4,  free: false },
  // google
  { provider: 'google', id: 'gemini-2.5-pro',                    label: 'Gemini 2.5 Pro',      contextWindow: 1_048_576, inputCostPer1M: 1.25, outputCostPer1M: 10,   free: false },
  { provider: 'google', id: 'gemini-2.5-flash',                  label: 'Gemini 2.5 Flash',    contextWindow: 1_048_576, inputCostPer1M: 0.15, outputCostPer1M: 0.6,  free: false },
  { provider: 'google', id: 'gemini-2.0-flash',                  label: 'Gemini 2.0 Flash',    contextWindow: 1_048_576, inputCostPer1M: 0.1,  outputCostPer1M: 0.4,  free: false },
  // mistral
  { provider: 'mistral', id: 'mistral-large-latest',             label: 'Mistral Large',       contextWindow: 131_072,   inputCostPer1M: 2,    outputCostPer1M: 6,    free: false },
  { provider: 'mistral', id: 'codestral-latest',                 label: 'Codestral',           contextWindow: 256_000,   inputCostPer1M: 0.3,  outputCostPer1M: 0.9,  free: false },
  { provider: 'mistral', id: 'mistral-small-latest',             label: 'Mistral Small',       contextWindow: 131_072,   inputCostPer1M: 0.1,  outputCostPer1M: 0.3,  free: false },
  // ollama (local — free, context window varies by model/hardware)
  { provider: 'ollama', id: 'llama3.3',                          label: 'Llama 3.3',           contextWindow: 128_000,   inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'ollama', id: 'qwen2.5-coder:14b',                 label: 'Qwen 2.5 Coder 14B', contextWindow: 131_072,   inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'ollama', id: 'deepseek-r1:14b',                   label: 'DeepSeek R1 14B',    contextWindow: 131_072,   inputCostPer1M: null, outputCostPer1M: null, free: true },
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
