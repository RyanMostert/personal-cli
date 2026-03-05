import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { MCPServerConfig } from '@personal-cli/mcp-client';
import { ZenGatewayClient } from './client.js';
import type { ZenGatewayConfig } from './types.js';

interface ZenMCPServerOptions {
  config: ZenGatewayConfig;
  name?: string;
}

export class ZenMCPServer {
  private server: Server;
  private client: ZenGatewayClient;
  private config: ZenGatewayConfig;
  private name: string;

  constructor(options: ZenMCPServerOptions) {
    this.config = options.config;
    this.name = options.name ?? 'zen-gateway';
    this.client = new ZenGatewayClient(options.config);

    this.server = new Server(
      {
        name: this.name,
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'zen_chat',
            description: 'Send a chat completion request to the Zen Gateway',
            inputSchema: {
              type: 'object',
              properties: {
                model: {
                  type: 'string',
                  description: 'Model ID to use (e.g., gpt-4, claude-3-opus)',
                },
                messages: {
                  type: 'array',
                  description: 'Array of messages',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                      content: { type: 'string' },
                    },
                    required: ['role', 'content'],
                  },
                },
                maxTokens: {
                  type: 'number',
                  description: 'Maximum tokens to generate',
                },
              },
              required: ['model', 'messages'],
            },
          },
          {
            name: 'zen_list_models',
            description: 'List all available models from Zen Gateway',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'zen_get_status',
            description: 'Check Zen Gateway connection status',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'zen_chat': {
            const { model, messages, maxTokens } = args as {
              model: string;
              messages: Array<{ role: string; content: string }>;
              maxTokens?: number;
            };

            const response = await this.client.chatCompletion({
              model,
              messages,
              maxTokens,
              stream: false,
            });

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content ?? '';

            return {
              content: [
                {
                  type: 'text',
                  text: content,
                },
              ],
            };
          }

          case 'zen_list_models': {
            const models = await this.client.listModels();
            const formatted = models
              .map((m) => `- ${m.id} (${m.provider}): ${m.description || 'No description'}`)
              .join('\n');

            return {
              content: [
                {
                  type: 'text',
                  text: `Available models:\n${formatted}`,
                },
              ],
            };
          }

          case 'zen_get_status': {
            const status = await this.client.getStatus();
            const text = status.connected
              ? `✅ Connected to ${status.endpoint}\n📊 Models available: ${status.modelsAvailable}`
              : `❌ Not connected to ${status.endpoint}\n⚠️ Error: ${status.lastError}`;

            return {
              content: [
                {
                  type: 'text',
                  text,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'zen://models',
            name: 'Available Models',
            mimeType: 'application/json',
            description: 'List of all AI models available through Zen Gateway',
          },
          {
            uri: 'zen://status',
            name: 'Gateway Status',
            mimeType: 'application/json',
            description: 'Current connection status of Zen Gateway',
          },
        ],
      };
    });

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        if (uri === 'zen://models') {
          const models = await this.client.listModels();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(models, null, 2),
              },
            ],
          };
        }

        if (uri === 'zen://status') {
          const status = await this.client.getStatus();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(status, null, 2),
              },
            ],
          };
        }

        throw new Error(`Unknown resource: ${uri}`);
      } catch (error) {
        throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  getMCPServerConfig(): MCPServerConfig {
    return {
      transport: 'stdio',
      command: 'node',
      args: [process.argv[1]],
      env: {
        ZEN_API_KEY: this.config.apiKey,
        ZEN_ENDPOINT: this.config.endpoint,
      },
      enabled: this.config.enabled,
      timeout: 60000,
      trust: false,
    };
  }
}
