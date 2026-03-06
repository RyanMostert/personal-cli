import type { CommandContext } from '../types/commands.js';
import type { Command } from './types.js';
import { getAllToolSchemas, loadPlugins, getPluginDir } from '@personal-cli/tools';
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
];
