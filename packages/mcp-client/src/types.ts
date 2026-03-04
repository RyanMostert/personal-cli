import { z } from 'zod';

// Tool schema matching MCP specification
export const ToolSchemaSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.unknown()),
});

export type ToolSchema = z.infer<typeof ToolSchemaSchema>;

// Tool call and result types
export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// MCP Server Configuration
export const MCPServerConfigSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'http']),
  // stdio options
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  // http/sse options
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  // common options
  timeout: z.number().optional().default(60000),
  enabled: z.boolean().optional().default(true),
  trust: z.boolean().optional().default(false),
});

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

// MCP Client status
export enum MCPClientStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

// Client options
export interface MCPClientOptions {
  serverName: string;
  config: MCPServerConfig;
  onToolCall?: (toolName: string, args: unknown) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: MCPClientStatus) => void;
}

// Transport interface
export interface MCPTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: unknown): Promise<void>;
  onMessage(handler: (message: unknown) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
}

// Server info
export interface MCPServerInfo {
  name: string;
  version: string;
  tools: ToolSchema[];
  status: MCPClientStatus;
  connectedAt?: Date;
  error?: string;
}

// Wrapped tool for integration
export interface MCPTool {
  name: string;
  serverName: string;
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(args: unknown): Promise<ToolResult>;
}
