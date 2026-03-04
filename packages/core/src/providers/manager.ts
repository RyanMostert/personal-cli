import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { type LanguageModel } from 'ai';
import type { ActiveModel, ProviderName } from '@personal-cli/shared';
import { getProviderKey } from '../config/auth.js';
import { getCopilotToken } from './copilot-auth.js';

export interface ProviderManagerOptions {
  provider: ProviderName;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
}

const OPENCODE_BASE_URL = 'https://opencode.ai/zen/v1';

// opencode-zen and opencode send {"type":"ping","cost":"0"} heartbeat events 
// that can confuse SSE parsers or be annoying. This wrapper strips those lines 
// from the stream using a line-buffered approach to avoid breaking at chunk boundaries.
const filterPingsFetch: typeof globalThis.fetch = async (url, init) => {
  const res = await globalThis.fetch(url as RequestInfo, init as RequestInit);
  if (!res.body || res.status !== 200) return res;
  
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) return res;

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        // Check if the line is a ping event
        if (trimmed.startsWith('data:')) {
          const payload = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(payload);
            if (parsed?.type === 'ping') continue;
          } catch {
            // Not JSON or partial JSON, keep it
          }
        }
        ctrl.enqueue(encoder.encode(line + '\n'));
      }
    },
    flush(ctrl) {
      if (buffer) {
        ctrl.enqueue(encoder.encode(buffer));
      }
    },
  });

  return new Response(res.body.pipeThrough(transform), {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
};

interface ProviderDef {
  id: ProviderName;
  envVar?: string;
  create: (options: { apiKey?: string; baseUrl?: string; modelId: string }) => Promise<LanguageModel>;
}

const PROVIDER_REGISTRY: ProviderDef[] = [
  {
    id: 'anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    create: async ({ apiKey, baseUrl, modelId }) => {
      const client = createAnthropic({
        apiKey,
        ...(baseUrl ? { baseURL: baseUrl } : {}),
      });
      return client(modelId);
    },
  },
  {
    id: 'openai',
    envVar: 'OPENAI_API_KEY',
    create: async ({ apiKey, baseUrl, modelId }) => {
      const client = createOpenAI({
        apiKey,
        ...(baseUrl ? { baseURL: baseUrl } : {}),
      });
      return client(modelId);
    },
  },
  {
    id: 'google',
    envVar: 'GOOGLE_API_KEY',
    create: async ({ apiKey, modelId }) => {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      const client = createGoogleGenerativeAI({ apiKey });
      return client(modelId);
    },
  },
  {
    id: 'mistral',
    envVar: 'MISTRAL_API_KEY',
    create: async ({ apiKey, modelId }) => {
      const { createMistral } = await import('@ai-sdk/mistral');
      const client = createMistral({ apiKey });
      return client(modelId);
    },
  },
  {
    id: 'ollama',
    create: async ({ baseUrl, modelId }) => {
      const client = createOpenAI({
        baseURL: baseUrl ?? 'http://localhost:11434/v1',
        apiKey: 'ollama',
      });
      return client.chat(modelId);
    },
  },
  {
    id: 'opencode-zen',
    envVar: 'OPENCODE_API_KEY',
    create: async ({ apiKey, baseUrl, modelId }) => {
      const client = createOpenAI({
        apiKey: apiKey ?? 'sk-no-key-needed',
        baseURL: baseUrl ?? OPENCODE_BASE_URL,
        fetch: filterPingsFetch,
      });
      return client.chat(modelId);
    },
  },
  {
    id: 'custom',
    envVar: 'CUSTOM_API_KEY',
    create: async ({ apiKey, baseUrl, modelId }) => {
      const client = createOpenAI({
        apiKey: apiKey ?? 'sk-no-key-needed',
        baseURL: baseUrl,
      });
      return client.chat(modelId);
    },
  },
  {
    id: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    create: async ({ apiKey, modelId }) => {
      const client = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey ?? 'sk-no-key-needed',
        headers: { 'HTTP-Referer': 'https://personal-cli', 'X-Title': 'personal-cli' },
        fetch: filterPingsFetch,
      });
      return client.chat(modelId);
    },
  },
  {
    id: 'groq',
    envVar: 'GROQ_API_KEY',
    create: async ({ apiKey, modelId }) => {
      const { createGroq } = await import('@ai-sdk/groq');
      const client = createGroq({ apiKey });
      return client(modelId);
    },
  },
  {
    id: 'xai',
    envVar: 'XAI_API_KEY',
    create: async ({ apiKey, modelId }) => {
      const { createXai } = await import('@ai-sdk/xai');
      const client = createXai({ apiKey });
      return client(modelId);
    },
  },
  {
    id: 'deepseek',
    envVar: 'DEEPSEEK_API_KEY',
    create: async ({ apiKey, modelId }) => {
      const client = createOpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: apiKey ?? 'sk-no-key-needed',
      });
      return client.chat(modelId);
    },
  },
  {
    id: 'perplexity',
    envVar: 'PERPLEXITY_API_KEY',
    create: async ({ apiKey, modelId }) => {
      const client = createOpenAI({
        baseURL: 'https://api.perplexity.ai',
        apiKey: apiKey ?? 'sk-no-key-needed',
      });
      return client.chat(modelId);
    },
  },
  {
    id: 'cerebras',
    envVar: 'CEREBRAS_API_KEY',
    create: async ({ apiKey, modelId }) => {
      const client = createOpenAI({
        baseURL: 'https://api.cerebras.ai/v1',
        apiKey: apiKey ?? 'sk-no-key-needed',
      });
      return client.chat(modelId);
    },
  },
  {
    id: 'together',
    envVar: 'TOGETHER_API_KEY',
    create: async ({ apiKey, modelId }) => {
      const client = createOpenAI({
        baseURL: 'https://api.together.xyz/v1',
        apiKey: apiKey ?? 'sk-no-key-needed',
      });
      return client.chat(modelId);
    },
  },
  {
    id: 'github-copilot',
    create: async ({ modelId }) => {
      const copilotToken = await getCopilotToken();
      const client = createOpenAI({
        apiKey: copilotToken,
        baseURL: 'https://api.githubcopilot.com',
        headers: {
          'Editor-Version': 'personal-cli/1.0.0',
          'Editor-Plugin-Version': 'personal-cli/1.0.0',
          'Copilot-Integration-Id': 'copilot-chat',
        },
      });
      return client.chat(modelId);
    },
  },
  {
    id: 'google-vertex',
    create: async ({ modelId }) => {
      // @ts-ignore - optional peer dep
      const { createVertex } = await import('@ai-sdk/google-vertex');
      // @ts-ignore - optional peer dep
      const { GoogleAuth } = await import('google-auth-library');

      const project = process.env.GOOGLE_CLOUD_PROJECT
        ?? process.env.GCP_PROJECT
        ?? process.env.GCLOUD_PROJECT;

      const location = process.env.GOOGLE_CLOUD_LOCATION
        ?? process.env.VERTEX_LOCATION
        ?? 'us-central1';

      const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

      const client = createVertex({
        project,
        location,
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const token = await auth.getAccessToken();
          const headers = new Headers(init?.headers);
          headers.set('Authorization', `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      });
      return client(modelId);
    },
  },
  {
    id: 'opencode',
    envVar: 'OPENCODE_API_KEY',
    create: async ({ apiKey, modelId }) => {
      const client = createOpenAI({
        baseURL: 'https://api.opencode.ai/v1',
        // If no key, some gateways prefer no Authorization header rather than a placeholder,
        // but the SDK requires a string. 'sk-no-key-needed' is a common placeholder.
        apiKey: apiKey ?? 'sk-no-key-needed',
        fetch: filterPingsFetch,
      });
      return client.chat(modelId);
    },
  },
  {
    id: 'amazon-bedrock',
    create: async ({ modelId }) => {
      // @ts-ignore - optional peer dep
      const { createAmazonBedrock } = await import('@ai-sdk/amazon-bedrock');
      // @ts-ignore - optional peer dep
      const { fromNodeProviderChain } = await import('@aws-sdk/credential-providers');
      const region = process.env.AWS_REGION ?? 'us-east-1';
      const client = createAmazonBedrock({
        region,
        credentialProvider: fromNodeProviderChain(),
      });
      return client(modelId);
    },
  },
  {
    id: 'azure',
    envVar: 'AZURE_API_KEY',
    create: async ({ apiKey, modelId }) => {
      // @ts-ignore - optional peer dep
      const { createAzure } = await import('@ai-sdk/azure');
      const client = createAzure({
        apiKey,
        resourceName: process.env.AZURE_RESOURCE_NAME,
      });
      return client.responses(modelId);
    },
  },
];

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

    const def = PROVIDER_REGISTRY.find(p => p.id === provider);
    if (!def) {
      throw new Error(
        `Provider "${provider}" is not yet supported. Supported: ${PROVIDER_REGISTRY.map(p => p.id).join(', ')}.`,
      );
    }

    const apiKey = this.resolveKey(provider, def.envVar ?? '');
    
    // Validate API key for providers that require it
    const noKeyProviders = ['ollama', 'github-copilot', 'google-vertex', 'amazon-bedrock', 'opencode', 'opencode-zen', 'openrouter', 'mistral', 'together'];
    if (!apiKey && !noKeyProviders.includes(provider)) {
      throw new Error(
        `No API key found for provider "${provider}". \n` +
        `❯ Set ${def.envVar || 'CUSTOM_API_KEY'} in your environment\n` +
        `❯ Or run /provider to configure it now.`
      );
    }

    return def.create({ apiKey, baseUrl, modelId });
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
