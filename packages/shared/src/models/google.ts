import type { ProviderName } from '../types/index.js';
import type { ModelEntry, ModelTag } from './types.js';

const fast = { tags: ['fast'] as ModelTag[] };
const vision = { tags: ['vision'] as ModelTag[] };
const large = { tags: ['large'] as ModelTag[] };

export const googleModels: ModelEntry[] = [
  {
    provider: 'google' as ProviderName,
    id: 'gemini-2-0-flash-exp',
    label: 'Gemini 2.0 Flash (Exp)',
    contextWindow: 1_048_576,
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    free: true,
  },
  {
    provider: 'google' as ProviderName,
    id: 'gemini-2-0-flash',
    label: 'Gemini 2.0 Flash',
    contextWindow: 1_048_576,
    inputCostPer1M: 0.1,
    outputCostPer1M: 0.1,
    free: false,
    ...fast,
  },
  {
    provider: 'google' as ProviderName,
    id: 'gemini-2-0-flash-lite',
    label: 'Gemini 2.0 Flash Lite',
    contextWindow: 1_048_576,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.075,
    free: false,
    ...fast,
  },
  {
    provider: 'google' as ProviderName,
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    contextWindow: 2_097_152,
    inputCostPer1M: 1.25,
    outputCostPer1M: 5,
    free: false,
    ...vision,
    ...large,
  },
  {
    provider: 'google' as ProviderName,
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    contextWindow: 1_048_576,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.3,
    free: false,
    ...fast,
    ...vision,
  },
  {
    provider: 'google' as ProviderName,
    id: 'gemini-1.5-flash-8b',
    label: 'Gemini 1.5 Flash 8B',
    contextWindow: 1_048_576,
    inputCostPer1M: 0.04,
    outputCostPer1M: 0.04,
    free: false,
    ...fast,
  },
];
