import type { ProviderName } from '../types/index.js';
import type { ModelEntry, ModelTag } from './registry.js';

const tag = (...t: ModelTag[]): { tags?: ModelTag[] } => ({ tags: t });

export const opencodeZenModels: ModelEntry[] = [
  {
    provider: 'opencode-zen' as ProviderName,
    id: 'kimi-k2.5-free',
    label: 'Kimi K2.5',
    contextWindow: 131_072,
    inputCostPer1M: null,
    outputCostPer1M: null,
    free: true,
  },
  {
    provider: 'opencode-zen' as ProviderName,
    id: 'minimax-m2.5-free',
    label: 'MiniMax M2.5',
    contextWindow: 1_000_000,
    inputCostPer1M: null,
    outputCostPer1M: null,
    free: true,
  },
  {
    provider: 'opencode-zen' as ProviderName,
    id: 'minimax-m2.1-free',
    label: 'MiniMax M2.1',
    contextWindow: 1_000_000,
    inputCostPer1M: null,
    outputCostPer1M: null,
    free: true,
  },
  {
    provider: 'opencode-zen' as ProviderName,
    id: 'trinity-large-preview-free',
    label: 'Trinity Large',
    contextWindow: 32_768,
    inputCostPer1M: null,
    outputCostPer1M: null,
    free: true,
  },
];
