import { tool } from 'ai';
import { z } from 'zod';

const TAVILY_URL = 'https://api.tavily.com/search';
const DDG_URL = 'https://api.duckduckgo.com/';

export const webSearch = tool({
  description:
    'Search the web for current information. Returns a list of results with titles, URLs, and snippets. Prefer this over webFetch when you need to discover URLs or find multiple sources. Uses Tavily if TAVILY_API_KEY is set, otherwise DuckDuckGo instant answers.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    maxResults: z.number().optional().default(5).describe('Max results to return (Tavily only)'),
  }),
  execute: async ({ query, maxResults }) => {
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (tavilyKey) {
      return searchTavily(query, maxResults ?? 5, tavilyKey);
    }
    return searchDuckDuckGo(query);
  },
});

async function searchTavily(query: string, maxResults: number, apiKey: string) {
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults }),
    });
    if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
    const data = await res.json() as {
      results?: Array<{ title: string; url: string; content: string }>;
      answer?: string;
    };
    const results = (data.results ?? []).map(r => `### ${r.title}\n${r.url}\n${r.content}`);
    const answer = data.answer ? `**Summary:** ${data.answer}\n\n` : '';
    return { output: answer + results.join('\n\n') };
  } catch (err) {
    return { error: `Tavily search failed: ${err}` };
  }
}

async function searchDuckDuckGo(query: string) {
  try {
    const url = `${DDG_URL}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'personal-cli/1.0' } });
    if (!res.ok) throw new Error(`DDG HTTP ${res.status}`);
    const data = await res.json() as {
      AbstractText?: string;
      AbstractURL?: string;
      AbstractSource?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Name?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
      Answer?: string;
    };

    const lines: string[] = [];

    if (data.Answer) lines.push(`**Answer:** ${data.Answer}\n`);
    if (data.AbstractText) {
      lines.push(`**${data.AbstractSource ?? 'Summary'}:** ${data.AbstractText}`);
      if (data.AbstractURL) lines.push(`Source: ${data.AbstractURL}`);
      lines.push('');
    }

    const topics = data.RelatedTopics ?? [];
    let count = 0;
    for (const t of topics) {
      if (count >= 5) break;
      if (t.Text && t.FirstURL) {
        lines.push(`- ${t.Text}\n  ${t.FirstURL}`);
        count++;
      }
      // Nested topic groups
      if (t.Topics) {
        for (const sub of t.Topics) {
          if (count >= 5) break;
          if (sub.Text && sub.FirstURL) {
            lines.push(`- ${sub.Text}\n  ${sub.FirstURL}`);
            count++;
          }
        }
      }
    }

    if (lines.length === 0) {
      return { output: `No instant results for "${query}". Try webFetch on a specific site.` };
    }

    return { output: lines.join('\n') };
  } catch (err) {
    return { error: `DuckDuckGo search failed: ${err}` };
  }
}
