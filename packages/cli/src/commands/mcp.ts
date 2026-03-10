import type { CommandContext } from '../types/commands.js';
import type { Command } from './types.js';

export const mcpCommands: Command[] = [
  {
    cmd: '/mcp',
    description: 'Manage MCP servers and external tools',
    handler: (args: string, ctx: CommandContext) => {
      if (!args) {
        ctx.openMCPManager();
        return;
      }
      // Subcommands handled in app.tsx
    },
  },
  {
    cmd: '/zen',
    description: 'Manage Zen Gateway MCP server',
    category: 'mcp',
    examples: ['/zen status', '/zen models', '/zen add'],
    handler: async (args: string, ctx: CommandContext) => {
      const parts = args.trim().split(/\s+/);
      const subcommand = parts[0];

      switch (subcommand) {
        case 'status': {
          ctx.addSystemMessage('Checking Zen Gateway status...');
          try {
            const status = await ctx.getZenGatewayStatus?.();
            if (status) {
              const msg = status.connected
                ? `✅ **Zen Gateway Connected**\n📍 Endpoint: ${status.endpoint}\n📊 Models available: ${status.modelsAvailable}`
                : `❌ **Zen Gateway Not Connected**\n📍 Endpoint: ${status.endpoint}\n⚠️ Error: ${status.lastError}`;
              ctx.addSystemMessage(msg);
            } else {
              ctx.addSystemMessage(
                '❌ Zen Gateway is not configured. Run `/zen add` to set it up.',
              );
            }
          } catch (error) {
            ctx.addSystemMessage(
              `❌ Failed to check Zen Gateway status: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
          break;
        }

        case 'models': {
          ctx.addSystemMessage('Fetching available models from Zen Gateway...');
          try {
            const models = await ctx.listZenModels?.();
            if (models && models.length > 0) {
              let msg = '## Available Zen Gateway Models\n\n';
              for (const model of models) {
                msg += `- **${model.id}** (${model.provider})\n`;
                if (model.description) msg += `  ${model.description}\n`;
                if (model.maxTokens) msg += `  Max tokens: ${model.maxTokens.toLocaleString()}\n`;
                msg += '\n';
              }
              ctx.addSystemMessage(msg);
            } else if (models) {
              ctx.addSystemMessage(
                'No models available. Make sure Zen Gateway is properly configured.',
              );
            } else {
              ctx.addSystemMessage(
                '❌ Zen Gateway is not configured. Run `/zen add` to set it up.',
              );
            }
          } catch (error) {
            ctx.addSystemMessage(
              `❌ Failed to fetch models from Zen Gateway: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
          break;
        }

        case 'add':
        case 'configure': {
          await ctx.configureZenGateway?.();
          break;
        }

        case 'remove':
        case 'delete': {
          await ctx.removeZenGateway?.();
          ctx.addSystemMessage('🗑️ Zen Gateway configuration removed.');
          break;
        }

        default: {
          const msg = `## Zen Gateway Commands\n\n**Usage:** /zen <command>\n\n**Commands:**\n- "/zen status" — Check connection status\n- "/zen models" — List available AI models\n- "/zen add" or "/zen configure" — Configure Zen Gateway\n- "/zen remove" — Remove Zen Gateway configuration\n\nZen Gateway provides unified access to multiple AI models through a single API.`;
          ctx.addSystemMessage(msg);
        }
      }
    },
  },
];
