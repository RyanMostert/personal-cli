import type { Command } from './types.js';
import { getAllToolSchemas, loadPlugins, getPluginDir } from '@personal-cli/tools';

export const toolsCommands: Command[] = [
  {
    cmd: '/tools',
    description: 'List all available tools (built-in + plugins)',
    handler: async (_, ctx) => {
      const plugins = await loadPlugins();
      const tools = getAllToolSchemas(plugins);
      const byCategory: Record<string, typeof tools> = {};
      for (const tool of tools) {
        if (!byCategory[tool.category]) byCategory[tool.category] = [];
        byCategory[tool.category].push(tool);
      }
      let msg = '## Available Tools\n\n';
      for (const [cat, catTools] of Object.entries(byCategory)) {
        msg += `### ${cat}\n`;
        for (const t of catTools) {
          msg += `- **${t.name}**: ${t.description}\n`;
        }
        msg += '\n';
      }
      msg += `\nPlugin dir: ${getPluginDir()}`;
      ctx.addSystemMessage(msg);
    },
  },
];
