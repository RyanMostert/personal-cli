import {
  MODEL_REGISTRY,
  type ProviderName,
  type ModelEntry,
  type ModelTag,
} from '@personal-cli/shared';
import { getCopilotModelList } from '@personal-cli/core';
import { COLLAPSE_THRESHOLD } from '../constants/model-picker-constants.js';

export function getStaticModels(): ModelEntry[] {
  return [
    ...MODEL_REGISTRY.filter((model) => model.provider !== 'github-copilot'),
    ...getCopilotModelList().map((model) => ({
      provider: 'github-copilot' as ProviderName,
      id: model.id,
      label: model.label,
      contextWindow: model.contextWindow,
      inputCostPer1M: null,
      outputCostPer1M: null,
      free: true,
      tags: model.tags,
    })),
  ];
}

export function defaultCollapsedSet(models: ModelEntry[]): Set<string> {
  const counts = new Map<string, number>();
  for (const m of models) {
    counts.set(m.provider, (counts.get(m.provider) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, c]) => c > COLLAPSE_THRESHOLD).map(([p]) => p));
}

export function isRecommended(m: ModelEntry): boolean {
  if (m.free) return true;
  if (m.tags?.includes('coding')) return true;
  if (m.inputCostPer1M != null && m.inputCostPer1M < 1) return true;
  return false;
}

export function getAvgCost(m: ModelEntry): number {
  if (m.free) return 0;
  if (m.inputCostPer1M == null || m.outputCostPer1M == null) return 10;
  return (m.inputCostPer1M + m.outputCostPer1M) / 2;
}

export function parseModelFilter(filter: string): {
  searchQuery: string;
  tags: Set<ModelTag>;
  freeOnly: boolean;
} {
  const parts = filter.split(' ').filter(Boolean);
  const tagSet = new Set<ModelTag>();
  let isFreeOnly = false;
  const queryParts: string[] = [];

  for (const part of parts) {
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      if (tag === 'free') isFreeOnly = true;
      else if (['reasoning', 'coding', 'vision', 'fast', 'large'].includes(tag)) {
        tagSet.add(tag as ModelTag);
      }
    } else {
      queryParts.push(part);
    }
  }

  return { searchQuery: queryParts.join(' '), tags: tagSet, freeOnly: isFreeOnly };
}
