import { tool } from 'ai';
import { z } from 'zod';
import type { PermissionCallback } from '../types.js';

/**
 * Strips HTML tags, scripts, and styles to return clean text.
 */
function cleanHtml(html: string): string {
  // Remove scripts and styles
  let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Remove all other tags
  text = text.replace(/<[^>]*>/g, ' ');
  // Decode common entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"');
  // Collapse whitespace
  return text.replace(/\s+/g, ' ').trim();
}

export function createWebFetch(permissionFn?: PermissionCallback) {
  return tool({
    description: 'Fetch content from a URL. Returns a cleaned, text-only version of the page for AI consumption.',
    inputSchema: z.object({
      url: z.string().describe('The URL to fetch'),
    }),
    execute: async ({ url }) => {
      if (permissionFn) {
        const ok = await permissionFn('web_fetch', { url });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PersonalCLI/1.0; +https://github.com/google-gemini/gemini-cli)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeout);

        if (!res.ok) {
          return { error: `HTTP_ERROR ${res.status}: ${res.statusText}` };
        }

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          return { output: JSON.stringify(data, null, 2) };
        }

        const html = await res.text();
        const cleaned = cleanHtml(html);
        
        // Truncate to reasonable length for context
        const limit = 15000;
        const finalOutput = cleaned.length > limit 
          ? cleaned.slice(0, limit) + "\n\n[CONTENT_TRUNCATED_DUE_TO_SIZE]"
          : cleaned;

        return { 
          output: finalOutput,
          metadata: {
            url,
            status: res.status,
            length: cleaned.length
          }
        };
      } catch (err) {
        return { error: `NETWORK_FAILURE: ${String(err)}` };
      }
    },
  });
}
