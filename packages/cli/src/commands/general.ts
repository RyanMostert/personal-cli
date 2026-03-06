import type { Command } from './types.js';
import { getAllToolSchemas, loadPlugins, listMacros, getPluginDir, getMacroDir } from '@personal-cli/tools';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const generalCommands: Command[] = [
  {
    cmd: '/clip',
    description: 'Attach an image from the clipboard as a file',
    async handler(_args, ctx) {
      ctx.addSystemMessage('Extracting clipboard image...');
      try {
        const scriptPath = path.join(__dirname, '../../scripts/save_clipboard_image.py');
        const outPath = path.join(os.tmpdir(), `clipimg-${Date.now()}.png`);
        const python = process.platform === 'win32' ? 'python' : 'python3';
        const res = await new Promise<string>((resolve, reject) => {
          const proc = spawn(python, [scriptPath, outPath]);
          let stdout = '';
          let stderr = '';
          proc.stdout.on('data', (data) => (stdout += data.toString()));
          proc.stderr.on('data', (data) => (stderr += data.toString()));
          proc.on('close', (code) => {
            if (code === 0 && fs.existsSync(outPath)) {
              resolve(outPath);
            } else {
              reject(stderr || stdout || `Clipboard image extraction failed (code ${code})`);
            }
          });
        });
        const ok = await ctx.attachFile(res);
        if (ok) ctx.addSystemMessage('Clipboard image attached!');
        else ctx.addSystemMessage('Failed to attach clipboard image.');
      } catch (err) {
        ctx.addSystemMessage(typeof err === 'string' ? err : err instanceof Error ? err.message : 'Clipboard image not found.');
      }
    },
  },
  {
    cmd: '/exit',
    aliases: ['/quit'],
    description: 'Exit the application',
    handler: (_, ctx) => ctx.exit(),
  },
  {
    cmd: '/clear',
    description: 'Clear conversation history',
    handler: (_, ctx) => ctx.clearMessages(),
  },
  {
    cmd: '/help',
    description: 'Show available commands and examples',
    category: 'help',
    handler: (args, ctx) => {
      if (args === 'examples') {
        let msg = '## Example Tasks\n\n';
        msg += 'Use `/help tools` to see available tools';
        ctx.addSystemMessage(msg);
        return;
      }

      if (args === 'tools') {
        const plugins = loadPlugins();
        const tools = getAllToolSchemas(plugins);
        const byCategory: Record<string, typeof tools> = {};
        for (const tool of tools) {
          if (!byCategory[tool.category]) byCategory[tool.category] = [];
          byCategory[tool.category].push(tool);
        }
        let msg = '## Available Tools\n\n';
        for (const [cat, catTools] of Object.entries(byCategory)) {
          msg += `### ${cat}\n`;
          for (const t of catTools) msg += `- **${t.name}**: ${t.description}\n`;
          msg += '\n';
        }
        msg += `\nPlugin dir: ${getPluginDir()}`;
        ctx.addSystemMessage(msg);
        return;
      }

      // Simplified help
      ctx.addSystemMessage('Use `/help tools` or `/help examples`');
    },
  },
];
