import type { Message, AgentMode } from '@personal-cli/shared';
import type { ZenGatewayStatus, ZenModel } from '@personal-cli/zen-mcp-server';

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
  openPluginManager: () => void;
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
  abort: () => void;
  loadPlugins: () => Promise<import('@personal-cli/tools').LoadedPlugin[]>;
  saveWorkspace: (path: string) => void;
  loadWorkspace: (path: string) => void;
  // Zen Gateway methods
  getZenGatewayStatus?: () => Promise<ZenGatewayStatus | null>;
  listZenModels?: () => Promise<ZenModel[] | null>;
  configureZenGateway?: () => Promise<void>;
  removeZenGateway?: () => Promise<void>;
}
