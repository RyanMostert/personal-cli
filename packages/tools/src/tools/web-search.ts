import { tool } from 'ai';
import { z } from 'zod';

const TAVILY_URL = 'https://api.tavily.com/search';
const DDG_URL = 'https://api.duckduckgo.com/';

export const webSearch = tool({
  description:
    'Search the web for current information. Returns a list of results with titles, URLs, and snippets. Uses Google Search, Tavily, or Jina Search based on configuration.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    maxResults: z.number().optional().default(5).describe('Max results to return'),
  }),
  execute: async ({ query, maxResults }) => {
    const userAgent =
      'Mozilla/5.0 (compatible; PersonalCLI/1.0; +https://github.com/ramos/personal-cli)';

    // 1. Try Google Search if configured
    const googleKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_CX;
    if (googleKey && googleCx) {
      return searchGoogle(query, maxResults ?? 5, googleKey, googleCx);
    }

    // 2. Try Tavily if configured
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      return searchTavily(query, maxResults ?? 5, tavilyKey);
    }

    // 3. Try Jina Search (Excellent no-key fallback)
    try {
      const jinaUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
      const jinaRes = await fetch(jinaUrl, {
        headers: { 'User-Agent': userAgent },
      });
      if (jinaRes.ok) {
        const content = await jinaRes.text();
        return {
          output: content.slice(0, 15000),
          metadata: { source: 'jina-search', query },
        };
      }
    } catch {
      // Fallback to DDG
    }

    // 4. Ultimate Fallback
    return searchDuckDuckGo(query);
  },
});

async function searchGoogle(query: string, maxResults: number, apiKey: string, cx: string) {
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${maxResults}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google HTTP ${res.status}`);
<<<<<<< HEAD
    const data = (await res.json()) as any;

    const results = (data.items ?? []).map((r: any) => `### ${r.title}\n${r.link}\n${r.snippet}`);
    return { output: results.length > 0 ? results.join('\n\n') : `No results found for "${query}" on Google.` };
=======
    interface GoogleSearchItem {
      title: string;
      link: string;
      snippet: string;
    }
    interface GoogleSearchResponse {
      items?: GoogleSearchItem[];
    }
    const data = (await res.json()) as GoogleSearchResponse;

    const results = (data.items ?? []).map((r) => `### ${r.title}\n${r.link}\n${r.snippet}`);
    return {
      output:
        results.length > 0 ? results.join('\n\n') : `No results found for "${query}" on Google.`,
    };
>>>>>>> tools_improvement
  } catch (err) {
    return { error: `Google search failed: ${err}` };
  }
}

async function searchTavily(query: string, maxResults: number, apiKey: string) {
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults }),
    });
    if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
    const data = (await res.json()) as {
      results?: Array<{ title: string; url: string; content: string }>;
      answer?: string;
    };
    const results = (data.results ?? []).map((r) => `### ${r.title}\n${r.url}\n${r.content}`);
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
    const data = (await res.json()) as {
      AbstractText?: string;
      AbstractURL?: string;
      AbstractSource?: string;
      RelatedTopics?: Array<{
        Text?: string;
        FirstURL?: string;
        Name?: string;
        Topics?: Array<{ Text?: string; FirstURL?: string }>;
      }>;
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
