import { tool } from 'ai';
import { z } from 'zod';
import { TOOL_OUTPUT_MAX_CHARS } from '@personal-cli/shared';
import type { PermissionCallback } from '../types.js';

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Convert block-level elements to newlines before stripping all tags
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|tr|section|article|header|footer|nav|main|aside|blockquote|pre)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/[ \t]{2,}/g, ' ')   // collapse horizontal whitespace only — not newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function createWebFetch(permissionFn?: PermissionCallback) {
  return tool({
    description: 'Fetch content from a URL and return the extracted text. After fetching, you MUST always summarize and present the key information to the user in your response — never leave an empty reply after calling this tool.',
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
        let text = contentType.includes('html') ? htmlToText(raw) : raw;

        // If stripping left almost nothing, the page is likely JS-rendered
        if (contentType.includes('html') && text.length < 200) {
          text = `[This page appears to be JavaScript-rendered and returned little or no static text content. Raw length: ${raw.length} bytes. URL: ${url}]`;
        }

        let output = text;
        if (output.length > TOOL_OUTPUT_MAX_CHARS) {
          output = output.slice(0, TOOL_OUTPUT_MAX_CHARS) + '\n... (truncated)';
        }

        return { output, url, contentType, _hint: 'Summarize the above content for the user.' };
      } catch (err) {
        return { error: String(err) };
      }
    },
  });
}
