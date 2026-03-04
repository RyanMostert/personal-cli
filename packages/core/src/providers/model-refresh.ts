import type { ProviderName } from '@personal-cli/shared';
import type { FetchedModelEntry } from '../models/cache.js';
import {
  fetchOpenRouterModels,
  fetchCopilotModels,
  fetchOpenCodeModels,
  fetchOpenCodeZenModels,
} from './fetchers/index.js';
import { cacheModels } from '../models/cache.js';
import { getProviderKey } from '../config/auth.js';

export interface RefreshResult {
  success: boolean;
  provider: ProviderName;
  modelCount: number;
  error?: string;
}

export async function refreshProviderModels(
  provider: ProviderName
): Promise<RefreshResult> {
  try {
    let models: FetchedModelEntry[];

    switch (provider) {
      case 'openrouter': {
        const apiKey = getProviderKey('openrouter') || process.env.OPENROUTER_API_KEY;
        models = await fetchOpenRouterModels(apiKey);
        break;
      }

      case 'github-copilot': {
        models = await fetchCopilotModels();
        break;
      }

      case 'opencode': {
        const apiKey = getProviderKey('opencode') || process.env.OPENCODE_API_KEY;
        models = await fetchOpenCodeModels(apiKey);
        break;
      }

      case 'opencode-zen': {
        models = await fetchOpenCodeZenModels();
        break;
      }

      default:
        return {
          success: false,
          provider,
          modelCount: 0,
          error: `Provider "${provider}" does not support model fetching`,
        };
    }

    // Cache the fetched models
    await cacheModels(provider, models);

    return {
      success: true,
      provider,
      modelCount: models.length,
    };
  } catch (error) {
    return {
      success: false,
      provider,
      modelCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function refreshAllProviders(): Promise<RefreshResult[]> {
  const providers: ProviderName[] = [
    'openrouter',
    'github-copilot',
    'opencode',
    'opencode-zen',
  ];

  const results = await Promise.all(
    providers.map((provider) => refreshProviderModels(provider))
  );

  return results;
}
