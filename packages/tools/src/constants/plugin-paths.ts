import { join } from 'path';
import { homedir } from 'os';

export const PLUGIN_DIR = () => join(homedir(), '.personal-cli', 'plugins');
export const MACRO_DIR = () => join(homedir(), '.personal-cli', 'macros');

export interface MacroDefinition {
  name: string;
  description?: string;
  steps: MacroStep[];
}

export interface MacroStep {
  tool: string;
  args?: Record<string, unknown>;
}
