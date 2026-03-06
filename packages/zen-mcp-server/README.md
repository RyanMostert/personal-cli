# @personal-cli/zen-mcp-server

MCP server implementation for OpenCode Zen Gateway - providing unified access to multiple AI models through a single API.

## Features

- 🔌 **MCP Protocol Support**: Implements Model Context Protocol for seamless integration
- 🌐 **HTTP Transport**: Connects to Zen Gateway REST API
- 🚀 **Streaming Support**: Real-time streaming responses for chat completions
- 📊 **Model Management**: List and query available AI models
- 🔐 **Secure Authentication**: API key-based authentication with environment variable support
- 🛠️ **Multiple Tools**: Built-in MCP tools for chat, model listing, and status checks

## Installation

This package is part of the `personal-cli` monorepo workspace and is **not published to npm**. To use it within the workspace:

```bash
pnpm install
pnpm --filter @personal-cli/zen-mcp-server build
```

The built output will be available at `packages/zen-mcp-server/dist/main.js`.

## Usage

### As an MCP Server

```bash
# Set your API key
export OPENCODE_API_KEY=your-api-key
export ZEN_ENDPOINT=https://opencode.ai/zen/v1

# Run the server (from the workspace root)
node ./packages/zen-mcp-server/dist/main.js
```

Or configure it via personal-cli's MCP wizard using `/zen add` command.

### As a Library

```typescript
import { ZenGatewayClient, ZenMCPServer } from '@personal-cli/zen-mcp-server';

// Create a client
const client = new ZenGatewayClient({
  endpoint: 'https://opencode.ai/zen/v1',
  apiKey: 'your-api-key',
  enabled: true,
});

// List available models
const models = await client.listModels();

// Chat completion
const response = await client.chatCompletion({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Streaming chat completion
for await (const chunk of client.streamChatCompletion({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
})) {
  process.stdout.write(chunk);
}
```

### Running the MCP Server

```typescript
import { ZenMCPServer } from '@personal-cli/zen-mcp-server';

const server = new ZenMCPServer({
  config: {
    endpoint: 'https://opencode.ai/zen/v1',
    apiKey: 'your-api-key',
    enabled: true,
  },
  name: 'zen-gateway',
});

await server.start();
```

## Environment Variables

- `OPENCODE_API_KEY` or `ZEN_API_KEY` - Your Zen Gateway API key (required)
- `ZEN_ENDPOINT` - Custom endpoint URL (optional, defaults to `https://opencode.ai/zen/v1`)

## Available MCP Tools

### zen_chat
Send a chat completion request to the Zen Gateway.

**Input:**
```json
{
  "model": "gpt-4",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "maxTokens": 1000
}
```

### zen_list_models
List all available models from Zen Gateway.

### zen_get_status
Check Zen Gateway connection status.

## Available MCP Resources

- `zen://models` - JSON list of available AI models
- `zen://status` - Current connection status

## Error Handling

The server handles common error scenarios:
- **401 Unauthorized**: Invalid API key
- **429 Too Many Requests**: Rate limiting
- **Network Errors**: Connection issues with the gateway

## Configuration

When used with personal-cli, the configuration is stored in:
```
~/.personal-cli/mcp.json
```
(Windows: `%USERPROFILE%\.personal-cli\mcp.json`)

Example configuration:
```json
{
  "zen-gateway": {
    "transport": "stdio",
    "command": "node",
    "args": ["./packages/zen-mcp-server/dist/main.js"],
    "env": {
      "OPENCODE_API_KEY": "your-api-key",
      "ZEN_ENDPOINT": "https://opencode.ai/zen/v1"
    },
    "enabled": true
  }
}
```

## CLI Integration

When integrated with personal-cli, you can use:

```bash
# Check Zen Gateway status
/zen status

# List available models
/zen models

# Configure Zen Gateway
/zen add

# Remove Zen Gateway configuration
/zen remove
```

## License

MIT

