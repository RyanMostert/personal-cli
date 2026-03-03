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
  attachFile: (path: string) => Promise<boolean>;
  clearAttachments: () => void;
  openFileInPanel: (path: string) => void;
  exportConversation: (path?: string) => string;
  exit: () => void;
}
