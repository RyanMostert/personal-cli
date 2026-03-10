import { tool } from 'ai';
import { z } from 'zod';
import { readdirSync, readFileSync } from 'fs';
import { resolve, join, relative, extname } from 'path';
import { TOOL_OUTPUT_MAX_CHARS } from '@personal-cli/shared';

const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', '.turbo', '.next', '__pycache__']);
const TEXT_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.txt',
  '.sh',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.css',
  '.scss',
  '.html',
  '.toml',
  '.env',
]);

interface Match {
  file: string;
  line: number;
  text: string;
}

function searchDir(
  dir: string,
  root: string,
  query: RegExp,
  results: Match[],
  filePattern?: RegExp,
) {
  if (results.length > 200) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      searchDir(full, root, query, results, filePattern);
    } else {
      const ext = extname(entry.name).toLowerCase();
      if (!TEXT_EXTS.has(ext)) continue;
      if (filePattern && !filePattern.test(entry.name)) continue;

      try {
        const content = readFileSync(full, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (query.test(lines[i])) {
            results.push({ file: relative(root, full), line: i + 1, text: lines[i].trim() });
            if (results.length >= 200) return;
          }
        }
<<<<<<< HEAD
      } catch (err) {
=======
      } catch {
>>>>>>> tools_improvement
        // Ignore unreadable files (e.g. binary or permissions)
      }
    }
  }
}

export const searchFiles = tool({
  description: 'Search for a string or regex pattern across files in a directory.',
  inputSchema: z.object({
    query: z.string().describe('Search query (supports regex)'),
    path: z.string().default('.').describe('Directory to search in'),
    filePattern: z.string().optional().describe('Filter files by name pattern (e.g. "*.ts")'),
    caseSensitive: z.boolean().default(false).describe('Case sensitive search'),
  }),
  execute: async ({ query, path, filePattern, caseSensitive }) => {
    const root = resolve(process.cwd(), path);
    const flags = caseSensitive ? 'g' : 'gi';
    let regex: RegExp;

    try {
      regex = new RegExp(query, flags);
    } catch {
      regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    }

    const fileRegex = filePattern ? new RegExp(filePattern.replace(/\*/g, '.*').replace(/\?/g, '.')) : undefined;

    const results: Match[] = [];
    searchDir(root, root, regex, results, fileRegex);

    if (results.length === 0) return { output: 'No matches found.' };

    let output = results.map((r) => `${r.file}:${r.line}: ${r.text.slice(0, 120)}`).join('\n');

    if (output.length > TOOL_OUTPUT_MAX_CHARS) {
      output = output.slice(0, TOOL_OUTPUT_MAX_CHARS) + '\n... (truncated)';
    }

    return { output, matchCount: results.length };
  },
});
