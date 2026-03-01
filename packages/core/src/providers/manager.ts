import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { type LanguageModel } from 'ai';
import type { ActiveModel, ProviderName } from '@personal-cli/shared';
import { getProviderKey } from '../config/auth.js';

export interface ProviderManagerOptions {
  provider: ProviderName;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
}

const OPENCODE_BASE_URL = 'https://opencode.ai/zen/v1';

// opencode-zen sends {"type":"ping","cost":"0"} heartbeat events that the AI SDK
// can't parse. This wrapper strips those lines from the SSE stream before the
// SDK sees them.
const filterPingsFetch: typeof globalThis.fetch = async (url, init) => {
  const res = await globalThis.fetch(url as RequestInfo, init as RequestInit);
  if (!res.body) return res;
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) return res;

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      const text = decoder.decode(chunk, { stream: true });
      const filtered = text
        .split('\n')
        .filter(line => {
          if (!line.startsWith('data:')) return true;
          const payload = line.slice(5).trim();
          try { if ((JSON.parse(payload) as any)?.type === 'ping') return false; } catch {}
          return true;
        })
        .join('\n');
      ctrl.enqueue(encoder.encode(filtered));
    },
  });
  return new Response(res.body.pipeThrough(transform), {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
};

export class ProviderManager {
  private options: ProviderManagerOptions;

  constructor(options: ProviderManagerOptions) {
    this.options = options;
  }

  private resolveKey(provider: string, envVar: string): string | undefined {
    return this.options.apiKey ?? getProviderKey(provider) ?? process.env[envVar];
  }

  async getModel(): Promise<LanguageModel> {
    const { provider, modelId, baseUrl } = this.options;

    switch (provider) {
      case 'anthropic': {
        const client = createAnthropic({
          apiKey: this.resolveKey('anthropic', 'ANTHROPIC_API_KEY'),
          ...(baseUrl ? { baseURL: baseUrl } : {}),
        });
        return client(modelId);
      }

      case 'openai': {
        const client = createOpenAI({
          apiKey: this.resolveKey('openai', 'OPENAI_API_KEY'),
          ...(baseUrl ? { baseURL: baseUrl } : {}),
        });
        return client(modelId);
      }

      case 'google': {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        const client = createGoogleGenerativeAI({
          apiKey: this.resolveKey('google', 'GOOGLE_API_KEY'),
        });
        return client(modelId);
      }

      case 'mistral': {
        const { createMistral } = await import('@ai-sdk/mistral');
        const client = createMistral({
          apiKey: this.resolveKey('mistral', 'MISTRAL_API_KEY'),
        });
        return client(modelId);
      }

      case 'ollama': {
        // Ollama runs locally on port 11434 with an OpenAI-compatible API
        const client = createOpenAI({
          baseURL: baseUrl ?? 'http://localhost:11434/v1',
          apiKey: 'ollama',  // required by SDK but ignored by Ollama
        });
        return client.chat(modelId);
      }

      case 'opencode-zen': {
        // OpenCode uses the Chat Completions API, not OpenAI's Responses API.
        // Use .chat() to route through /chat/completions instead of /responses.
        // filterPingsFetch strips {"type":"ping"} heartbeat events the SDK can't parse.
        const client = createOpenAI({
          apiKey: this.resolveKey('opencode-zen', 'OPENCODE_API_KEY'),
          baseURL: baseUrl ?? OPENCODE_BASE_URL,
          fetch: filterPingsFetch,
        });
        return client.chat(modelId);
      }

      case 'custom': {
        const client = createOpenAI({
          apiKey: this.resolveKey('custom', 'CUSTOM_API_KEY'),
          baseURL: baseUrl,
        });
        return client.chat(modelId);
      }

      case 'openrouter': {
        const client = createOpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: this.resolveKey('openrouter', 'OPENROUTER_API_KEY'),
          headers: { 'HTTP-Referer': 'https://personal-cli', 'X-Title': 'personal-cli' },
        });
        return client.chat(modelId);
      }

      case 'groq': {
        const { createGroq } = await import('@ai-sdk/groq');
        const client = createGroq({ apiKey: this.resolveKey('groq', 'GROQ_API_KEY') });
        return client(modelId);
      }

      case 'xai': {
        const { createXai } = await import('@ai-sdk/xai');
        const client = createXai({ apiKey: this.resolveKey('xai', 'XAI_API_KEY') });
        return client(modelId);
      }

      case 'deepseek': {
        const client = createOpenAI({
          baseURL: 'https://api.deepseek.com/v1',
          apiKey: this.resolveKey('deepseek', 'DEEPSEEK_API_KEY'),
        });
        return client.chat(modelId);
      }

      case 'perplexity': {
        const client = createOpenAI({
          baseURL: 'https://api.perplexity.ai',
          apiKey: this.resolveKey('perplexity', 'PERPLEXITY_API_KEY'),
        });
        return client.chat(modelId);
      }

      case 'cerebras': {
        const client = createOpenAI({
          baseURL: 'https://api.cerebras.ai/v1',
          apiKey: this.resolveKey('cerebras', 'CEREBRAS_API_KEY'),
        });
        return client.chat(modelId);
      }

      case 'together': {
        const client = createOpenAI({
          baseURL: 'https://api.together.xyz/v1',
          apiKey: this.resolveKey('together', 'TOGETHER_API_KEY'),
        });
        return client.chat(modelId);
      }

      default:
        throw new Error(
          `Provider "${provider}" is not yet supported. Supported: anthropic, openai, google, mistral, ollama, opencode-zen, openrouter, groq, xai, deepseek, perplexity, cerebras, together, custom.`,
        );
    }
  }

  getActiveModel(): ActiveModel {
    return {
      provider: this.options.provider,
      modelId: this.options.modelId,
    };
  }

  switchModel(provider: ProviderName, modelId: string) {
    this.options = { ...this.options, provider, modelId };
  }
}
