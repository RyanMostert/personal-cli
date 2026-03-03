import type { CommandContext } from '../types/commands.js';

export interface Command {
  cmd: string;
  description: string;
  aliases?: string[];
  handler: (args: string, ctx: CommandContext) => void | Promise<void>;
}

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
    description: 'Show available commands',
    handler: (_, ctx) => {
      const list = commands.map(c => `${c.cmd} — ${c.description}`).join('\n');
      ctx.addSystemMessage(list);
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
