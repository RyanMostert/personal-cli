import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { PLUGIN_DIR, MACRO_DIR, type MacroDefinition } from '../constants/plugin-paths.js';

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    import('fs').then((fs) => {
      fs.mkdirSync(dir, { recursive: true });
    });
  }
}

export function getMacroDir(): string {
  return MACRO_DIR();
}

export function listMacros(): MacroDefinition[] {
  const macroDir = MACRO_DIR();
  ensureDir(macroDir);

  const macros: MacroDefinition[] = [];
  const files = readdirSync(macroDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    try {
      const content = readFileSync(join(macroDir, file), 'utf-8');
      macros.push(JSON.parse(content));
    } catch (err) {
      console.warn(`Failed to load macro from ${file}:`, err);
    }
  }

  return macros;
}

export function saveMacro(macro: MacroDefinition): void {
  const macroDir = MACRO_DIR();
  ensureDir(macroDir);

  const filename = `${macro.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  writeFileSync(join(macroDir, filename), JSON.stringify(macro, null, 2));
}

export function deleteMacro(name: string): boolean {
  const macroDir = MACRO_DIR();
  const filename = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
  const filepath = join(macroDir, filename);

  if (!existsSync(filepath)) return false;

  unlinkSync(filepath);
  return true;
}

export function getPluginDir(): string {
  return PLUGIN_DIR();
}
