import { PROVIDER_REGISTRY, type ProviderEntry } from '@personal-cli/shared';
import type { ProviderName } from '@personal-cli/shared';
import { getProviderKey } from '../config/auth.js';
import { isCopilotAuthenticated } from './copilot-auth.js';

export interface ProviderInfo extends ProviderEntry {
  isAuthenticated?: boolean;
  hasKey?: boolean;
}

export function getProviderEntries(): ProviderInfo[] {
  return PROVIDER_REGISTRY.map((p) => {
    let isAuthenticated = false;
    try {
      if (p.id === 'github-copilot') {
        isAuthenticated = isCopilotAuthenticated();
      }
    } catch {
      isAuthenticated = false;
    }

    let hasKey = false;
    try {
      hasKey =
        !!getProviderKey(p.id as string) ||
        (!!(p as any).envVar && !!process.env[(p as any).envVar]);
    } catch {
      hasKey = false;
    }

    return { ...p, isAuthenticated, hasKey } as ProviderInfo;
  });
}

export function getProviderEntry(id: ProviderName): ProviderInfo | undefined {
  return getProviderEntries().find((p) => p.id === id);
}
