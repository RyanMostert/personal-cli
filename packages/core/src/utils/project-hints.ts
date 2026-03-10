import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const HINT_FILES = [
  '.pcli-hints',
  'AGENTS.md',
  'CONTEXT.md',
  'INSTRUCTIONS.md',
  '.goosehints',
  '.cursorrates',
];

export interface ProjectHint {
  file: string;
  content: string;
}

export function loadProjectHints(cwd: string): ProjectHint[] {
  const hints: ProjectHint[] = [];

  for (const file of HINT_FILES) {
    const path = join(cwd, file);
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8').trim();
        if (content) {
          hints.push({ file, content });
        }
      } catch {
        // Ignore unreadable hint files
      }
    }
  }

  return hints;
}

export function formatProjectHints(hints: ProjectHint[]): string {
  if (hints.length === 0) return '';
  return hints.map((h) => `### Source: ${h.file}\n${h.content}`).join('\n\n');
}
