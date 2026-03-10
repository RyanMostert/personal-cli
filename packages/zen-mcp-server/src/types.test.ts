import { describe, it, expect } from 'vitest';
import { ZenGatewayConfigSchema, ZenModelSchema } from './types.js';

describe('ZenGatewayConfigSchema', () => {
  it('should validate a valid config', () => {
    const config = {
      endpoint: 'https://opencode.ai/zen/v1',
      apiKey: 'test-api-key',
      enabled: true,
    };

    const result = ZenGatewayConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.endpoint).toBe(config.endpoint);
      expect(result.data.apiKey).toBe(config.apiKey);
      expect(result.data.enabled).toBe(true);
    }
  });

  it('should use default endpoint when not provided', () => {
    const config = {
      apiKey: 'test-api-key',
    };

    const result = ZenGatewayConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.endpoint).toBe('https://opencode.ai/zen/v1');
    }
  });

  it('should fail without API key', () => {
    const config = {
      endpoint: 'https://opencode.ai/zen/v1',
    };

    const result = ZenGatewayConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('ZenModelSchema', () => {
  it('should validate a complete model', () => {
    const model = {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      description: 'Latest GPT-4 model',
      maxTokens: 8192,
      capabilities: ['chat', 'code'],
    };

    const result = ZenModelSchema.safeParse(model);
    expect(result.success).toBe(true);
  });

  it('should validate a minimal model', () => {
    const model = {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
    };

    const result = ZenModelSchema.safeParse(model);
    expect(result.success).toBe(true);
  });
});
<<<<<<< HEAD

=======
>>>>>>> tools_improvement
