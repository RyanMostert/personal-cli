import { MCPServerConfig, MCPClientStatus, MCPServerInfo, MCPTool, ToolResult } from './types.js';
import { MCPClient } from './client.js';

export class MCPClientManager {
  private clients = new Map<string, MCPClient>();
  private configs = new Map<string, MCPServerConfig>();

  async connectServer(name: string, config: MCPServerConfig): Promise<void> {
    // Disconnect existing if any
    if (this.clients.has(name)) {
      await this.disconnectServer(name);
    }

    const client = new MCPClient({
      serverName: name,
      config,
      onError: (error) => {
        console.error(`MCP server "${name}" error:`, error.message);
      },
    });

    await client.connect();

    this.clients.set(name, client);
    this.configs.set(name, config);
  }

  async disconnectServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      await client.disconnect();
      this.clients.delete(name);
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnects = Array.from(this.clients.keys()).map((name) => this.disconnectServer(name));
    await Promise.all(disconnects);
  }

  async reloadServer(name: string): Promise<void> {
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`No configuration found for MCP server: ${name}`);
    }

    await this.disconnectServer(name);
    await this.connectServer(name, config);
  }

  async reloadAll(): Promise<void> {
    const reloads = Array.from(this.configs.entries()).map(([name, config]) => this.connectServer(name, config));
    await Promise.all(reloads);
  }

  getServerInfo(name: string): MCPServerInfo | null {
    const client = this.clients.get(name);
    return client ? client.getServerInfo() : null;
  }

  getAllServerInfo(): MCPServerInfo[] {
    return Array.from(this.clients.values()).map((client) => client.getServerInfo());
  }

  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  getTools(serverName?: string): MCPTool[] {
    const tools: MCPTool[] = [];

    if (serverName) {
      const client = this.clients.get(serverName);
      if (client) {
        const serverTools = client.getTools().map((tool) => this.wrapTool(serverName, tool, client));
        tools.push(...serverTools);
      }
    } else {
      for (const [name, client] of this.clients) {
        const serverTools = client.getTools().map((tool) => this.wrapTool(name, tool, client));
        tools.push(...serverTools);
      }
    }

    return tools;
  }

  getAllTools(): MCPTool[] {
    return this.getTools();
  }

  async callTool(qualifiedName: string, args: Record<string, unknown>): Promise<ToolResult> {
    // Parse qualified name: server__tool
    const separator = '__';
    const separatorIndex = qualifiedName.indexOf(separator);

    if (separatorIndex === -1) {
      throw new Error(`Invalid tool name format. Expected "server__tool", got: ${qualifiedName}`);
    }

    const serverName = qualifiedName.slice(0, separatorIndex);
    const toolName = qualifiedName.slice(separatorIndex + separator.length);

    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server not connected: ${serverName}`);
    }

    return client.callTool(toolName, args);
  }

  isConnected(name: string): boolean {
    const client = this.clients.get(name);
    return client ? client.getStatus() === MCPClientStatus.CONNECTED : false;
  }

  private wrapTool(
    serverName: string,
    toolSchema: { name: string; description: string; inputSchema: Record<string, unknown> },
    client: MCPClient,
  ): MCPTool {
    return {
      name: `${serverName}__${toolSchema.name}`,
      serverName,
      toolName: toolSchema.name,
      description: toolSchema.description,
      inputSchema: toolSchema.inputSchema,
      execute: async (args: unknown): Promise<ToolResult> => {
        return client.callTool(toolSchema.name, args as Record<string, unknown>);
      },
    };
  }
}
