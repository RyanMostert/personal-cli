import type { CommandContext } from '../types/commands.js';

export interface Command {
  cmd: string;
  description: string;
  aliases?: string[];
  category?: string;
  examples?: string[];
  handler: (args: string, ctx: CommandContext) => void | Promise<void>;
}
