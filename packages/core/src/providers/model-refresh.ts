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
  /** Up to 5 representative model labels for display purposes */
  sampleModels?: string[];
  error?: string;
}

export async function refreshProviderModels(provider: ProviderName): Promise<RefreshResult> {
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
      sampleModels: models.slice(0, 5).map((m) => m.label || m.id),
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

/**
 * Tests a provider connection by fetching its model list but WITHOUT caching the results.
 * Use this for a quick "test connection" flow in the onboarding wizard.
 */
export async function testProviderConnection(provider: ProviderName): Promise<RefreshResult> {
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
          error: `Provider "${provider}" does not support connection testing`,
        };
    }

    return {
      success: true,
      provider,
      modelCount: models.length,
      sampleModels: models.slice(0, 5).map((m) => m.label || m.id),
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
  const providers: ProviderName[] = ['openrouter', 'github-copilot', 'opencode', 'opencode-zen'];

  const results = await Promise.all(providers.map((provider) => refreshProviderModels(provider)));

  return results;
}
