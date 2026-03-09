import type { ProviderName } from '../types/index.js';
import type { ModelEntry } from './registry.js';

export const deepseekModels: ModelEntry[] = [
  {
    provider: 'deepseek' as ProviderName,
    id: 'deepseek-chat',
    label: 'DeepSeek Chat',
    contextWindow: 64_000,
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
    free: false,
  },
  {
    provider: 'deepseek' as ProviderName,
    id: 'deepseek-coder',
    label: 'DeepSeek Coder',
    contextWindow: 64_000,
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
    free: false,
  },
  {
    provider: 'deepseek' as ProviderName,
    id: 'deepseek-reasoner',
    label: 'DeepSeek Reasoner',
    contextWindow: 64_000,
    inputCostPer1M: 0.55,
    outputCostPer1M: 2.19,
    free: false,
  },
];
