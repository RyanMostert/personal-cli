import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { MCPServerConfig } from '@personal-cli/mcp-client';
import { CONFIG_DIR } from '@personal-cli/shared';

export function loadMCPConfig(): Record<string, MCPServerConfig> {
  const mcpPath = join(homedir(), CONFIG_DIR, 'mcp.json');
  if (!existsSync(mcpPath)) return {};

  try {
    const raw = readFileSync(mcpPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveMCPConfig(name: string, config: MCPServerConfig): void {
  const configs = loadMCPConfig();
  configs[name] = config;

  const mcpPath = join(homedir(), CONFIG_DIR, 'mcp.json');
  mkdirSync(join(homedir(), CONFIG_DIR), { recursive: true });
  writeFileSync(mcpPath, JSON.stringify(configs, null, 2));
}

export function removeMCPConfig(name: string): void {
  const configs = loadMCPConfig();
  delete configs[name];

  const mcpPath = join(homedir(), CONFIG_DIR, 'mcp.json');
  mkdirSync(join(homedir(), CONFIG_DIR), { recursive: true });
  writeFileSync(mcpPath, JSON.stringify(configs, null, 2));
}
