import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { type LanguageModel } from 'ai';
import type { ActiveModel, ProviderName } from '@personal-cli/shared';

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

  getModel(): LanguageModel {
    const { provider, modelId, apiKey, baseUrl } = this.options;

    switch (provider) {
      case 'anthropic': {
        const client = createAnthropic({
          apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
          ...(baseUrl ? { baseURL: baseUrl } : {}),
        });
        return client(modelId);
      }

      case 'openai': {
        const client = createOpenAI({
          apiKey: apiKey ?? process.env.OPENAI_API_KEY,
          ...(baseUrl ? { baseURL: baseUrl } : {}),
        });
        return client(modelId);
      }

      case 'opencode-zen': {
        // OpenCode uses the Chat Completions API, not OpenAI's Responses API.
        // Use .chat() to route through /chat/completions instead of /responses.
        const client = createOpenAI({
          apiKey: apiKey ?? process.env.OPENCODE_API_KEY,
          baseURL: baseUrl ?? OPENCODE_BASE_URL,
        });
        return client.chat(modelId);
      }

      case 'custom': {
        const client = createOpenAI({
          apiKey: apiKey ?? process.env.CUSTOM_API_KEY,
          baseURL: baseUrl,
        });
        return client.chat(modelId);
      }

      default:
        throw new Error(
          `Provider "${provider}" is not yet supported. Supported: anthropic, openai, opencode-zen, custom.`,
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
