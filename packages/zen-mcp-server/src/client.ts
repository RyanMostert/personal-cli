import type { ZenModel, ZenGatewayConfig, ZenGatewayStatus } from './types.js';

export class ZenGatewayClient {
  private config: ZenGatewayConfig;
  private baseUrl: string;

  constructor(config: ZenGatewayConfig) {
    this.config = config;
    this.baseUrl = config.endpoint.replace(/\/$/, '');
  }

  /**
   * Check connection status and get basic info
   */
  async getStatus(): Promise<ZenGatewayStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return {
          connected: false,
          endpoint: this.config.endpoint,
          modelsAvailable: 0,
          lastError: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const models = await this.listModels();
<<<<<<< HEAD
      
=======

>>>>>>> tools_improvement
      return {
        connected: true,
        endpoint: this.config.endpoint,
        modelsAvailable: models.length,
      };
    } catch (error) {
      return {
        connected: false,
        endpoint: this.config.endpoint,
        modelsAvailable: 0,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List all available models from Zen Gateway
   */
  async listModels(): Promise<ZenModel[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed: Invalid API key');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(`Failed to fetch models: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
  }

  /**
   * Send a chat completion request
   */
  async chatCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    stream?: boolean;
    maxTokens?: number;
  }): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: params.stream ?? false,
        max_tokens: params.maxTokens,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed: Invalid API key');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      const errorData = await response.json().catch(() => ({}));
<<<<<<< HEAD
      throw new Error(
        errorData.error?.message || `Request failed: HTTP ${response.status}`
      );
=======
      throw new Error(errorData.error?.message || `Request failed: HTTP ${response.status}`);
>>>>>>> tools_improvement
    }

    return response;
  }

  /**
   * Create a streaming chat completion
   */
  async *streamChatCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    maxTokens?: number;
  }): AsyncGenerator<string, void, unknown> {
    const response = await this.chatCompletion({
      ...params,
      stream: true,
    });

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
<<<<<<< HEAD
            
=======

>>>>>>> tools_improvement
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private getHeaders(): Record<string, string> {
    return {
<<<<<<< HEAD
      'Authorization': `Bearer ${this.config.apiKey}`,
=======
      Authorization: `Bearer ${this.config.apiKey}`,
>>>>>>> tools_improvement
      'User-Agent': 'personal-cli/zen-gateway',
    };
  }
}
