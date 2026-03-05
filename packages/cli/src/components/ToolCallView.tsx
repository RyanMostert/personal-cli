import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { MinecraftSpinner } from './MinecraftSpinner.js';
import { PatchView } from './PatchView.js';
import type { ToolCallInfo } from '@personal-cli/shared';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  tool: ToolCallInfo;
  startTime?: number;
  focused?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onFocus?: () => void;
}

const RESULT_PREVIEW_CHARS = 500;

// Format duration in seconds
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

/** Extract a human-readable one-line summary from any tool result. */
function summarizeResult(result: unknown): { text: string; isError: boolean; lineCount?: number; fullLength?: number } {
  if (result == null) return { text: 'done', isError: false };

  // Helper to get first meaningful line
  const getFirstLine = (text: string): string => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const firstLine = lines[0] || '';
    // Clean up markdown formatting
    return firstLine
      .replace(/^#+\s*/, '') // Remove heading markers
      .replace(/^[-*]\s*/, '') // Remove list markers
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/__/g, '') // Remove underline markers
      .trim();
  };

  if (typeof result === 'string') {
    const t = result.trim();
    const lines = t.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const firstLine = getFirstLine(t);
    const preview = firstLine.slice(0, 100);
    return { 
      text: preview + (firstLine.length > 100 || nonEmptyLines.length > 1 ? '…' : ''), 
      isError: false,
      lineCount: nonEmptyLines.length > 1 ? nonEmptyLines.length : undefined,
      fullLength: t.length
    };
  }

  if (typeof result === 'object' && !Array.isArray(result)) {
    const r = result as Record<string, unknown>;

    // Tool returned an error object
    if (typeof r.error === 'string') {
      return { text: r.error.slice(0, 100), isError: true };
    }

    // Common output fields across tools
    for (const key of ['output', 'content', 'result', 'text', 'stdout']) {
      if (typeof r[key] === 'string') {
        const val = (r[key] as string).trim();
        const lines = val.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        const firstLine = getFirstLine(val);
        const preview = firstLine.slice(0, 100);
        return { 
          text: preview + (firstLine.length > 100 || nonEmptyLines.length > 1 ? '…' : ''), 
          isError: false,
          lineCount: nonEmptyLines.length > 1 ? nonEmptyLines.length : undefined,
          fullLength: val.length
        };
      }
    }

    // File list
    if (Array.isArray(r.files)) {
      const names = (r.files as string[]).slice(0, 6).join('  ');
      const extra = r.files.length > 6 ? `  +${r.files.length - 6} more` : '';
      return { text: names + extra, isError: false, lineCount: r.files.length };
    }

    // Generic array
    if (Array.isArray(result)) {
      return { text: `${(result as unknown[]).length} items`, isError: false, lineCount: (result as unknown[]).length };
    }

    // Fall back to compact JSON
    const json = JSON.stringify(r);
    return { text: json.slice(0, 100) + (json.length > 100 ? '…' : ''), isError: false };
  }

  const s = String(result).trim();
  const firstLine = getFirstLine(s);
  return { 
    text: firstLine.slice(0, 100) + (firstLine.length > 100 ? '…' : ''), 
    isError: false,
    lineCount: s.split('\n').filter(line => line.trim().length > 0).length > 1 ? s.split('\n').length : undefined
  };
}

// Get file info for display
function getFileInfo(tool: ToolCallInfo): { path?: string; lineCount?: number } | null {
  const args = tool.args as Record<string, unknown> | undefined;
  if (!args) return null;
  
  if (tool.toolName === 'readFile' && typeof args.path === 'string') {
    const result = tool.result;
    if (typeof result === 'string') {
      return { path: args.path, lineCount: result.split('\n').length };
    }
    return { path: args.path };
  }
  
  if (tool.toolName === 'writeFile' && typeof args.path === 'string') {
    const content = args.content as string | undefined;
    return { path: args.path, lineCount: content?.split('\n').length };
  }
  
  return null;
}

