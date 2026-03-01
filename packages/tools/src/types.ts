export type PermissionCallback = (
  toolName: string,
  args: Record<string, unknown>,
) => Promise<boolean>;

export interface ToolResult {
  output?: string;
  error?: string;
}
