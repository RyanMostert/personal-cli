import type { ProviderName } from '../types/index.js';
import type { ModelEntry, ModelTag } from './registry.js';

export const anthropicModels: ModelEntry[] = [
  {
    provider: 'anthropic' as ProviderName,
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    contextWindow: 200_000,
    inputCostPer1M: 15,
    outputCostPer1M: 75,
    free: false,
  },
  {
    provider: 'anthropic' as ProviderName,
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    contextWindow: 200_000,
    inputCostPer1M: 3,
    outputCostPer1M: 15,
    free: false,
  },
  {
    provider: 'anthropic' as ProviderName,
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    contextWindow: 200_000,
    inputCostPer1M: 0.8,
    outputCostPer1M: 4,
    free: false,
  },
];
