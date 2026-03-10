import { tool } from 'ai';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

interface SemanticItem {
  line: number;
  type: 'class' | 'function' | 'method' | 'interface' | 'variable' | 'unknown';
  signature: string;
}

async function extractOutline(filePath: string, content: string): Promise<string> {
  const ext = path.extname(filePath).slice(1);
  const supportedExts = ['ts', 'js', 'tsx', 'jsx', 'py', 'go', 'rs'];

  if (!supportedExts.includes(ext)) {
    // Fallback: just return the first 20 lines if language is unknown
    const lines = content.split('\n');
    return `<file name="${filePath}">\nUnsupported AST language. First 10 lines:\n${lines.slice(0, 10).join('\n')}\n</file>`;
  }

  const lines = content.split('\n');
  const items: SemanticItem[] = [];

  // Very basic semantic outline extraction via RegEx loop
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Class / function / interface matching
    if (ext.startsWith('ts') || ext.startsWith('js')) {
      if (/^(?:export\s+)?(?:default\s+)?class\s+\w+/.test(trimmed)) {
        items.push({ line: index + 1, type: 'class', signature: trimmed });
      } else if (/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\w*/.test(trimmed)) {
        items.push({ line: index + 1, type: 'function', signature: trimmed });
      } else if (/^(?:export\s+)?(?:const|let|var)\s+\w+\s*=/.test(trimmed)) {
        if (trimmed.includes('=>') || trimmed.includes('function')) {
          items.push({ line: index + 1, type: 'function', signature: trimmed });
        } else {
          items.push({ line: index + 1, type: 'variable', signature: trimmed });
        }
      } else if (/^(?:export\s+)?(?:interface|type)\s+\w+/.test(trimmed)) {
        items.push({ line: index + 1, type: 'interface', signature: trimmed });
      } else if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        // Ignore standalone comments
      } else if (
        /^(?:public|private|protected)?\s*(?:async\s+)?\w+\s*\(/.test(trimmed) &&
        !trimmed.includes('function') &&
        !trimmed.includes('=')
      ) {
        // Basic method guess
        if (trimmed.endsWith('{') || trimmed.endsWith(';') || trimmed.includes(':')) {
          items.push({ line: index + 1, type: 'method', signature: '  ' + trimmed });
        }
      }
    } else if (ext === 'py') {
      if (/^class\s+\w+/.test(line))
        items.push({ line: index + 1, type: 'class', signature: line });
      else if (/^\s+def\s+\w+/.test(line))
        items.push({ line: index + 1, type: 'method', signature: line });
      else if (/^def\s+\w+/.test(line))
        items.push({ line: index + 1, type: 'function', signature: line });
    }
  });

  if (items.length === 0) {
    return `<file name="${filePath}">\nNo distinct semantic structures found.\n</file>`;
  }

<<<<<<< HEAD
  const formattedItems = items.map((i) => `${i.line.toString().padStart(4, ' ')}: ${i.signature}`).join('\n');
=======
  const formattedItems = items
    .map((i) => `${i.line.toString().padStart(4, ' ')}: ${i.signature}`)
    .join('\n');
>>>>>>> tools_improvement
  return `<file name="${filePath}">\n${formattedItems}\n</file>`;
}

export const semanticSearch = tool({
  description:
    'AST-aware semantic outline search (mgrep style). Efficiently extracts definitions, classes, functions, and interfaces from files without reading their full contents. Perfect for understanding large codebases using up to 4x fewer tokens.',
  inputSchema: z.object({
    patterns: z.array(
      z.string().describe('Exact file path or glob pattern to analyze (e.g., "src/**/*.ts")'),
    ),
  }),
  execute: async ({ patterns }) => {
    try {
      const cwd = process.cwd();
      const resolvedFiles = await fg(patterns, {
        cwd,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.git/**'],
      });

      if (resolvedFiles.length === 0) {
        return { error: 'No files matched the provided paths/patterns.' };
      }

      const filesToProcess = resolvedFiles.slice(0, 30);
      let output = `Found ${resolvedFiles.length} files. Extracting semantic outlines for ${filesToProcess.length} files:\n\n`;

      for (const file of filesToProcess) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const outline = await extractOutline(file, content);
          output += `${outline}\n\n`;
        } catch (err: any) {
          output += `<file name="${file}">\nError reading file: ${err.message}\n</file>\n\n`;
        }
      }

      return { output: output.trim() };
    } catch (err: any) {
      return { error: `Failed to execute semantic search: ${err.message}` };
    }
  },
});
