import type { MCPClientManager, MCPTool } from '@personal-cli/mcp-client';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: unknown): Promise<unknown>;
}

export class MCPToolWrapper implements Tool {
  constructor(private mcpTool: MCPTool) {}

  get name(): string {
    return this.mcpTool.name;
  }

  get description(): string {
    return `[${this.mcpTool.serverName}] ${this.mcpTool.description}`;
  }

  get parameters(): Record<string, unknown> {
    return this.mcpTool.inputSchema;
  }

  async execute(args: unknown): Promise<unknown> {
    const result = await this.mcpTool.execute(args);
    // Extract text content from MCP result
    if (result.content && result.content.length > 0) {
      return result.content.map((c: { text?: string }) => c.text || '').join('\n');
    }
    return '';
  }
}

export function wrapMCPTools(mcpTools: MCPTool[]): Tool[] {
  return mcpTools.map((tool) => new MCPToolWrapper(tool));
}

export function convertMCPToolsToRegistryFormat(mcpTools: MCPTool[]): Record<string, Tool> {
  const registry: Record<string, Tool> = {};
  for (const tool of mcpTools) {
    registry[tool.name] = new MCPToolWrapper(tool);
  }
  return registry;
}
