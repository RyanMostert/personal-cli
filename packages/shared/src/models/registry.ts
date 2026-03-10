import type { ProviderName } from '../types/index.js';
import type { ModelEntry, ModelTag } from './types.js';
export type { ModelEntry, ModelTag } from './types.js';
import { opencodeZenModels } from './opencode-zen.js';
import { anthropicModels } from './anthropic.js';
import { openaiModels } from './openai.js';
import { googleModels } from './google.js';
import { openrouterModels } from './openrouter.js';
import { deepseekModels } from './deepseek.js';
import { groqModels } from './groq.js';

export const MODEL_REGISTRY: ModelEntry[] = [
  ...opencodeZenModels,
  ...anthropicModels,
  ...openaiModels,
  ...googleModels,
  ...openrouterModels,
  ...deepseekModels,
  ...groqModels,
];

export function getModelEntry(provider: ProviderName, modelId: string): ModelEntry | undefined {
  return MODEL_REGISTRY.find((m) => m.provider === provider && m.id === modelId);
}

export function getModelsByProvider(): Map<ProviderName, ModelEntry[]> {
  const map = new Map<ProviderName, ModelEntry[]>();
  for (const model of MODEL_REGISTRY) {
    const existing = map.get(model.provider) || [];
    existing.push(model);
    map.set(model.provider, existing);
  }
  return map;
}

export function getModelsByTag(tag: ModelTag): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.tags?.includes(tag));
}
