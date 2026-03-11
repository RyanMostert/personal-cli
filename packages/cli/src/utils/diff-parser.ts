import { ToolCallInfo } from '@personal-cli/shared';
export interface DiffLine {
  type: '+' | '-' | 'context' | 'header';
  content: string;
}
export function parseToolDiff(tool: ToolCallInfo): DiffLine[] | null {
  if (!tool.toolName) return null;
  // Handle gitDiff tool - parses the string output
  if (tool.toolName === 'gitDiff') {
    const diffText = typeof tool.result === 'string' ? tool.result : '';
    if (!diffText || diffText.includes('No differences found')) {
      return null;
    }
    const lines = diffText.split('\n');
    const parsed: DiffLine[] = [];
    for (const line of lines) {
      if (line.startsWith('--- ') || line.startsWith('+++ ')) {
        // Strip the a/ or b/ prefix that git adds
        const cleanContent = line.replace(/^[+-]{3}\s+[ab]\//, '');
        parsed.push({ type: 'header', content: cleanContent });
      } else if (line.startsWith('@@ ')) {
        parsed.push({ type: 'context', content: line });
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        parsed.push({ type: '+', content: line.slice(1) });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        parsed.push({ type: '-', content: line.slice(1) });
      }
    }
    return parsed.length > 0 ? parsed : null;
  }
  // Handle editFile/edit_file tool - uses oldText/newText from args
  if (tool.toolName === 'editFile' || tool.toolName === 'edit_file') {
    const args = tool.args as Record<string, unknown> | undefined;
    const oldText =
      typeof (tool.oldText ?? args?.oldText) === 'string'
        ? String(tool.oldText ?? args?.oldText)
        : '';
    const newText =
      typeof (tool.newText ?? args?.newText) === 'string'
        ? String(tool.newText ?? args?.newText)
        : '';
    if (!oldText && !newText) return null;
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);
    const parsed: DiffLine[] = [];
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      if (oldLine === newLine) {
        if (oldLine) parsed.push({ type: 'context', content: oldLine });
      } else {
        if (oldLine) parsed.push({ type: '-', content: oldLine });
        if (newLine) parsed.push({ type: '+', content: newLine });
      }
    }
    return parsed.length > 0 ? parsed : null;
  }
  return null;
}