export function ToolCallView({ tool, startTime = Date.now(), focused = false, expanded = false, onToggleExpand, onFocus }: Props) {
  const theme = useTheme();
  const [elapsed, setElapsed] = useState(0);
  const resultSummary = tool.result !== undefined ? summarizeResult(tool.result) : null;
  const isError = Boolean(tool.error) || resultSummary?.isError === true;
  const isRunFinished = tool.result !== undefined || Boolean(tool.error);

  // Focus/expand styling
  const focusBorderColor = focused ? '#FF00AA' : (isError ? theme.error : isRunFinished ? theme.success : theme.warning);
  const borderStyle = focused ? 'double' : 'single';

  const isEditFile = tool.toolName === 'edit_file';
  const editArgs = isEditFile ? (tool.args as any) : null;
  const fileInfo = getFileInfo(tool);

  // Track elapsed time while running
  useEffect(() => {
    if (isRunFinished) return;
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isRunFinished, startTime]);

  const borderColor = isError ? theme.error : isRunFinished ? theme.success : theme.warning;
  const duration = isRunFinished ? elapsed : Date.now() - startTime;

  return (
    <Box
      marginY={0}
      paddingLeft={2}
      borderLeft
      borderStyle={borderStyle}
      borderColor={focusBorderColor}
      flexDirection="column"
      backgroundColor={isRunFinished ? 'transparent' : '#1A1A1A'}

    >
      {/* Status row - Claude Code style */}
      <Box flexDirection="row" alignItems="center">
        <Box marginRight={1}>
          {!isRunFinished ? (
            <MinecraftSpinner />
          ) : isError ? (
            <Text color={theme.error} bold>⎿</Text>
          ) : (
            <Text color={theme.success} bold>●</Text>
          )}
        </Box>
        <Box flexShrink={0} marginRight={1}>
          {!isRunFinished ? (
            <Text color={theme.warning} bold> ✶ Working… </Text>
          ) : isError ? (
            <Text color={theme.error} bold> ❌ </Text>
          ) : (
            <Text color={theme.success} bold> ✔ </Text>
          )}
          <Text color={isRunFinished && !isError ? theme.toolName : isError ? theme.error : theme.assistantLabel} bold>
            {tool.toolName}
          </Text>
        </Box>
        
        {/* Duration */}
        <Box paddingLeft={1}>
          <Text color={theme.dim}>
            {isRunFinished ? `(${formatDuration(duration)})` : `${formatDuration(duration)}`}
          </Text>
        </Box>
        
        {/* Target info */}
        {!isRunFinished && tool.args && (
          <Box paddingLeft={1}>
            <Text color={theme.muted}>
              {JSON.stringify(tool.args).substring(0, 60)}
              {JSON.stringify(tool.args).length > 60 ? '…' : ''}
            </Text>
          </Box>
        )}
      </Box>

      {/* File info row for read/write operations */}
      {fileInfo && isRunFinished && (
        <Box paddingLeft={4} marginTop={0}>
          <Text color={theme.dim}>⎿ </Text>
          <Text color={theme.primary}>
            {fileInfo.path}
            {fileInfo.lineCount && ` (${fileInfo.lineCount} lines)`}
          </Text>
        </Box>
      )}

       {/* Focus/expand/collapse row */}
       {isRunFinished && !isEditFile && (
         <Box paddingLeft={3} alignItems="center">
           {focused && (
             <Text color="#FF00AA" bold>❯ </Text>
           )}
           <Text color={theme.primary} bold>
             {expanded ? '▼ Collapse' : '▶ Expand'}
           </Text>
           {onToggleExpand && focused && (
             <Text color={theme.dim}> (Press ENTER/TAB)</Text>
           )}
         </Box>
       )}

       {/* Result output row */}
       {isRunFinished && resultSummary !== null && resultSummary.text && !isEditFile && (
         expanded ? (
           <Box paddingLeft={5}>
             <Text color={resultSummary.isError ? theme.error : theme.text} wrap="wrap">
               {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2)}
             </Text>
           </Box>
         ) : (
           <Box paddingLeft={5}>
             <Text color={theme.dim}>⎿ </Text>
             <Text color={resultSummary.isError ? theme.error : theme.dim} wrap="wrap">
               {resultSummary.text}
             </Text>
             {resultSummary.lineCount && resultSummary.lineCount > 1 && (
               <Text color={theme.muted}> ({resultSummary.lineCount} lines)</Text>
             )}
           </Box>
         )
       )}

      {/* Special rendering for edits */}
      {isEditFile && editArgs && (
        <Box paddingLeft={4}>
          <PatchView path={editArgs.path} oldText={editArgs.oldText} newText={editArgs.newText} />
        </Box>
      )}
      
      {/* Error display */}
      {isError && tool.error && (
        <Box paddingLeft={4} marginTop={0}>
          <Text color={theme.dim}>⎿ </Text>
          <Text color={theme.error} wrap="wrap">
            {typeof tool.error === 'string' ? tool.error : JSON.stringify(tool.error)}
          </Text>
        </Box>
      )}
    </Box>
  );
}
