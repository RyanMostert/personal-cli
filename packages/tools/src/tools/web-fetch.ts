import { tool } from 'ai';
import { z } from 'zod';
import { TOOL_OUTPUT_MAX_CHARS } from '@personal-cli/shared';
import type { PermissionCallback } from '../types.js';

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function createWebFetch(permissionFn?: PermissionCallback) {
  return tool({
    description: 'Fetch content from a URL and return the extracted text.',
    inputSchema: z.object({
      url: z.string().url().describe('URL to fetch'),
    }),
    execute: async ({ url }) => {
      if (permissionFn) {
        const ok = await permissionFn('web_fetch', { url });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'personal-cli/0.1.0' },
          signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) return { error: `HTTP ${res.status}: ${res.statusText}` };

        const contentType = res.headers.get('content-type') ?? '';
        const raw = await res.text();
        const text = contentType.includes('html') ? htmlToText(raw) : raw;

        let output = text;
        if (output.length > TOOL_OUTPUT_MAX_CHARS) {
          output = output.slice(0, TOOL_OUTPUT_MAX_CHARS) + '\n... (truncated)';
        }

        return { output, url, contentType };
      } catch (err) {
        return { error: String(err) };
      }
    },
  });
}
