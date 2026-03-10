import type { ToolResult } from '@personal-cli/mcp-client';

export function getToolTextResult(result: ToolResult): string {
  const text = result.content.find(
    (item) => item.type === 'text' && typeof item.text === 'string',
  )?.text;
  if (!text) {
    throw new Error('Tool returned an empty response.');
  }
  return text;
}
