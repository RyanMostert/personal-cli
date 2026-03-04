import type { Message, AgentMode } from '@personal-cli/shared';

export interface CommandContext {
  messages: Message[];
  tokensUsed: number;
  cost: number;
  addSystemMessage: (msg: string) => void;
  clearMessages: () => void;
  switchModel: (provider: string, modelId: string) => void;
  switchMode: (mode: AgentMode) => void;
  openModelPicker: () => void;
  openProviderManager: () => void;
  openHistory: () => void;
  openMCPManager: () => void;
  attachFile: (path: string) => Promise<boolean>;
  clearAttachments: () => void;
  openFileInPanel: (path: string) => void;
  exportConversation: (path?: string) => string;
  compact: () => Promise<string>;
  renameConversation: (title: string) => boolean;
  undo: () => string;
  redo: () => string;
  initProject: () => Promise<string>;
  exit: () => void;
}
