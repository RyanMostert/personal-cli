import type { Message, ToolCallInfo, AgentMode, Attachment, TodoItem } from '@personal-cli/shared';

export interface PendingPermission {
  toolName: string;
  args?: Record<string, unknown>;
  resolve: (allow: boolean) => void;
}

export interface PendingQuestion {
  question: string;
  resolve: (answer: string) => void;
}

export interface AgentState {
  messages: Message[];
  isStreaming: boolean;
  tokensUsed: number;
  cost: number;
  toolCalls: ToolCallInfo[];
  pendingPermission: PendingPermission | null;
  pendingQuestion: PendingQuestion | null;
  error: string | null;
  isPickingModel: boolean;
  attachedFiles: Attachment[];
  mode: AgentMode;
  todos: TodoItem[];
}

export type { Message, ToolCallInfo, AgentMode, Attachment, TodoItem };
