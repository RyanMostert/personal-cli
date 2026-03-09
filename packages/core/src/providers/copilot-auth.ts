/**
 * GitHub Copilot OAuth authentication module.
 *
 * Flow:
 *  1. Device flow: get device_code + user_code from GitHub
 *  2. Poll until the user authorizes in their browser
 *  3. Store the long-lived GitHub OAuth token via auth.ts
 *  4. On each API call: exchange GitHub token for short-lived Copilot token
 *  5. Cache Copilot token in memory; refresh when expired
 */

import { getProviderKey, setProviderKey } from '../config/auth.js';

// The GitHub OAuth app client ID used for Copilot device flow.
// This is the well-known public client ID from the GitHub Copilot Neovim plugin.
const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface CopilotToken {
  token: string;
  expires_at: number; // Unix timestamp in seconds
}

// In-memory cache for the short-lived Copilot token
let cachedCopilotToken: CopilotToken | null = null;

/**
 * Step 1: Start device flow — returns what to show the user.
 */
export async function startDeviceFlow(): Promise<{
  userCode: string;
  verificationUri: string;
  deviceCode: string;
  interval: number;
}> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: 'read:user' }),
  });

  if (!res.ok) throw new Error(`GitHub device code request failed: ${res.status}`);

  const data = (await res.json()) as DeviceCodeResponse;
  return {
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    deviceCode: data.device_code,
    interval: data.interval,
  };
}

/**
 * Step 2: Poll until the user authorizes. Returns the GitHub OAuth token.
 * Caller should call this after displaying the user_code and verification_uri.
 */
export async function pollForGitHubToken(
  deviceCode: string,
  interval: number,
  onTick?: () => void,
): Promise<string> {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const pollInterval = Math.max(interval, 5) * 1000; // at least 5s

  for (let attempt = 0; attempt < 60; attempt++) {
    await delay(pollInterval);
    if (onTick) onTick();

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = (await res.json()) as any;

    if (data.access_token) return data.access_token as string;
    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') {
      await delay(5000);
      continue;
    }
    throw new Error(`GitHub auth error: ${data.error_description ?? data.error}`);
  }

  throw new Error('GitHub device flow timed out. Please try again.');
}

/**
 * Step 3: Store the GitHub OAuth token persistently.
 */
export function saveGitHubToken(token: string): void {
  setProviderKey('github-copilot', token);
}

/**
 * Step 4: Exchange the stored GitHub OAuth token for a short-lived Copilot token.
 * Caches the result in memory and reuses until expiry.
 */
export async function getCopilotToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (with 60s buffer)
  if (cachedCopilotToken && cachedCopilotToken.expires_at > now + 60) {
    return cachedCopilotToken.token;
  }

  const githubToken = getProviderKey('github-copilot');
  if (!githubToken) {
    throw new Error('GitHub Copilot is not authenticated. Run the provider wizard to authorize.');
  }

  const res = await fetch('https://api.github.com/copilot_internal/v2/token', {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/json',
      'Editor-Version': 'personal-cli/1.0.0',
      'Editor-Plugin-Version': 'personal-cli/1.0.0',
    },
  });

  if (!res.ok) {
    // If 401, the GitHub token is stale — clear cached token to force re-auth
    cachedCopilotToken = null;
    throw new Error(
      `Failed to get Copilot token (${res.status}). Re-authenticate via the provider manager.`,
    );
  }

  const data = (await res.json()) as CopilotToken;
  cachedCopilotToken = data;
  return data.token;
}

/**
 * Check if the user already has a stored GitHub OAuth token for Copilot.
 */
export function isCopilotAuthenticated(): boolean {
  return !!getProviderKey('github-copilot');
}

/**
 * Clear both in-memory and stored tokens (for logout/re-auth).
 */
export function clearCopilotAuth(): void {
  cachedCopilotToken = null;
  // Note: caller should also call removeProviderKey('github-copilot') from auth.ts
}
