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
        const client = createOpenAI({
          apiKey: this.resolveKey('opencode-zen', 'OPENCODE_API_KEY'),
          baseURL: baseUrl ?? OPENCODE_BASE_URL,
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

      default:
        throw new Error(
          `Provider "${provider}" is not yet supported. Supported: anthropic, openai, google, mistral, ollama, opencode-zen, custom.`,
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
