import type { ModelEntry, ModelTag, ProviderName } from '@personal-cli/shared';

export interface FetchedModelEntry {
  provider: ProviderName;
  id: string;
  label: string;
  contextWindow: number;
  inputCostPer1M: number | null;
  outputCostPer1M: number | null;
  free: boolean;
  tags?: ModelTag[];
}

export interface ModelCacheEntry {
  models: FetchedModelEntry[];
  fetchedAt: string;
  source: 'static' | 'fetched';
}

export interface ModelCache {
  [provider: string]: ModelCacheEntry;
}

export interface CacheStats {
  provider: ProviderName;
  modelCount: number;
  fetchedAt: Date | null;
  source: 'static' | 'fetched';
  isStale: boolean;
  staleAfterHours: number;
}

const DEFAULT_STALE_AFTER_HOURS: Record<string, number> = {
  openrouter: 24,
  'github-copilot': 168, // 1 week - Copilot doesn't change often
  opencode: 24,
  'opencode-zen': 24,
};

function getCachePath(): string {
  const homedir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  return `${homedir}/.personal-cli/cache/model-cache.json`;
}

export async function loadModelCache(): Promise<ModelCache> {
  try {
    const { promises: fs } = await import('fs');
    const cachePath = getCachePath();
    const data = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(data) as ModelCache;
  } catch {
    return {};
  }
}

export async function saveModelCache(cache: ModelCache): Promise<void> {
  try {
    const { promises: fs } = await import('fs');
    const { dirname } = await import('path');
    const cachePath = getCachePath();

    // Ensure directory exists
    await fs.mkdir(dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error('Failed to save model cache:', err);
  }
}

export async function cacheModels(
  provider: ProviderName,
  models: FetchedModelEntry[],
): Promise<void> {
  const cache = await loadModelCache();
  cache[provider] = {
    models,
    fetchedAt: new Date().toISOString(),
    source: 'fetched',
  };
  await saveModelCache(cache);
}

export async function getCachedModels(provider: ProviderName): Promise<FetchedModelEntry[] | null> {
  // Temporarily avoid returning cached GitHub Copilot models so the authoritative
  // core copilot fetcher (getCopilotModelList) remains the single source of truth.
  // This prevents stale cached entries from overriding the dynamic copilot list.
  if (provider === 'github-copilot') return null;

  const cache = await loadModelCache();
  const entry = cache[provider];
  if (!entry) return null;
  return entry.models;
}

export async function clearModelCache(provider?: ProviderName): Promise<void> {
  if (provider) {
    const cache = await loadModelCache();
    delete cache[provider];
    await saveModelCache(cache);
  } else {
    await saveModelCache({});
  }
}

export async function getCacheStats(provider: ProviderName): Promise<CacheStats> {
  const cache = await loadModelCache();
  const entry = cache[provider];
  const staleAfterHours = DEFAULT_STALE_AFTER_HOURS[provider] || 24;

  if (!entry) {
    return {
      provider,
      modelCount: 0,
      fetchedAt: null,
      source: 'static',
      isStale: false,
      staleAfterHours,
    };
  }

  const fetchedAt = new Date(entry.fetchedAt);
  const hoursSinceFetch = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
  const isStale = hoursSinceFetch > staleAfterHours;

  return {
    provider,
    modelCount: entry.models.length,
    fetchedAt,
    source: entry.source,
    isStale,
    staleAfterHours,
  };
}

export async function getAllCacheStats(): Promise<CacheStats[]> {
  const providers: ProviderName[] = ['openrouter', 'github-copilot', 'opencode', 'opencode-zen'];
  return Promise.all(providers.map(getCacheStats));
}

export function convertToModelEntry(fetched: FetchedModelEntry): ModelEntry {
  return {
    provider: fetched.provider,
    id: fetched.id,
    label: fetched.label,
    contextWindow: fetched.contextWindow,
    inputCostPer1M: fetched.inputCostPer1M,
    outputCostPer1M: fetched.outputCostPer1M,
    free: fetched.free,
    tags: fetched.tags,
  };
}
