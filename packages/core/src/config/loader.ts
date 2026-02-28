import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parse as parseYaml } from 'yaml';
import {
  ProvidersConfigSchema,
  AgentConfigSchema,
  type AppConfig,
} from '@personal-cli/shared';
import {
  CONFIG_DIR,
  CONFIG_PROVIDERS_FILE,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL,
} from '@personal-cli/shared';

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

  const providers = readYamlFile(
    join(globalConfigDir, CONFIG_PROVIDERS_FILE),
    ProvidersConfigSchema,
  );

  const agent = AgentConfigSchema.parse({});

  return { providers: providers ?? undefined, agent };
}

export function getDefaultModel(config: AppConfig): { provider: string; modelId: string } {
  const defaults = config.providers?.defaults;
  return {
    provider: defaults?.provider ?? DEFAULT_PROVIDER,
    modelId: defaults?.model ?? DEFAULT_MODEL,
  };
}
