import type { ProviderName } from '../types/index.js';
import type { ModelEntry, ModelTag } from './registry.js';

const fast = { tags: ['fast'] as ModelTag[] };
const coding = { tags: ['coding'] as ModelTag[] };
const vision = { tags: ['vision'] as ModelTag[] };
const reasoning = { tags: ['reasoning'] as ModelTag[] };

export const openaiModels: ModelEntry[] = [
  {
    provider: 'openai' as ProviderName,
    id: 'gpt-4o',
    label: 'GPT-4o',
    contextWindow: 128_000,
    inputCostPer1M: 2.5,
    outputCostPer1M: 10,
    free: false,
    ...vision,
  },
  {
    provider: 'openai' as ProviderName,
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    contextWindow: 128_000,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
    free: false,
    ...fast,
  },
  {
    provider: 'openai' as ProviderName,
    id: 'gpt-4o-2024-11-20',
    label: 'GPT-4o (2024-11-20)',
    contextWindow: 128_000,
    inputCostPer1M: 2.5,
    outputCostPer1M: 10,
    free: false,
    ...vision,
  },
  {
    provider: 'openai' as ProviderName,
    id: 'gpt-4o-2024-08-06',
    label: 'GPT-4o (2024-08-06)',
    contextWindow: 128_000,
    inputCostPer1M: 2.5,
    outputCostPer1M: 10,
    free: false,
    ...vision,
  },
  {
    provider: 'openai' as ProviderName,
    id: 'chatgpt-4o-latest',
    label: 'ChatGPT-4o (Latest)',
    contextWindow: 128_000,
    inputCostPer1M: 2.5,
    outputCostPer1M: 10,
    free: false,
    ...vision,
  },
  {
    provider: 'openai' as ProviderName,
    id: 'o1',
    label: 'OpenAI o1',
    contextWindow: 128_000,
    inputCostPer1M: 15,
    outputCostPer1M: 60,
    free: false,
    ...reasoning,
  },
  {
    provider: 'openai' as ProviderName,
    id: 'o1-mini',
    label: 'OpenAI o1-mini',
    contextWindow: 128_000,
    inputCostPer1M: 3,
    outputCostPer1M: 12,
    free: false,
    ...fast,
  },
  {
    provider: 'openai' as ProviderName,
    id: 'o3-mini',
    label: 'OpenAI o3-mini',
    contextWindow: 200_000,
    inputCostPer1M: 1.1,
    outputCostPer1M: 4.4,
    free: false,
  },
];
