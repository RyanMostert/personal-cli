import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { CONFIG_DIR } from '@personal-cli/shared';

export interface AuthStore {
  [provider: string]: { key: string };
}

const authPath = () => join(homedir(), CONFIG_DIR, 'auth.json');

export function readAuth(): AuthStore {
  const p = authPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as AuthStore;
  } catch {
    return {};
  }
}

export function writeAuth(store: AuthStore): void {
  const dir = join(homedir(), CONFIG_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(authPath(), JSON.stringify(store, null, 2), { mode: 0o600 });
}

export function setProviderKey(provider: string, key: string): void {
  const store = readAuth();
  store[provider] = { key };
  writeAuth(store);
}

export function getProviderKey(provider: string): string | undefined {
  return readAuth()[provider]?.key;
}

export function removeProviderKey(provider: string): void {
  const store = readAuth();
  delete store[provider];
  writeAuth(store);
}
