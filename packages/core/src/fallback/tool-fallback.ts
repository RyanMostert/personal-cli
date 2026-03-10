export interface FallbackStrategy {
  name: string;
  description: string;
  attempt: (
    toolName: string,
    args: Record<string, unknown>,
    originalResult: unknown,
  ) => Promise<FallbackResult | null>;
}

export interface FallbackResult {
  success: boolean;
  output: string;
  source: string;
  attempts: FallbackAttempt[];
}

export interface FallbackAttempt {
  strategy: string;
  success: boolean;
  duration: number;
  error?: string;
}

export interface FallbackConfig {
  enabled: boolean;
  maxRetries: number;
  strategies: string[];
  autoSynthesize: boolean;
}

const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  enabled: true,
  maxRetries: 3,
  strategies: ['docs_site', 'llm_synthesis', 'code_search'],
  autoSynthesize: true,
};

export class ToolFallbackManager {
  private config: FallbackConfig;
  private strategies: Map<string, FallbackStrategy> = new Map();
  private eventLog: FallbackAttempt[] = [];

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = { ...DEFAULT_FALLBACK_CONFIG, ...config };
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies() {
    // Strategy 1: Provide direct LLM explanation (most reliable)
    this.registerStrategy({
      name: 'llm_synthesis',
      description: 'Generate explanation using AI knowledge',
      attempt: async (toolName, args, originalResult) => {
        const query = this.extractQuery(toolName, args);
        if (!query) return null;

        // Return marker for agent to handle LLM synthesis
        return {
          success: true,
          output: `[LLM_SYNTHESIS_NEEDED] ${query}`,
          source: 'llm_synthesis',
          attempts: [
            {
              strategy: 'llm_synthesis',
              success: true,
              duration: 0,
            },
          ],
        };
      },
    });

    // Strategy 2: Suggest documentation URLs
    this.registerStrategy({
      name: 'docs_site',
      description: 'Suggest relevant documentation URLs',
      attempt: async (toolName, args, originalResult) => {
        const query = this.extractQuery(toolName, args);
        if (!query) return null;

        const start = Date.now();

        // Create helpful documentation links based on query
        const isProgramming =
<<<<<<< HEAD
          /\b(javascript|js|python|java|cpp|c\+\+|typescript|ts|react|node|html|css|sql|go|ruby|rust)\b/i.test(query);
        const isWebDev = /\b(html|css|javascript|dom|api|fetch|async|await|react|vue|angular)\b/i.test(query);
=======
          /\b(javascript|js|python|java|cpp|c\+\+|typescript|ts|react|node|html|css|sql|go|ruby|rust)\b/i.test(
            query,
          );
        const isWebDev =
          /\b(html|css|javascript|dom|api|fetch|async|await|react|vue|angular)\b/i.test(query);
>>>>>>> tools_improvement

        let suggestions: string[] = [];

        if (isWebDev || isProgramming) {
          const encodedQuery = encodeURIComponent(query);
          suggestions = [
            `📚 MDN Web Docs: https://developer.mozilla.org/en-US/search?q=${encodedQuery}`,
            `📖 W3Schools: https://www.w3schools.com/search/search.asp?q=${encodedQuery}`,
            `🔍 DevDocs: https://devdocs.io/#q=${encodedQuery}`,
          ];
        } else {
          suggestions = [`🔍 Search: "${query}"`, `💡 Try rephrasing your question`];
        }

        return {
          success: true,
          output: `**I don't have instant search results, but I can help!**\n\nHere are some resources that might help with "${query}":\n\n${suggestions.join('\n')}\n\nWould you like me to:\n1. Explain this topic based on my training data\n2. Search the codebase for relevant examples\n3. Try fetching from a specific URL you provide`,
          source: 'docs_site',
          attempts: [
            {
              strategy: 'docs_site',
              success: true,
              duration: Date.now() - start,
            },
          ],
        };
      },
    });

    // Strategy 3: Codebase search suggestion
    this.registerStrategy({
      name: 'code_search',
      description: 'Search codebase for relevant examples',
      attempt: async (toolName, args, originalResult) => {
        const query = this.extractQuery(toolName, args);
        if (!query) return null;

        const start = Date.now();

        // Extract potential code terms
        const codeTerms = query
          .toLowerCase()
          .replace(/\b(how|to|what|is|are|the|and|or|in|for|of|with)\b/g, '')
          .replace(/[^a-z0-9_]/g, ' ')
          .trim()
          .split(/\s+/)
          .filter((term) => term.length > 2);

        if (codeTerms.length === 0) return null;

        return {
          success: true,
          output: `[CODE_SEARCH_NEEDED] ${codeTerms.slice(0, 3).join(' ')}`,
          source: 'code_search',
          attempts: [
            {
              strategy: 'code_search',
              success: true,
              duration: Date.now() - start,
            },
          ],
        };
      },
    });
  }

  registerStrategy(strategy: FallbackStrategy) {
    this.strategies.set(strategy.name, strategy);
  }

  private extractQuery(toolName: string, args: Record<string, unknown>): string | null {
    // Extract search query from common tool arguments
    const queryFields = ['query', 'search', 'term', 'keyword', 'topic', 'question', 'q'];
    for (const field of queryFields) {
      if (args[field] && typeof args[field] === 'string') {
        return args[field] as string;
      }
    }

    // For webSearch or similar tools
    if (toolName.toLowerCase().includes('search') && args.query) {
      return String(args.query);
    }

    // For webFetch, try to extract topic from URL
    if (toolName.toLowerCase().includes('fetch') && args.url) {
      const url = String(args.url);
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter((p) => p.length > 0);
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart) {
          // Clean up the topic from URL
          return lastPart
            .replace(/[-_]/g, ' ')
            .replace(/\.html?$/i, '')
            .replace(/#/g, ' ')
            .trim();
        }
      } catch {
        // Invalid URL, return the URL as-is for simple cases
        return url;
      }
    }

