import type { MCPServerConfig } from '@personal-cli/mcp-client';
import { ZenGatewayConfigSchema } from '@personal-cli/zen-mcp-server';
import type { ZenGatewayConfig } from '@personal-cli/zen-mcp-server';

const DEFAULT_ZEN_ENDPOINT = 'https://opencode.ai/zen/v1';

export function parseZenGatewayConfig(config?: MCPServerConfig): ZenGatewayConfig | null {
  const apiKey = config?.env?.OPENCODE_API_KEY || config?.env?.ZEN_API_KEY;
  if (!apiKey) {
    return null;
  }

  const result = ZenGatewayConfigSchema.safeParse({
    endpoint: config.env?.ZEN_ENDPOINT || DEFAULT_ZEN_ENDPOINT,
    apiKey,
    enabled: true,
  });

  return result.success ? result.data : null;
}

export function parseZenGatewayConfigFromEnv(): ZenGatewayConfig | null {
  const apiKey = process.env.OPENCODE_API_KEY || process.env.ZEN_API_KEY;
  if (!apiKey) {
    return null;
  }

  const result = ZenGatewayConfigSchema.safeParse({
    endpoint: process.env.ZEN_ENDPOINT || DEFAULT_ZEN_ENDPOINT,
    apiKey,
    enabled: true,
  });

  return result.success ? result.data : null;
}
