import type { ProviderName } from '../types/index.js';
import type { ModelEntry, ModelTag } from './types.js';

const fast = { tags: ['fast'] as ModelTag[] };

export const groqModels: ModelEntry[] = [
  {
    provider: 'groq' as ProviderName,
    id: 'llama-3.1-70b-versatile',
    label: 'Llama 3.1 70B',
    contextWindow: 128_000,
    inputCostPer1M: 0.59,
    outputCostPer1M: 0.79,
    free: false,
  },
  {
    provider: 'groq' as ProviderName,
    id: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B',
    contextWindow: 128_000,
    inputCostPer1M: 0.05,
    outputCostPer1M: 0.08,
    free: false,
    ...fast,
  },
  {
    provider: 'groq' as ProviderName,
    id: 'mixtral-8x7b-32768',
    label: 'Mixtral 8x7B',
    contextWindow: 32_768,
    inputCostPer1M: 0.24,
    outputCostPer1M: 0.24,
    free: false,
    ...fast,
  },
  {
    provider: 'groq' as ProviderName,
    id: 'gemma2-9b-it',
    label: 'Gemma 2 9B',
    contextWindow: 8_192,
    inputCostPer1M: 0.28,
    outputCostPer1M: 0.28,
    free: false,
  },
];