    return null;
  }

  shouldAttemptFallback(toolName: string, result: unknown): boolean {
    if (!this.config.enabled) return false;

    // Check if result indicates failure or empty results
    if (result === null || result === undefined) return true;

    // Convert result to string for checking
    let resultStr: string;
    if (typeof result === 'string') {
      resultStr = result;
    } else if (typeof result === 'object') {
      // Try to extract meaningful info from object
      const obj = result as Record<string, unknown>;
      if (obj.error || obj.empty || obj.notFound || obj.failure || obj.failed) return true;
      resultStr = JSON.stringify(result);
    } else {
      resultStr = String(result);
    }

    const lower = resultStr.toLowerCase();
    if (
      lower.includes('no results') ||
      lower.includes('not found') ||
      lower.includes('no instant results') ||
      lower.includes('failed') ||
      lower.includes('error') ||
      lower.includes('network_failure') ||
      lower.includes('fetch failed') ||
      lower.includes('could not') ||
      lower.includes('try webfetch') ||
      resultStr.length < 10
    ) {
      // Empty or very short results
      return true;
    }

    return false;
  }

  private getFailureContext(
    toolName: string,
    args: Record<string, unknown>,
    result: unknown,
  ): { type: string; query: string | null } {
    const query = this.extractQuery(toolName, args);

    // Detect failure type
    let type = 'unknown';
    const resultStr = typeof result === 'string' ? result.toLowerCase() : '';

    if (toolName.toLowerCase().includes('fetch')) {
      type = 'web_fetch';
    } else if (toolName.toLowerCase().includes('search')) {
      type = 'web_search';
    } else if (resultStr.includes('network') || resultStr.includes('fetch failed')) {
      type = 'network';
    } else if (resultStr.includes('not found') || resultStr.includes('404')) {
      type = 'not_found';
    }

    return { type, query };
  }

  async attemptFallback(
    toolName: string,
    args: Record<string, unknown>,
    originalResult: unknown,
  ): Promise<FallbackResult | null> {
    if (!this.shouldAttemptFallback(toolName, originalResult)) {
      return null;
    }

    const failureContext = this.getFailureContext(toolName, args, originalResult);
    const attempts: FallbackAttempt[] = [];

    // For web fetch failures, try to extract topic from URL and auto-synthesize
    if (failureContext.type === 'web_fetch' || failureContext.type === 'network') {
      const start = Date.now();
      const url = args.url as string;

      // Try to extract topic from URL for auto-synthesis
      let topic: string | null = failureContext.query;

      if (!topic && url) {
        // Extract topic from URL path
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/').filter((p) => p.length > 0);
          // Get the last meaningful part of the path
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart) {
            // Convert kebab-case or snake_case to spaces
            topic = lastPart.replace(/[-_]/g, ' ').replace(/\.html?$/, '');
          }
        } catch {
          // Invalid URL, ignore
        }
      }

      // If we have a topic, trigger LLM synthesis automatically
      if (topic && this.config.autoSynthesize) {
        return {
          success: true,
          output: `[LLM_SYNTHESIS_NEEDED] ${topic}`,
          source: 'web_fetch_auto_synthesis',
          attempts: [
            {
              strategy: 'web_fetch_auto_synthesis',
              success: true,
              duration: Date.now() - start,
            },
          ],
        };
      }

      // Otherwise show helpful recovery message
      let helpMessage = `**Failed to fetch from ${url || 'the specified URL'}**

The website may be unavailable or the URL might be incorrect.`;

      if (failureContext.query) {
        helpMessage += `

Instead, would you like me to:
1. **Search the web** for "${failureContext.query}"
2. **Explain** "${failureContext.query}" based on my training data
3. **Search your codebase** for examples of "${failureContext.query}"
4. Try a **different URL** (please provide one)`;
      } else {
        helpMessage += `

**Suggestions:**
• Check if the URL is correct
• Try a web search instead with: "search for [topic]"
• Ask me to explain the topic directly`;
      }

      return {
        success: true,
        output: helpMessage,
        source: 'web_fetch_recovery',
        attempts: [
          {
            strategy: 'web_fetch_recovery',
            success: true,
            duration: Date.now() - start,
          },
        ],
      };
    }

    for (const strategyName of this.config.strategies) {
      const strategy = this.strategies.get(strategyName);
      if (!strategy) continue;

      const start = Date.now();
      try {
        const result = await strategy.attempt(toolName, args, originalResult);
        if (result) {
          // Merge attempts
          result.attempts = [...attempts, ...result.attempts];
          this.eventLog.push(...result.attempts);
          return result;
        }
      } catch (err) {
        attempts.push({
          strategy: strategyName,
          success: false,
          duration: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.eventLog.push(...attempts);
    return null;
  }

  getEventLog(): FallbackAttempt[] {
    return [...this.eventLog];
  }

  clearEventLog() {
    this.eventLog = [];
  }

  getConfig(): FallbackConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<FallbackConfig>) {
    this.config = { ...this.config, ...config };
  }
}

export function createFallbackManager(config?: Partial<FallbackConfig>): ToolFallbackManager {
  return new ToolFallbackManager(config);
}
