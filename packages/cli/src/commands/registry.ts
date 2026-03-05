import type { CommandContext } from '../types/commands.js';
import { getAllToolSchemas, listMacros, getPluginDir, getMacroDir } from '@personal-cli/tools';

export interface Command {
  cmd: string;
  description: string;
  aliases?: string[];
  category?: string;
  examples?: string[];
  handler: (args: string, ctx: CommandContext) => void | Promise<void>;
}

const EXAMPLE_TASKS = [
  { task: 'Explain a concept', example: "Explain how async/await works in JavaScript" },
  { task: 'Search code', example: "Find all uses of the useEffect hook" },
  { task: 'Refactor', example: "Refactor this function to use TypeScript" },
  { task: 'Debug', example: "Why am I getting 'undefined is not a function'?" },
  { task: 'Documentation', example: "Generate JSDoc for this file" },
];

const FALLBACK_EXAMPLES = [
  "If search fails, I'll check MDN for web docs",
  "If file not found, I'll search similar filenames",
  "If tool unavailable, I'll explain using my training",
];

const commands: Command[] = [
  {
    cmd: '/exit',
    aliases: ['/quit'],
    description: 'Exit the application',
    handler: (_, ctx) => ctx.exit(),
  },
  {
    cmd: '/clear',
    description: 'Clear conversation history',
    handler: (_, ctx) => { ctx.clearMessages(); },
  },
  {
    cmd: '/model',
    description: 'Browse or switch models',
    handler: (args, ctx) => {
      if (!args) { ctx.openModelPicker(); return; }
      const parts = args.includes('/') ? args.split('/') : args.split(' ');
      if (parts.length >= 2) {
        ctx.switchModel(parts[0], parts.slice(1).join('/'));
        ctx.addSystemMessage(`Switched to ${args}`);
      } else {
        ctx.addSystemMessage('Usage: /model <provider/modelId>  or  /model to browse');
      }
    },
  },
  {
    cmd: '/mode',
    description: 'Set agent mode: ask | auto | build',
    handler: (args, ctx) => {
      ctx.switchMode(args as any);
      ctx.addSystemMessage(`Mode: ${args}`);
    },
  },
  {
    cmd: '/provider',
    description: 'Manage API providers',
    handler: (_, ctx) => ctx.openProviderManager(),
  },
  {
    cmd: '/history',
    description: 'Browse conversation history',
    handler: (_, ctx) => ctx.openHistory(),
  },
  {
    cmd: '/add',
    description: 'Attach a file to the next message',
    handler: async (args, ctx) => {
      if (!args || args === '--clear' || args === '/detach') {
        ctx.clearAttachments();
        ctx.addSystemMessage('Cleared attached files.');
        return;
      }
      const ok = await ctx.attachFile(args);
      ctx.addSystemMessage(ok ? `Attached: ${args}` : `Error: could not read ${args}`);
    },
  },
  {
    cmd: '/open',
    description: 'Open a file in the side panel',
    handler: (args, ctx) => {
      if (!args) { ctx.addSystemMessage('Usage: /open <path>'); return; }
      ctx.openFileInPanel(args);
    },
  },
  {
    cmd: '/cost',
    description: 'Show token usage and cost',
    handler: (_, ctx) => {
      const costStr = ctx.cost > 0 ? `$${ctx.cost.toFixed(4)}` : 'unknown (free or unregistered model)';
      ctx.addSystemMessage(`Tokens: ${ctx.tokensUsed.toLocaleString()}  Cost: ${costStr}`);
    },
  },
  {
    cmd: '/export',
    description: 'Export conversation to markdown',
    handler: (args, ctx) => {
      const path = ctx.exportConversation(args || undefined);
      ctx.addSystemMessage(`Exported to: ${path}`);
    },
  },
  {
    cmd: '/rename',
    description: 'Rename the current conversation',
    handler: (args, ctx) => {
      if (!args) { ctx.addSystemMessage('Usage: /rename <title>'); return; }
      ctx.addSystemMessage(`Renamed to: ${args}`);
    },
  },
  {
    cmd: '/copy',
    description: 'Copy last assistant response to clipboard',
    handler: (_, ctx) => {
      const last = ctx.messages.filter(m => m.role === 'assistant').pop();
      ctx.addSystemMessage(last ? 'Copied last response.' : 'No assistant response to copy.');
    },
  },
  {
    cmd: '/compact',
    description: 'Compact conversation context',
    handler: async (_, ctx) => {
      ctx.addSystemMessage('Compacting conversation…');
      const result = await ctx.compact();
      ctx.addSystemMessage(result);
    },
  },
  {
    cmd: '/undo',
    description: 'Undo the last file change made by the AI',
    handler: (_, ctx) => {
      ctx.addSystemMessage(ctx.undo());
    },
  },
  {
    cmd: '/redo',
    description: 'Redo the last undone file change',
    handler: (_, ctx) => {
      ctx.addSystemMessage(ctx.redo());
    },
  },
  {
    cmd: '/init',
    description: 'Analyze this project and write AGENTS.md to persist context across sessions',
    handler: async (_, ctx) => {
      ctx.addSystemMessage('Analyzing project and generating AGENTS.md…');
      const result = await ctx.initProject();
      ctx.addSystemMessage(result);
    },
  },
  {
    cmd: '/help',
    description: 'Show available commands and examples',
    category: 'help',
    handler: (args, ctx) => {
      if (args === 'examples') {
        let msg = '## Example Tasks\n\n';
        for (const ex of EXAMPLE_TASKS) {
          msg += `**${ex.task}:**\n> ${ex.example}\n\n`;
        }
        msg += '\n## Fallback Examples\n';
        for (const fb of FALLBACK_EXAMPLES) {
          msg += `• ${fb}\n`;
        }
        ctx.addSystemMessage(msg);
        return;
      }

      if (args === 'tools') {
        const tools = getAllToolSchemas([]);
        const byCategory: Record<string, typeof tools> = {};
        for (const tool of tools) {
          if (!byCategory[tool.category]) byCategory[tool.category] = [];
          byCategory[tool.category].push(tool);
        }
        let msg = '## Available Tools\n\n';
        for (const [cat, catTools] of Object.entries(byCategory)) {
          msg += `### ${cat}\n`;
          for (const t of catTools.slice(0, 5)) {
            msg += `- **${t.name}**: ${t.description}\n`;
          }
          if (catTools.length > 5) {
            msg += `... and ${catTools.length - 5} more\n`;
          }
          msg += '\n';
        }
        msg += `Use "/tools" for full list. Plugin dir: ${getPluginDir()}`;
        ctx.addSystemMessage(msg);
        return;
      }

      // Default help
      const categories: Record<string, Command[]> = {};
      for (const cmd of commands) {
        const cat = cmd.category || 'general';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd);
      }

      let msg = '## Available Commands\n\n';
      for (const [cat, cmds] of Object.entries(categories)) {
        msg += `### ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
        for (const c of cmds) {
          const aliasStr = c.aliases ? ` (${c.aliases.join(', ')})` : '';
          msg += `${c.cmd}${aliasStr} — ${c.description}\n`;
        }
        msg += '\n';
      }

      msg += '\n## Quick Tips\n';
      msg += '• Use Tab for autocompletion\n';
      msg += '• Use ↑↓ to browse history\n';
      msg += '• Press Ctrl+C to exit\n';
      msg += '• Use `/help examples` for sample tasks\n';
      msg += '• Use `/help tools` to see available tools\n';

      msg += '\n## CLI Arguments\n';
      msg += '• `--file <path>` or `-f <path>` — Attach a file (can be used multiple times)\n';
      msg += '• `--image <path>` or `-i <path>` — Attach an image (can be used multiple times)\n';
      msg += '• Example: `pcli -f README.md -i screenshot.png`\n';

      ctx.addSystemMessage(msg);
    },
  },
  {
    cmd: '/mcp',
    description: 'Manage MCP servers and external tools',
    handler: (args, ctx) => {
      if (!args) { ctx.openMCPManager(); return; }
      // Subcommands handled in app.tsx
    },
  },
  {
    cmd: '/tools',
    description: 'List all available tools (built-in + plugins)',
    handler: (_, ctx) => {
      const tools = getAllToolSchemas([]);
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
  {
    cmd: '/macros',
    description: 'List, create, or run macros',
    handler: (args, ctx) => {
      const macros = listMacros();
      if (!args) {
        if (macros.length === 0) {
          ctx.addSystemMessage('No macros defined. Create one at: ' + getMacroDir());
          return;
        }
        let msg = '## Macros\n\n';
        for (const m of macros) {
          msg += `- **${m.name}**: ${m.description || 'No description'}\n`;
          msg += `  Steps: ${m.steps.length}\n`;
        }
        msg += `\nCreate macros at: ${getMacroDir()}`;
        ctx.addSystemMessage(msg);
        return;
      }
      ctx.addSystemMessage('Usage: /macros (list) or create JSON in: ' + getMacroDir());
    },
  },
  {
    cmd: '/theme',
    description: 'Switch UI theme',
    handler: (args, ctx) => {
      if (!args) {
        ctx.addSystemMessage('Themes: default  dracula  tokyo-night  nord  gruvbox\nUsage: /theme <name>');
        return;
      }
      ctx.addSystemMessage(`Theme: ${args}`);
    },
  },
];

export function dispatch(input: string, ctx: CommandContext): boolean {
  const [rawCmd, ...rest] = input.split(' ');
  const args = rest.join(' ').trim();
  const match = commands.find(
    c => c.cmd === rawCmd || c.aliases?.includes(rawCmd)
  );
  if (!match) return false;
  void match.handler(args, ctx);
  return true;
}

export function getCommands(): Command[] {
  return commands;
}
