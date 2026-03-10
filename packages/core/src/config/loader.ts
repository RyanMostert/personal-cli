import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parse as parseYaml } from 'yaml';
import { ProvidersConfigSchema, AgentConfigSchema, MCPConfigSchema, type AppConfig } from '@personal-cli/shared';
export type { AppConfig };
import { CONFIG_DIR, CONFIG_PROVIDERS_FILE, DEFAULT_PROVIDER, DEFAULT_MODEL } from '@personal-cli/shared';
import { getRecentModels } from './prefs.js';

const settingsPath = join(homedir(), CONFIG_DIR, 'settings.json');

export interface UserSettings {
  defaultProvider?: string;
  defaultModel?: string;
  lastUsedModels?: Record<string, string>;
  defaultMode?: 'ask' | 'plan' | 'auto' | 'build';
  maxSteps?: number;
  tokenBudget?: number;
  protectEnvFiles?: boolean; // default true
  featureFlags?: Record<string, boolean>;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultMode: 'ask',
  maxSteps: 20,
  protectEnvFiles: true,
  featureFlags: {},
};

export function loadSettings(): UserSettings {
  try {
    if (!existsSync(settingsPath)) return DEFAULT_SETTINGS;
    const raw = readFileSync(settingsPath, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<UserSettings>): void {
  const current = loadSettings();
  // Ensure config directory exists before writing settings
  mkdirSync(join(homedir(), CONFIG_DIR), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify({ ...current, ...settings }, null, 2));
}

function readYamlFile<T>(filePath: string, schema: { parse: (v: unknown) => T }): T | null {
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = parseYaml(raw);
    return schema.parse(parsed);
  } catch {
    return null;
  }
}

export function loadConfig(): AppConfig {
  const globalConfigDir = join(homedir(), CONFIG_DIR);

  const providers = readYamlFile(join(globalConfigDir, CONFIG_PROVIDERS_FILE), ProvidersConfigSchema);

  const agent = AgentConfigSchema.parse({});

  // Load MCP config from JSON file if it exists
  let mcp: Record<string, unknown> = {};
  try {
    const mcpPath = join(globalConfigDir, 'mcp.json');
    if (existsSync(mcpPath)) {
      const raw = readFileSync(mcpPath, 'utf-8');
      mcp = JSON.parse(raw);
    }
  } catch {
    // MCP config is optional
  }

  return {
    providers: providers ?? undefined,
    agent,
    mcp: MCPConfigSchema.parse(mcp),
  };
}
// Determine the model to use on startup.
// Priority: user settings favorite -> recent (prefs) -> provider defaults -> global default
export function getDefaultModel(config: AppConfig, userSettings?: UserSettings): { provider: string; modelId: string } {
  const defaults = config.providers?.defaults;

  const settings = userSettings ?? loadSettings();

  // Resolve provider: user setting > provider default > global default
  const provider = settings.defaultProvider ?? defaults?.provider ?? DEFAULT_PROVIDER;

  // Favourite (explicit) model: user setting or provider default
  const favourite = settings.defaultModel ?? defaults?.model ?? '';

  // Last used model for this provider can be stored in settings (preferred),
  // otherwise fall back to recent prefs, then provider defaults, then global default
  const lastUsedFromSettings = settings.lastUsedModels?.[provider] ?? '';
  const recent = getRecentModels();
  const lastForProvider =
    (lastUsedFromSettings || recent.find((r) => r.provider === provider)?.modelId) ?? recent[0]?.modelId ?? '';

  const modelId =
    favourite && favourite !== ''
      ? favourite
      : lastForProvider && lastForProvider !== ''
        ? lastForProvider
        : (defaults?.model ?? DEFAULT_MODEL);

  return { provider, modelId };
}
