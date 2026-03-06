import type { CommandContext } from '../types/commands.js';
import type { Command } from './types.js';
import { getAllToolSchemas, loadPlugins, getPluginDir } from '@personal-cli/tools';
import { ConfigStore } from '@personal-cli/core';
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
    async handler(_args: string, ctx: CommandContext) {
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
    handler: (_: string, ctx: CommandContext) => ctx.exit(),
  },
  {
    cmd: '/clear',
    description: 'Clear conversation history',
    handler: (_: string, ctx: CommandContext) => ctx.clearMessages(),
  },
  {
    cmd: '/settings',
    description: 'View or set CLI settings (list, get-flag, set-flag)',
    async handler(args: string, ctx: CommandContext) {
      const store = new ConfigStore();
      if (!args) {
        const s = store.loadSettings();
        ctx.addSystemMessage(`Settings:\n${JSON.stringify(s, null, 2)}`);
        return;
      }
      const parts = args.split(' ').filter(Boolean);
      const verb = parts[0];
      if (verb === 'list') {
        const s = store.loadSettings();
        ctx.addSystemMessage(JSON.stringify(s, null, 2));
        return;
      }
      if (verb === 'get-flag') {
        const key = parts[1];
        if (!key) {
          ctx.addSystemMessage('Usage: /settings get-flag <FLAG_NAME>');
          return;
        }
        const s = store.loadSettings();
        const val = s.featureFlags?.[key];
        ctx.addSystemMessage(`flag ${key} = ${val === undefined ? 'unset' : val}`);
        return;
      }
      if (verb === 'set-flag') {
        const key = parts[1];
        const val = parts[2];
        if (!key || !val) {
          ctx.addSystemMessage('Usage: /settings set-flag <FLAG_NAME> <on|off>');
          return;
        }
        const bool = ['1','true','on','enabled'].includes(val.toLowerCase());
        const s = store.loadSettings();
        const ff = s.featureFlags ?? {};
        ff[key] = bool;
        store.saveSettings({ featureFlags: ff });
        ctx.addSystemMessage(`Saved flag ${key} = ${bool}`);
        return;
      }
      ctx.addSystemMessage('Usage: /settings [list|get-flag <name>|set-flag <name> <on|off>]');
    },
  },
];
