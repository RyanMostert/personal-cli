import EventSource from 'eventsource';
import { MCPTransport } from '../types.js';

export class SSETransport implements MCPTransport {
  private eventSource: EventSource | null = null;
  private messageHandler: ((message: unknown) => void) | null = null;
  private errorHandler: ((error: Error) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private endpointUrl: string;
  private headers: Record<string, string>;

  constructor(url: string, headers: Record<string, string> = {}) {
    this.endpointUrl = url;
    this.headers = headers;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create EventSource with custom headers
        const eventSourceInit: Record<string, unknown> = {
          headers: this.headers,
        };

        this.eventSource = new EventSource(this.endpointUrl, eventSourceInit as any);

        this.eventSource.onopen = () => {
          console.log(`SSE connection opened to ${this.endpointUrl}`);
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          if (this.messageHandler && event.data) {
            try {
              const message = JSON.parse(event.data);
              this.messageHandler(message);
            } catch (error) {
              console.error('Failed to parse SSE message:', event.data);
              if (this.errorHandler) {
                this.errorHandler(new Error(`Invalid JSON in SSE: ${event.data}`));
              }
            }
          }
        };

        this.eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          if (this.errorHandler) {
            this.errorHandler(new Error('SSE connection error'));
          }
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;

      if (this.closeHandler) {
        this.closeHandler();
      }
    }
  }

  async send(message: unknown): Promise<void> {
    // SSE is server-to-client only for events
    // For client-to-server, we need to make HTTP POST requests
    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
  }

  onMessage(handler: (message: unknown) => void): void {
    this.messageHandler = handler;
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }
}
