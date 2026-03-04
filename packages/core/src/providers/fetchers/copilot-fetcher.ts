import type { FetchedModelEntry } from '../../models/cache.js';
import type { ProviderName, ModelTag } from '@personal-cli/shared';

// GitHub Copilot models are determined by subscription tier
// These are the known models as of the latest GitHub documentation
// Note: Copilot doesn't have a public API to fetch models, so we maintain this list

interface CopilotModel {
  id: string;
  label: string;
  contextWindow: number;
  tags: ModelTag[];
  requiresPro?: boolean;
}

const COPILOT_MODELS: CopilotModel[] = [
  {
    id: 'gpt-4o',
    label: 'GPT-4o (Copilot)',
    contextWindow: 128_000,
    tags: ['coding'],
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini (Copilot)',
    contextWindow: 128_000,
    tags: ['coding', 'fast'],
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1 (Copilot)',
    contextWindow: 1_047_576,
    tags: ['coding', 'large'],
  },
  {
    id: 'claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet (Copilot)',
    contextWindow: 200_000,
    tags: ['coding', 'reasoning'],
    requiresPro: true,
  },
  {
    id: 'claude-3.7-sonnet',
    label: 'Claude 3.7 Sonnet (Copilot)',
    contextWindow: 200_000,
    tags: ['coding', 'reasoning'],
    requiresPro: true,
  },
  {
    id: 'o3-mini',
    label: 'o3 Mini (Copilot)',
    contextWindow: 200_000,
    tags: ['reasoning', 'fast'],
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash (Copilot)',
    contextWindow: 1_048_576,
    tags: ['fast'],
  },
];

export async function fetchCopilotModels(): Promise<FetchedModelEntry[]> {
  // In the future, we could validate models against the user's Copilot subscription
  // by making a request to GitHub's API, but for now we return the static list
  
  return COPILOT_MODELS.map((model) => ({
    provider: 'github-copilot' as ProviderName,
    id: model.id,
    label: model.label,
    contextWindow: model.contextWindow,
    inputCostPer1M: null, // Copilot is free with subscription
    outputCostPer1M: null,
    free: true,
    tags: model.tags,
  }));
}

export function getCopilotModelList(): CopilotModel[] {
  return COPILOT_MODELS;
}

export function addCopilotModel(model: CopilotModel): void {
  // This could be called if we discover new models via other means
  COPILOT_MODELS.push(model);
}
