export { Agent } from './agent.js';
export type { AgentOptions } from './agent.js';
export { ProviderManager } from './providers/manager.js';
export type { ProviderManagerOptions } from './providers/manager.js';
export { loadConfig, getDefaultModel, loadSettings, saveSettings } from './config/loader.js';
export { readAuth, writeAuth, setProviderKey, getProviderKey, removeProviderKey } from './config/auth.js';
export {
  saveConversation,
  loadConversation,
  listConversations,
  deleteConversation,
  renameConversation,
  exportConversation,
} from './persistence/conversations.js';
export type { ConversationMeta, SavedConversation } from './persistence/conversations.js';
export { getFrecency, getBatchFrecency, getTopRecentFiles, recordAccess } from './persistence/frecency.js';
export { appendHistory, loadHistory } from './persistence/history.js';
export { getTheme, setTheme, getRecentModels, addRecentModel } from './config/prefs.js';
export {
  startDeviceFlow,
  pollForGitHubToken,
  saveGitHubToken,
  getCopilotToken,
  isCopilotAuthenticated,
  clearCopilotAuth,
} from './providers/copilot-auth.js';

// Model cache and fetching
export {
  loadModelCache,
  saveModelCache,
  cacheModels,
  getCachedModels,
  clearModelCache,
  getCacheStats,
  getAllCacheStats,
  convertToModelEntry,
} from './models/cache.js';
export type { FetchedModelEntry, ModelCacheEntry, ModelCache, CacheStats } from './models/cache.js';

// Model refresh
export { refreshProviderModels, refreshAllProviders } from './providers/model-refresh.js';
export type { RefreshResult } from './providers/model-refresh.js';

// Fetchers
export {
  fetchOpenRouterModels,
  fetchCopilotModels,
  fetchOpenCodeModels,
  fetchOpenCodeZenModels,
  getCopilotModelList,
  addCopilotModel,
} from './providers/fetchers/index.js';

// MCP Config
export { loadMCPConfig, saveMCPConfig, removeMCPConfig } from './config/mcp.js';
