import type { AppConfig, UserSettings } from './loader.js';
import {
  loadSettings,
  saveSettings,
  loadConfig,
  getDefaultModel as coreGetDefaultModel,
} from './loader.js';
import {
  readAuth,
  writeAuth,
  setProviderKey,
  getProviderKey,
  removeProviderKey,
  type AuthStore,
} from './auth.js';

/**
 * Lightweight ConfigStore wrapper to centralize config access and provide an in-memory
 * implementation for tests.
 */
export class ConfigStore {
  loadSettings(): UserSettings {
    return loadSettings();
  }

  saveSettings(settings: Partial<UserSettings>): void {
    return saveSettings(settings);
  }

  loadConfig(): AppConfig {
    return loadConfig();
  }

  getDefaultModel(cfg?: AppConfig) {
    return coreGetDefaultModel(cfg ?? this.loadConfig(), this.loadSettings());
  }

  // Auth helpers
  readAuth(): AuthStore {
    return readAuth();
  }

  writeAuth(val: AuthStore) {
    return writeAuth(val);
  }

  setProviderKey(provider: string, key: string) {
    return setProviderKey(provider, key);
  }

  getProviderKey(provider: string) {
    return getProviderKey(provider);
  }

  removeProviderKey(provider: string) {
    return removeProviderKey(provider);
  }
}

/**
 * In-memory ConfigStore useful for tests and decoupled components.
 */
export class InMemoryConfigStore extends ConfigStore {
  private _settings: UserSettings | null = null;
  private _config: AppConfig | null = null;
  private _auth: AuthStore = {};

  constructor(initial?: { settings?: UserSettings; config?: AppConfig; auth?: AuthStore }) {
    super();
    if (initial?.settings) this._settings = initial.settings;
    if (initial?.config) this._config = initial.config;
    if (initial?.auth) this._auth = initial.auth;
  }

  loadSettings() {
    return this._settings ?? ({} as UserSettings);
  }

  saveSettings(settings: Partial<UserSettings>) {
    this._settings = { ...(this._settings ?? {}), ...settings } as UserSettings;
  }

  loadConfig() {
    return this._config ?? ({} as AppConfig);
  }

  readAuth() {
    return this._auth;
  }

  writeAuth(val: AuthStore) {
    this._auth = { ...this._auth, ...val };
  }

  setProviderKey(provider: string, key: string) {
    this._auth[provider] = { key };
  }

  getProviderKey(provider: string) {
    return this._auth[provider]?.key;
  }

  removeProviderKey(provider: string) {
    delete this._auth[provider];
  }
}

export function createInMemoryConfigStore(initial?: {
  settings?: UserSettings;
  config?: AppConfig;
  auth?: AuthStore;
}) {
  return new InMemoryConfigStore(initial);
}
