// Streaming protocol types for refactor/prototype

export interface ToolCallInfo {
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

export interface TextDelta {
  type: 'text-delta';
  delta: string;
}

export interface ThoughtDelta {
  type: 'thought-delta';
  delta: string;
}

export interface ToolCallStart {
  type: 'tool-call-start';
  toolCall: ToolCallInfo;
}

export interface ToolCallResult {
  type: 'tool-call-result';
  toolCall: ToolCallInfo;
}

export interface SystemEvent {
  type: 'system';
  message: string;
}

export interface FinishEvent {
  type: 'finish';
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface ErrorEvent {
  type: 'error';
  error: Error | string;
}

export type StreamEvent =
  | TextDelta
  | ThoughtDelta
  | ToolCallStart
  | ToolCallResult
  | SystemEvent
  | FinishEvent
  | ErrorEvent;
