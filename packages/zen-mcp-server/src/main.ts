#!/usr/bin/env node
import { ZenMCPServer } from './server.js';
import { ZenGatewayConfigSchema } from './types.js';

async function main() {
  // Read configuration from environment variables
  const apiKey = process.env.OPENCODE_API_KEY || process.env.ZEN_API_KEY;
  const endpoint = process.env.ZEN_ENDPOINT || 'https://opencode.ai/zen/v1';

  if (!apiKey) {
    console.error('Error: ZEN_API_KEY or OPENCODE_API_KEY environment variable is required');
    process.exit(1);
  }

  // Validate configuration
  const configResult = ZenGatewayConfigSchema.safeParse({
    endpoint,
    apiKey,
    enabled: true,
  });

  if (!configResult.success) {
    console.error('Error: Invalid configuration', configResult.error.format());
    process.exit(1);
  }

  // Create and start the MCP server
  const server = new ZenMCPServer({
    config: configResult.data,
    name: 'zen-gateway',
  });

  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

