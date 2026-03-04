import { codeToANSI } from '@shikijs/cli';
import type { BundledLanguage } from 'shiki';

const SUPPORTED_LANGS = new Set([
  'typescript', 'ts', 'javascript', 'js', 'tsx', 'jsx',
  'python', 'py', 'bash', 'sh', 'json', 'yaml', 'yml',
  'markdown', 'md', 'html', 'css', 'rust', 'go', 'java',
  'c', 'cpp', 'sql', 'text', 'txt',
]);

// Cache highlighted blocks to avoid redundant async work
const cache = new Map<string, string>();

export async function highlightCode(code: string, lang: string): Promise<string> {
  const normalizedLang = (SUPPORTED_LANGS.has(lang) ? lang : 'text') as BundledLanguage;
  const cacheKey = `${normalizedLang}:${code}`;

  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    const result = await codeToANSI(code, normalizedLang, 'github-dark');
    cache.set(cacheKey, result);
    return result;
  } catch {
    return code;
  }
}
