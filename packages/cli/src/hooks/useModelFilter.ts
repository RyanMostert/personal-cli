import { useMemo } from 'react';
import type { ModelEntry, ModelTag } from '@personal-cli/shared';
import {
  getStaticModels,
  defaultCollapsedSet,
  parseModelFilter,
} from '../utils/model-picker-helpers.js';
import { VISIBLE_HEIGHT } from '../constants/model-picker-constants.js';

export interface ModelFilterResult {
  searchQuery: string;
  tags: Set<ModelTag>;
  freeOnly: boolean;
  staticModels: ModelEntry[];
  collapsedProviders: Set<string>;
  recentModels: ModelEntry[];
}

export function useModelFilter(
  recentModelIds: Array<{ provider: string; modelId: string }>,
): ModelFilterResult {
  const staticModels = useMemo(() => getStaticModels(), []);
  const collapsedProviders = useMemo(() => defaultCollapsedSet(staticModels), [staticModels]);

  const recentModels = useMemo(() => {
    return recentModelIds
      .map((r) => staticModels.find((m) => m.provider === r.provider && m.id === r.modelId))
      .filter((m): m is ModelEntry => m !== undefined);
  }, [staticModels, recentModelIds]);

  const filterResult = useMemo(() => {
    return { searchQuery: '', tags: new Set<ModelTag>(), freeOnly: false };
  }, []);

  return {
    searchQuery: filterResult.searchQuery,
    tags: filterResult.tags,
    freeOnly: filterResult.freeOnly,
    staticModels,
    collapsedProviders,
    recentModels,
  };
}

export { VISIBLE_HEIGHT, parseModelFilter };
