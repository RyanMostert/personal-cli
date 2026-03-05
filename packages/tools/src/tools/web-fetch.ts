import { tool } from 'ai';
import { z } from 'zod';
import type { PermissionCallback } from '../types.js';

// Content limits for different fetching strategies
const JINA_LIMIT = 25000;   // High-quality markdown from Jina Reader
const FALLBACK_LIMIT = 10000; // Fallback plain text extraction

/**
 * Strips HTML tags, scripts, and styles to return clean text.
 * Fallback for when Jina Reader is unavailable or disabled.
 */
function cleanHtml(html: string): string {
  let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  text = text.replace(/<[^>]*>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"');
  return text.replace(/\s+/g, ' ').trim();
}

export function createWebFetch(permissionFn?: PermissionCallback) {
  return tool({
    description: 'Fetch content from a URL. Uses Jina Reader to get high-quality Markdown, falling back to a clean text-only version.',
    inputSchema: z.object({
      url: z.string().describe('The URL to fetch'),
      useRaw: z.boolean().optional().default(false).describe('If true, skips Jina Reader and attempts a direct fetch.'),
    }),
    execute: async ({ url, useRaw }) => {
      if (permissionFn) {
        const ok = await permissionFn('webFetch', { url });
        if (!ok) return { error: 'Permission denied by user.' };
      }

      const userAgent = 'Mozilla/5.0 (compatible; PersonalCLI/1.0; +https://github.com/ramos/personal-cli)';

      try {
        // 1. Try Jina Reader first (Standard for OpenCode / high-fidelity agents)
        if (!useRaw) {
          try {
            const jinaUrl = `https://r.jina.ai/${url}`;
            const jinaRes = await fetch(jinaUrl, {
              headers: { 'User-Agent': userAgent }
            });
            if (jinaRes.ok) {
              const markdown = await jinaRes.text();
              return { 
                output: markdown.slice(0, JINA_LIMIT),
                metadata: { source: 'jina-reader', url }
              };
            }
          } catch (e) {
            // Fallback to direct fetch
          }
        }

        // 2. Direct Fetch Fallback
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
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
        const finalOutput = cleaned.length > FALLBACK_LIMIT 
          ? cleaned.slice(0, FALLBACK_LIMIT) + "\n\n[CONTENT_TRUNCATED]"
          : cleaned;

        return { 
          output: finalOutput,
          metadata: { source: 'direct-fetch', url, status: res.status }
        };
      } catch (err) {
        return { error: `NETWORK_FAILURE: ${String(err)}` };
      }
    },
  });
}
