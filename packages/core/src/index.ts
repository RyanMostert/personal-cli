export { Agent } from './agent.js';
export type { AgentOptions } from './agent.js';
export { ProviderManager } from './providers/manager.js';
export type { ProviderManagerOptions } from './providers/manager.js';
export { loadConfig, getDefaultModel, loadSettings, saveSettings } from './config/loader.js';
<<<<<<< HEAD
export { readAuth, writeAuth, setProviderKey, getProviderKey, removeProviderKey } from './config/auth.js';
=======
export {
  readAuth,
  writeAuth,
  setProviderKey,
  getProviderKey,
  removeProviderKey,
} from './config/auth.js';
>>>>>>> tools_improvement
export {
  saveConversation,
  loadConversation,
  listConversations,
  deleteConversation,
  renameConversation,
  exportConversation,
} from './persistence/conversations.js';
export type { ConversationMeta, SavedConversation } from './persistence/conversations.js';
export {
  getFrecency,
  getBatchFrecency,
  getTopRecentFiles,
  recordAccess,
} from './persistence/frecency.js';
export { appendHistory, loadHistory } from './persistence/history.js';
<<<<<<< HEAD
export { getTheme, setTheme, getRecentModels, addRecentModel, getTelemetryEnabled, setTelemetryEnabled } from './config/prefs.js';
=======
export {
  getTheme,
  setTheme,
  getRecentModels,
  addRecentModel,
  getTelemetryEnabled,
  setTelemetryEnabled,
} from './config/prefs.js';
>>>>>>> tools_improvement
export { trackEvent } from './telemetry.js';
export type { TelemetryEvent } from './telemetry.js';
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
<<<<<<< HEAD
export { refreshProviderModels, refreshAllProviders, testProviderConnection } from './providers/model-refresh.js';
=======
export {
  refreshProviderModels,
  refreshAllProviders,
  testProviderConnection,
} from './providers/model-refresh.js';
>>>>>>> tools_improvement
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

// Provider factory (runtime-aware provider info)
export { getProviderEntries, getProviderEntry } from './providers/provider-factory.js';

// MCP Config
export { loadMCPConfig, saveMCPConfig, removeMCPConfig } from './config/mcp.js';

// Config store abstraction
<<<<<<< HEAD
export { ConfigStore, InMemoryConfigStore, createInMemoryConfigStore } from './config/config-store.js';

// Persistence store (filesystem default, swap-able for tests)
export { setPersistenceStore, getPersistenceStore, createInMemoryPersistenceStore, InMemoryPersistenceStore } from './persistence/store.js';
export type { PersistenceStore } from './persistence/store.js';

=======
export {
  ConfigStore,
  InMemoryConfigStore,
  createInMemoryConfigStore,
} from './config/config-store.js';

// Persistence store (filesystem default, swap-able for tests)
export {
  setPersistenceStore,
  getPersistenceStore,
  createInMemoryPersistenceStore,
  InMemoryPersistenceStore,
} from './persistence/store.js';
export type { PersistenceStore } from './persistence/store.js';
>>>>>>> tools_improvement
