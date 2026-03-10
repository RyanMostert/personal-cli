import type { FetchedModelEntry } from '../../models/cache.js';
import type { ProviderName, ModelTag } from '@personal-cli/shared';

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  description?: string;
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

function extractTags(model: OpenRouterModel): ModelTag[] {
  const tags: ModelTag[] = [];
  const id = model.id.toLowerCase();

  if (id.includes('reasoning') || id.includes('r1') || id.includes('o3') || id.includes('o1')) {
    tags.push('reasoning');
  }
  if (id.includes('coder') || id.includes('code') || id.includes('devstral')) {
    tags.push('coding');
  }
  if (id.includes('vision') || id.includes('vl')) {
    tags.push('vision');
  }
  if (model.id.includes(':free') || model.pricing?.prompt === 0) {
    tags.push('fast');
  }
  if (model.context_length > 100000) {
    tags.push('large');
  }

  return tags;
}

export async function fetchOpenRouterModels(apiKey?: string): Promise<FetchedModelEntry[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  return data.data.map((model) => ({
    provider: 'openrouter' as ProviderName,
    id: model.id,
    label: model.name || model.id,
    contextWindow: model.context_length || 4096,
    inputCostPer1M: model.pricing?.prompt ? model.pricing.prompt * 1000000 : null,
    outputCostPer1M: model.pricing?.completion ? model.pricing.completion * 1000000 : null,
    free:
      model.id.includes(':free') ||
      (model.pricing?.prompt === 0 && model.pricing?.completion === 0),
    tags: extractTags(model),
  }));
}
