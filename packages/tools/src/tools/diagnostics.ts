import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execAsync = promisify(exec);

export const diagnostics = tool({
  description: 'Get TypeScript type errors and diagnostics for specific files. Runs tsc --noEmit in the background and filters exclusively for the files you request, saving context window size.',
  parameters: z.object({
    paths: z.array(z.string()).describe('List of exact file paths to get diagnostics for (e.g., ["packages/cli/src/app.tsx"])'),
  }),
  // @ts-expect-error Type inference fails on required zod arrays in Vercel AI SDK 6
  execute: async ({ paths }) => {
    try {
      const cwd = process.cwd();
      
      // Run TS compilation without emitting files, formatted for easy string parsing
      // We expect this to fail (return non-zero exit code) if there are type errors!
      let stdout = '';
      try {
        const { stdout: out } = await execAsync('npx tsc --noEmit --pretty false', { cwd });
        stdout = out;
      } catch (err: any) {
        // exec throws if the exit code is non-zero, but we WANT the stdout
        stdout = err.stdout || '';
      }

      if (!stdout) {
        return { output: 'No TypeScript errors found in the project. The build is perfectly clean!' };
      }

      const lines = stdout.split('\n');
      const relevantErrors: string[] = [];

      for (const rawPath of paths) {
        // Resolve exactly what tsc outputs: relative to tsconfig root
        // usually tsc outputs: "packages/cli/src/app.tsx(15,2): error TS2322: ..."
        const escaped = rawPath.replace(/[/\\]/g, '[/\\\\]');
        const fileRegex = new RegExp(`^${escaped}\\(\\d+,\\d+\\):\\s+error`);
        
        let foundForFile = false;
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (fileRegex.test(trimmed) || (trimmed.startsWith(rawPath))) {
            relevantErrors.push(trimmed);
            foundForFile = true;
          }
        }

        if (!foundForFile) {
          relevantErrors.push(`${rawPath}: No type errors.`);
        }
      }

      if (relevantErrors.length === 0) {
        return { output: 'No matching errors found for the requested files.' };
      }

      return { output: relevantErrors.join('\n') };
    } catch (err: any) {
      return { error: `Failed to run diagnostics: ${err.message}` };
    }
  },
});
