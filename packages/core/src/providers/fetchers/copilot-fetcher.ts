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
    id: 'claude-haiku-4.5',
    label: 'Claude Haiku 4.5 (Copilot)',
    contextWindow: 160_000,
    tags: ['reasoning', 'fast'],
  },
  {
    id: 'claude-opus-4.5',
    label: 'Claude Opus 4.5 (Copilot)',
    contextWindow: 160_000,
    tags: ['reasoning', 'large'],
  },
  {
    id: 'claude-opus-4.6',
    label: 'Claude Opus 4.6 (Copilot)',
    contextWindow: 192_000,
    tags: ['reasoning', 'large'],
  },
  {
    id: 'claude-sonnet-4.4',
    label: 'Claude Sonnet 4.4 (Copilot)',
    contextWindow: 144_000,
    tags: ['reasoning', 'coding'],
  },
  {
    id: 'claude-sonnet-4.5',
    label: 'Claude Sonnet 4.5 (Copilot)',
    contextWindow: 160_000,
    tags: ['reasoning', 'coding'],
  },
  {
    id: 'claude-sonnet-4.6',
    label: 'Claude Sonnet 4.6 (Copilot)',
    contextWindow: 160_000,
    tags: ['reasoning', 'coding'],
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro (Copilot)',
    contextWindow: 173_000,
    tags: ['reasoning', 'large'],
  },
  {
    id: 'gemini-3-flash',
    label: 'Gemini 3 Flash (Copilot)',
    contextWindow: 173_000,
    tags: ['fast'],
  },
  {
    id: 'gemini-3-pro',
    label: 'Gemini 3 Pro (Copilot)',
    contextWindow: 173_000,
    tags: ['reasoning', 'large'],
  },
  {
    id: 'gemini-3.1-pro',
    label: 'Gemini 3.1 Pro (Copilot)',
    contextWindow: 173_000,
    tags: ['reasoning', 'large'],
  },
  { id: 'gpt-4.1', label: 'GPT-4.1 (Copilot)', contextWindow: 128_000, tags: ['coding', 'large'] },
  { id: 'gpt-4o', label: 'GPT-4o (Copilot)', contextWindow: 68_000, tags: ['coding', 'fast'] },
  {
    id: 'gpt-5-mini',
    label: 'GPT-5 mini (Copilot)',
    contextWindow: 192_000,
    tags: ['coding', 'fast'],
  },
  { id: 'gpt-5.1', label: 'GPT-5.1 (Copilot)', contextWindow: 192_000, tags: ['coding', 'large'] },
  {
    id: 'gpt-5.1-codex',
    label: 'GPT-5.1-Codex (Copilot)',
    contextWindow: 256_000,
    tags: ['coding', 'large'],
  },
  {
    id: 'gpt-5.1-codex-max',
    label: 'GPT-5.1-Codex-Max (Copilot)',
    contextWindow: 256_000,
    tags: ['coding', 'large'],
  },
  {
    id: 'gpt-5.1-codex-mini',
    label: 'GPT-5.1-Codex-Mini (Copilot)',
    contextWindow: 256_000,
    tags: ['coding', 'fast'],
  },
  { id: 'gpt-5.2', label: 'GPT-5.2 (Copilot)', contextWindow: 192_000, tags: ['coding', 'large'] },
  {
    id: 'gpt-5.2-codex',
    label: 'GPT-5.2-Codex (Copilot)',
    contextWindow: 400_000,
    tags: ['coding', 'large'],
  },
  {
    id: 'gpt-5.3-codex',
    label: 'GPT-5.3-Codex (Copilot)',
    contextWindow: 400_000,
    tags: ['coding', 'large'],
  },
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4 (Copilot)',
    contextWindow: 400_000,
    tags: ['reasoning', 'large'],
  },
  {
    id: 'grok-code-fast-1',
    label: 'Grok Code Fast 1 (Copilot)',
    contextWindow: 173_000,
    tags: ['fast'],
  },
  { id: 'raptor-mini', label: 'Raptor mini (Copilot)', contextWindow: 264_000, tags: ['fast'] },
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
