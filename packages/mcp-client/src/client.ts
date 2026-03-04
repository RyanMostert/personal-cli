import {
  MCPClientStatus,
  MCPClientOptions,
  MCPTransport,
  ToolSchema,
  ToolCall,
  ToolResult,
  MCPServerInfo,
} from './types.js';
import { StdioTransport, SSETransport } from './transports/index.js';

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class MCPClient {
  private transport: MCPTransport | null = null;
  private status: MCPClientStatus = MCPClientStatus.DISCONNECTED;
  private tools: ToolSchema[] = [];
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private serverInfo?: { name: string; version: string };
  private connectedAt?: Date;

  constructor(private options: MCPClientOptions) {}

  async connect(): Promise<void> {
    if (this.status === MCPClientStatus.CONNECTING || this.status === MCPClientStatus.CONNECTED) {
      return;
    }

    this.setStatus(MCPClientStatus.CONNECTING);

    try {
      // Create transport based on config
      const { config } = this.options;
      
      switch (config.transport) {
        case 'stdio':
          if (!config.command) {
            throw new Error('command is required for stdio transport');
          }
          this.transport = new StdioTransport(
            config.command,
            config.args,
            config.env,
            config.cwd
          );
          break;
          
        case 'sse':
          if (!config.url) {
            throw new Error('url is required for sse transport');
          }
          this.transport = new SSETransport(config.url, config.headers);
          break;
          
        case 'http':
          throw new Error('HTTP transport not yet implemented');
          
        default:
          throw new Error(`Unknown transport: ${config.transport}`);
      }

      // Set up message handling
      this.transport.onMessage((message) => this.handleMessage(message));
      this.transport.onError((error) => this.handleError(error));
      this.transport.onClose(() => this.handleClose());

      // Connect transport
      await this.transport.connect();

      // Initialize MCP session
      const initResult = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'personal-cli',
          version: '0.1.0',
        },
      });

      this.serverInfo = (initResult as { serverInfo: { name: string; version: string } }).serverInfo;

      // List available tools
      const toolsResult = await this.sendRequest('tools/list', {});
      this.tools = ((toolsResult as { tools: ToolSchema[] }).tools || []);

      this.connectedAt = new Date();
      this.setStatus(MCPClientStatus.CONNECTED);
    } catch (error) {
      this.setStatus(MCPClientStatus.ERROR);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.disconnect();
      this.transport = null;
    }
    this.tools = [];
    this.setStatus(MCPClientStatus.DISCONNECTED);
  }

  async callTool(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (this.status !== MCPClientStatus.CONNECTED) {
      throw new Error('MCP client not connected');
    }

    const result = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args,
    });

    return result as ToolResult;
  }

  getTools(): ToolSchema[] {
    return [...this.tools];
  }

  getServerInfo(): MCPServerInfo {
    return {
      name: this.serverInfo?.name || this.options.serverName,
      version: this.serverInfo?.version || 'unknown',
      tools: this.getTools(),
      status: this.status,
      connectedAt: this.connectedAt,
    };
  }

  getStatus(): MCPClientStatus {
    return this.status;
  }

  private async sendRequest(method: string, params: unknown): Promise<unknown> {
    if (!this.transport) {
      throw new Error('Transport not initialized');
    }

    const id = ++this.requestId;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for method: ${method}`));
      }, this.options.config.timeout || 60000);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      this.transport!.send(request).catch((error) => {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  private handleMessage(message: unknown): void {
    const response = message as JSONRPCResponse;
    
    if (response.jsonrpc !== '2.0') {
      console.error('Invalid JSON-RPC message:', message);
      return;
    }

    // Handle response to pending request
    if (typeof response.id === 'number') {
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        this.pendingRequests.delete(response.id);
        
        if (response.error) {
          pending.reject(new Error(`MCP Error ${response.error.code}: ${response.error.message}`));
        } else {
          pending.resolve(response.result);
        }
      }
    }
  }

  private handleError(error: Error): void {
    console.error(`MCP Client error (${this.options.serverName}):`, error);
    
    if (this.options.onError) {
      this.options.onError(error);
    }
    
    this.setStatus(MCPClientStatus.ERROR);
  }

  private handleClose(): void {
    this.setStatus(MCPClientStatus.DISCONNECTED);
  }

  private setStatus(status: MCPClientStatus): void {
    this.status = status;
    
    if (this.options.onStatusChange) {
      this.options.onStatusChange(status);
    }
  }
}
