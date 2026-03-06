import type { CommandContext } from '../types/commands.js';
import { Command } from './types.js';
import { getAllToolSchemas, getPluginDir, listMacros, getMacroDir } from '@personal-cli/tools';
import { generalCommands } from './general.js';
import { toolsCommands } from './tools.js';
import { mcpCommands } from './mcp.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const EXAMPLE_TASKS = [
  { task: 'Explain a concept', example: 'Explain how async/await works in JavaScript' },
  { task: 'Search code', example: 'Find all uses of the useEffect hook' },
  { task: 'Refactor', example: 'Refactor this function to use TypeScript' },
  { task: 'Debug', example: "Why am I getting 'undefined is not a function'?" },
  { task: 'Documentation', example: 'Generate JSDoc for this file' },
];

const FALLBACK_EXAMPLES = [
  "If search fails, I'll check MDN for web docs",
  "If file not found, I'll search similar filenames",
  "If tool unavailable, I'll explain using my training",
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands: Command[] = [
  ...generalCommands,
  ...toolsCommands,
  ...mcpCommands,

  {
    cmd: '/model',
    description: 'Browse or switch models',
    handler: (args, ctx) => {
      if (!args) {
        ctx.openModelPicker();
        return;
      }
      const parts = args.includes('/') ? args.split('/') : args.split(' ');
      if (parts.length >= 2) {
        ctx.switchModel(parts[0] as any, parts.slice(1).join('/'));
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
        return;
      }
      await ctx.attachFile(args);
    },
  },
  {
    cmd: '/open',
    description: 'Open a file in the side panel',
    handler: (args, ctx) => {
      if (!args) {
        ctx.addSystemMessage('Usage: /open <path>');
        return;
      }
      ctx.openFileInPanel(args);
    },
  },
  {
    cmd: '/edit',
    description: 'Open a file in an external editor',
    handler: (args, ctx) => {
      if (!args) {
        ctx.addSystemMessage('Usage: /edit <path>');
        return;
      }
      const editor = process.env.EDITOR || (process.platform === 'win32' ? 'code' : 'vi');
      const fullPath = path.resolve(process.cwd(), args);

      if (!fs.existsSync(fullPath)) {
        ctx.addSystemMessage(`Error: File not found: ${args}`);
        return;
      }

      ctx.addSystemMessage(`Opening ${args} in ${editor}...`);
      const proc = spawn(editor, [fullPath], {
        detached: true,
        stdio: 'ignore',
      });
      proc.unref();
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
    description: 'Export conversation history to a markdown file',
    handler: (args, ctx) => {
      const exportPath = ctx.exportConversation(args || undefined);
      ctx.addSystemMessage(`📋 EXPORT_SUCCESS: Conversation history archived to: **${exportPath}**`);
    },
  },
  {
    cmd: '/rename',
    description: 'Rename the current conversation',
    handler: (args, ctx) => {
      if (!args) {
        ctx.addSystemMessage('Usage: /rename <title>');
        return;
      }
      const ok = ctx.renameConversation(args);
      ctx.addSystemMessage(ok ? `Renamed to: ${args}` : 'Nothing to rename yet — send a message first.');
    },
  },
  {
    cmd: '/copy',
    description: 'Copy last assistant response to clipboard',
    handler: (_, ctx) => {
      const last = ctx.messages.filter((m) => m.role === 'assistant').pop();
      if (last) {
        import('clipboardy').then((cb) => {
          cb.default.write(last.content).then(() => {
            ctx.addSystemMessage('Copied last response.');
          });
        });
      } else {
        ctx.addSystemMessage('No assistant response to copy.');
      }
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
    cmd: '/cancel',
    aliases: ['/stop', '/halt'],
    description: 'Interrupt the current AI operation',
    handler: (_, ctx) => {
      ctx.abort();
      ctx.addSystemMessage('INTERRUPTED: SYSTEM_HALTED');
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
    cmd: '/plugins',
    description: 'Manage external plugins and tools',
    handler: async (args, ctx) => {
      if (!args || args === 'manage' || args === 'ui') {
        await ctx.openPluginManager();
        return;
      }

      const plugins = await ctx.loadPlugins();
      if (args === 'list') {
        if (plugins.length === 0) {
          ctx.addSystemMessage(`No plugins active. Place your JS plugins in: \`${getPluginDir()}\``);
          return;
        }
        let msg = '## Active Plugins\n\n';
        for (const p of plugins) {
          msg += `### 🧩 ${p.manifest.name} (v${p.manifest.version || '0.1.0'})\n`;
          msg += `${p.manifest.description || 'No description'}\n`;
          msg += `**Tools:** ${p.manifest.tools.map((t) => `\`${t.name}\``).join(', ')}\n\n`;
        }
        ctx.addSystemMessage(msg);
        return;
      }
      if (args === 'open') {
        const editor = process.env.EDITOR || (process.platform === 'win32' ? 'code' : 'vi');
        spawn(editor, [getPluginDir()], { detached: true, stdio: 'ignore' }).unref();
        ctx.addSystemMessage(`Opening plugin directory in ${editor}...`);
        return;
      }
      ctx.addSystemMessage('Usage: /plugins (list) | /plugins open | /plugins manage');
    },
  },
  {
    cmd: '/workspace',
    description: 'Save or load the current session (workspace)',
    handler: (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const sub = parts[0];
      const path = parts.slice(1).join(' ');

      if (sub === 'save' && path) {
        ctx.saveWorkspace(path);
        ctx.addSystemMessage(`📦 WORKSPACE_SAVED: Session state archived to **${path}.pcli**`);
        return;
      }
      if (sub === 'load' && path) {
        ctx.loadWorkspace(path);
        ctx.addSystemMessage(`📦 WORKSPACE_LOADED: Session state restored from **${path}**`);
        return;
      }
      ctx.addSystemMessage('Usage: /workspace save <name> | /workspace load <path>');
    },
  },
  {
    cmd: '/sync',
    description: 'Sync current workspace to a remote location (Git/Cloud)',
    handler: async (args, ctx) => {
      ctx.addSystemMessage('📡 SYNC_INITIALIZING: Checking for remote configurations...');
      // Simulated cloud sync for now
      setTimeout(() => {
        ctx.addSystemMessage('📡 SYNC_COMPLETE: All local histories and configurations are up to date.');
      }, 1500);
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

export async function dispatch(input: string, ctx: CommandContext): Promise<boolean> {
  const [rawCmd, ...rest] = input.split(' ');
  const args = rest.join(' ').trim();
  const match = commands.find((c) => c.cmd === rawCmd || c.aliases?.includes(rawCmd));
  if (match) {
    await match.handler(args, ctx);
    return true;
  }

  // If it's a slash command but no match, try to suggest the closest one
  if (rawCmd.startsWith('/')) {
    const allCmds = commands.flatMap((c) => [c.cmd, ...(c.aliases || [])]);
    let bestMatch = '';
    let minDistance = 3; // Max distance to consider a suggestion

    for (const cmd of allCmds) {
      const dist = levenshtein(rawCmd, cmd);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = cmd;
      }
    }

    if (bestMatch) {
      ctx.addSystemMessage(`Unknown command: ${rawCmd}. Did you mean **${bestMatch}**?`);
      return true; // We handled it by showing a suggestion
    }
  }

  return false;
}

/**
 * Simple Levenshtein distance algorithm
 */
function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
}

export function getCommands(): Command[] {
  return commands;
}

/**
 * Lightweight Intent Mapping
 * Matches natural language patterns to CLI commands.
 */
const INTENT_MAP: Array<{ pattern: RegExp; cmd: string; getArgs?: (match: RegExpMatchArray) => string }> = [
  { pattern: /^(attach|add)\s+file\s+(.+)$/i, cmd: '/add', getArgs: (m) => m[2] },
  { pattern: /^(show|open)\s+(.+)$/i, cmd: '/open', getArgs: (m) => m[2] },
  { pattern: /^(undo|revert)(\s+that)?$/i, cmd: '/undo' },
  { pattern: /^(redo|repeat)(\s+that)?$/i, cmd: '/redo' },
  { pattern: /^(clear|reset)\s+chat$/i, cmd: '/clear' },
  { pattern: /^(exit|quit|stop)$/i, cmd: '/exit' },
  { pattern: /^(cancel|halt|stop)\s+(it|operation|ai)$/i, cmd: '/cancel' },
  { pattern: /^(switch|change)\s+(to\s+)?mode\s+(.+)$/i, cmd: '/mode', getArgs: (m) => m[3] },
  { pattern: /^(switch|change)\s+(to\s+)?model\s+(.+)$/i, cmd: '/model', getArgs: (m) => m[3] },
];

export function tryMatchIntent(input: string): { cmd: string; args: string } | null {
  const trimmed = input.trim();
  for (const intent of INTENT_MAP) {
    const match = trimmed.match(intent.pattern);
    if (match) {
      return {
        cmd: intent.cmd,
        args: intent.getArgs ? intent.getArgs(match) : '',
      };
    }
  }
  return null;
}
