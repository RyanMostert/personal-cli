import type { FetchedModelEntry } from '../../models/cache.js';
import type { ProviderName, ModelTag } from '@personal-cli/shared';

interface OpenCodeModel {
  id: string;
  name: string;
  context_window: number;
  pricing?: {
    input: number;
    output: number;
  };
  free?: boolean;
  tags?: string[];
}

// Known OpenCode models (fallback if API fails)
const OPENCODE_MODELS: OpenCodeModel[] = [
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5 (opencode)',
    context_window: 200_000,
    pricing: { input: 3, output: 15 },
    free: false,
    tags: ['coding'],
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (opencode)',
    context_window: 1_048_576,
    pricing: { input: 0.15, output: 0.6 },
    free: false,
    tags: ['fast'],
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano (opencode)',
    context_window: 128_000,
    free: true,
    tags: ['fast'],
  },
];

function mapTags(tags?: string[]): ModelTag[] {
  if (!tags) return [];
  
  const validTags: ModelTag[] = ['reasoning', 'coding', 'vision', 'fast', 'large'];
  return tags.filter((tag): tag is ModelTag => validTags.includes(tag as ModelTag));
}

export async function fetchOpenCodeModels(apiKey?: string): Promise<FetchedModelEntry[]> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch('https://opencode.ai/api/models', {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      // Fallback to known models if API fails
      console.warn(`OpenCode API returned ${response.status}, using fallback models`);
      return convertToEntries(OPENCODE_MODELS);
    }

    const data = (await response.json()) as OpenCodeModel[];
    return convertToEntries(data);
  } catch (error) {
    // Fallback to known models on error
    console.warn('Failed to fetch OpenCode models, using fallback:', error);
    return convertToEntries(OPENCODE_MODELS);
  }
}

function convertToEntries(models: OpenCodeModel[]): FetchedModelEntry[] {
  return models.map((model) => ({
    provider: 'opencode' as ProviderName,
    id: model.id,
    label: model.name,
    contextWindow: model.context_window,
    inputCostPer1M: model.pricing?.input ?? null,
    outputCostPer1M: model.pricing?.output ?? null,
    free: model.free || false,
    tags: mapTags(model.tags),
  }));
}

// Also support opencode-zen (free tier)
export async function fetchOpenCodeZenModels(): Promise<FetchedModelEntry[]> {
  // opencode-zen has a specific set of free models
  const zenModels: OpenCodeModel[] = [
    {
      id: 'kimi-k2.5-free',
      name: 'Kimi K2.5',
      context_window: 131_072,
      free: true,
    },
    {
      id: 'minimax-m2.5-free',
      name: 'MiniMax M2.5',
      context_window: 1_000_000,
      free: true,
    },
    {
      id: 'minimax-m2.1-free',
      name: 'MiniMax M2.1',
      context_window: 1_000_000,
      free: true,
    },
    {
      id: 'trinity-large-preview-free',
      name: 'Trinity Large',
      context_window: 32_768,
      free: true,
    },
  ];

  return zenModels.map((model) => ({
    provider: 'opencode-zen' as ProviderName,
    id: model.id,
    label: model.name,
    contextWindow: model.context_window,
    inputCostPer1M: null,
    outputCostPer1M: null,
    free: true,
    tags: [],
  }));
}
