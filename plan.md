# personal-cli — Implementation Plan

## Project Overview

`personal-cli` is a monorepo TUI (terminal UI) AI agent built with:
- **Ink 6** (React 19 in the terminal) for the UI
- **Vercel AI SDK v6** (`ai@6.0.x`) for streaming LLM calls
- **pnpm workspaces + Turborepo** for the monorepo
- **TypeScript + Zod** everywhere

### Package Graph
```
@personal-cli/shared   → types, Zod schemas, constants
@personal-cli/core     → Agent class, ProviderManager, config loader
@personal-cli/tools    → All AI tools (readFile, writeFile, runCommand, git, etc.)
@personal-cli/cli      → Ink TUI (React components, hooks, entry point)
```

### Build command
```bash
export PATH="$PATH:/c/Users/ramos/AppData/Roaming/npm"
pnpm build
```

### Run command
```powershell
$env:OPENCODE_API_KEY="..."; node packages\cli\dist\bin.js
```

---

## Current State (what already exists)

### Providers supported (packages/core/src/providers/manager.ts)
- `opencode-zen` ✅ working (OpenAI-compat, uses `.chat()` routing to `/chat/completions`)
- `anthropic` ✅ working
- `openai` ✅ working
- `custom` ✅ working (OpenAI-compat with custom baseURL)
- `google` ❌ throws "not yet supported"
- `mistral` ❌ throws "not yet supported"
- `ollama` ❌ throws "not yet supported"

### Config system (packages/core/src/config/loader.ts)
- Reads `~/.personal-cli/providers.yaml` for provider config and defaults
- No credential file — API keys come from env vars only
- `loadConfig()` → `AppConfig`, `getDefaultModel(config)` → `{ provider, modelId }`

### Slash commands in app (packages/cli/src/app.tsx)
- `/model <provider> <modelId>` — switches model (requires exact IDs, no help)
- `/mode <ask|auto|build>` — switches agent mode
- `/clear`, `/cost`, `/help`, `/exit`

### What is NOT implemented yet
1. No model registry/catalog (user must know exact model IDs)
2. No interactive model picker UI
3. No `auth.json` credential storage (keys only from env)
4. No `/provider add` wizard
5. `google`, `mistral`, `ollama` providers not implemented in ProviderManager
6. `getCost()` always returns 0 (pricing data not wired up)
7. No context attachment (`/add <file>`)
8. No conversation persistence or `/history`

---

## Plan: 7 Phases

---

### Phase 1 — Model Registry

**Purpose:** A static catalog of well-known models with metadata (context window, pricing). This is the foundation for the picker (Phase 4) and cost tracking.

**New file: `packages/shared/src/models/registry.ts`**

```ts
import type { ProviderName } from '../types/index.js';

export interface ModelEntry {
  provider: ProviderName;
  id: string;
  label: string;
  contextWindow: number;
  inputCostPer1M: number | null;   // null = free/unknown
  outputCostPer1M: number | null;
  free: boolean;
}

export const MODEL_REGISTRY: ModelEntry[] = [
  // opencode-zen (free tier)
  { provider: 'opencode-zen', id: 'kimi-k2.5-free',             label: 'Kimi K2.5',          contextWindow: 131_072,   inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'opencode-zen', id: 'minimax-m2.5-free',           label: 'MiniMax M2.5',        contextWindow: 1_000_000, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'opencode-zen', id: 'minimax-m2.1-free',           label: 'MiniMax M2.1',        contextWindow: 1_000_000, inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'opencode-zen', id: 'trinity-large-preview-free',  label: 'Trinity Large',       contextWindow: 32_768,    inputCostPer1M: null, outputCostPer1M: null, free: true },
  // anthropic
  { provider: 'anthropic', id: 'claude-opus-4-6',                label: 'Claude Opus 4.6',     contextWindow: 200_000,   inputCostPer1M: 15,   outputCostPer1M: 75,   free: false },
  { provider: 'anthropic', id: 'claude-sonnet-4-6',              label: 'Claude Sonnet 4.6',   contextWindow: 200_000,   inputCostPer1M: 3,    outputCostPer1M: 15,   free: false },
  { provider: 'anthropic', id: 'claude-haiku-4-5-20251001',      label: 'Claude Haiku 4.5',    contextWindow: 200_000,   inputCostPer1M: 0.8,  outputCostPer1M: 4,    free: false },
  // openai
  { provider: 'openai', id: 'gpt-4o',                            label: 'GPT-4o',              contextWindow: 128_000,   inputCostPer1M: 2.5,  outputCostPer1M: 10,   free: false },
  { provider: 'openai', id: 'gpt-4o-mini',                       label: 'GPT-4o Mini',         contextWindow: 128_000,   inputCostPer1M: 0.15, outputCostPer1M: 0.6,  free: false },
  { provider: 'openai', id: 'o4-mini',                           label: 'o4 Mini',             contextWindow: 200_000,   inputCostPer1M: 1.1,  outputCostPer1M: 4.4,  free: false },
  // google
  { provider: 'google', id: 'gemini-2.5-pro',                    label: 'Gemini 2.5 Pro',      contextWindow: 1_048_576, inputCostPer1M: 1.25, outputCostPer1M: 10,   free: false },
  { provider: 'google', id: 'gemini-2.5-flash',                  label: 'Gemini 2.5 Flash',    contextWindow: 1_048_576, inputCostPer1M: 0.15, outputCostPer1M: 0.6,  free: false },
  { provider: 'google', id: 'gemini-2.0-flash',                  label: 'Gemini 2.0 Flash',    contextWindow: 1_048_576, inputCostPer1M: 0.1,  outputCostPer1M: 0.4,  free: false },
  // mistral
  { provider: 'mistral', id: 'mistral-large-latest',             label: 'Mistral Large',       contextWindow: 131_072,   inputCostPer1M: 2,    outputCostPer1M: 6,    free: false },
  { provider: 'mistral', id: 'codestral-latest',                 label: 'Codestral',           contextWindow: 256_000,   inputCostPer1M: 0.3,  outputCostPer1M: 0.9,  free: false },
  { provider: 'mistral', id: 'mistral-small-latest',             label: 'Mistral Small',       contextWindow: 131_072,   inputCostPer1M: 0.1,  outputCostPer1M: 0.3,  free: false },
  // ollama (local — free, context window varies by model/hardware)
  { provider: 'ollama', id: 'llama3.3',                          label: 'Llama 3.3',           contextWindow: 128_000,   inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'ollama', id: 'qwen2.5-coder:14b',                 label: 'Qwen 2.5 Coder 14B', contextWindow: 131_072,   inputCostPer1M: null, outputCostPer1M: null, free: true },
  { provider: 'ollama', id: 'deepseek-r1:14b',                   label: 'DeepSeek R1 14B',    contextWindow: 131_072,   inputCostPer1M: null, outputCostPer1M: null, free: true },
];

export function getModelEntry(provider: ProviderName, modelId: string): ModelEntry | undefined {
  return MODEL_REGISTRY.find(m => m.provider === provider && m.id === modelId);
}

export function getModelsByProvider(): Map<ProviderName, ModelEntry[]> {
  const map = new Map<ProviderName, ModelEntry[]>();
  for (const m of MODEL_REGISTRY) {
    if (!map.has(m.provider)) map.set(m.provider, []);
    map.get(m.provider)!.push(m);
  }
  return map;
}
```

**Modified: `packages/shared/src/index.ts`**
- Add export: `export * from './models/registry.js';`

**Modified: `packages/core/src/agent.ts`**
- Import `getModelEntry` from `@personal-cli/shared`
- In the `finish` handler after `const usage = await result.usage`:
  ```ts
  const entry = getModelEntry(this.providerManager.getActiveModel().provider, this.providerManager.getActiveModel().modelId);
  if (entry?.inputCostPer1M != null) {
    this.totalCost += (promptTokens / 1_000_000) * entry.inputCostPer1M;
  }
  if (entry?.outputCostPer1M != null) {
    this.totalCost += (completionTokens / 1_000_000) * entry.outputCostPer1M;
  }
  ```

---

### Phase 2 — auth.json Credential Storage

**Purpose:** Store API keys persistently in `~/.personal-cli/auth.json` (mode 0o600). Mirrors OpenCode's auth.json pattern. Eliminates need to set env vars on every shell session.

**New file: `packages/core/src/config/auth.ts`**

```ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { CONFIG_DIR } from '@personal-cli/shared';

interface AuthStore {
  [provider: string]: { key: string };
}

const authPath = () => join(homedir(), CONFIG_DIR, 'auth.json');

export function readAuth(): AuthStore {
  const p = authPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as AuthStore;
  } catch {
    return {};
  }
}

export function writeAuth(store: AuthStore): void {
  const dir = join(homedir(), CONFIG_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(authPath(), JSON.stringify(store, null, 2), { mode: 0o600 });
}

export function setProviderKey(provider: string, key: string): void {
  const store = readAuth();
  store[provider] = { key };
  writeAuth(store);
}

export function getProviderKey(provider: string): string | undefined {
  return readAuth()[provider]?.key;
}

export function removeProviderKey(provider: string): void {
  const store = readAuth();
  delete store[provider];
  writeAuth(store);
}
```

**Export from `packages/core/src/index.ts`:**
```ts
export { readAuth, writeAuth, setProviderKey, getProviderKey, removeProviderKey } from './config/auth.js';
```

**Modified: `packages/core/src/providers/manager.ts`**
- Add a private helper `resolveKey(provider: string, envVar: string): string | undefined`:
  ```ts
  private resolveKey(provider: string, envVar: string): string | undefined {
    return this.options.apiKey ?? getProviderKey(provider) ?? process.env[envVar];
  }
  ```
- Use it in each `case` of `getModel()`:
  - `anthropic`: `apiKey: this.resolveKey('anthropic', 'ANTHROPIC_API_KEY')`
  - `openai`: `apiKey: this.resolveKey('openai', 'OPENAI_API_KEY')`
  - `opencode-zen`: `apiKey: this.resolveKey('opencode-zen', 'OPENCODE_API_KEY')`

---

### Phase 3 — Implement Missing Providers

**Install packages (run in repo root):**
```bash
pnpm add @ai-sdk/google @ai-sdk/mistral --filter @personal-cli/core
```

**Modified: `packages/core/src/providers/manager.ts`**

Replace the stubs for `google`, `mistral`, `ollama`:

```ts
case 'google': {
  const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
  const client = createGoogleGenerativeAI({
    apiKey: this.resolveKey('google', 'GOOGLE_API_KEY'),
  });
  return client(modelId);
}

case 'mistral': {
  const { createMistral } = await import('@ai-sdk/mistral');
  const client = createMistral({
    apiKey: this.resolveKey('mistral', 'MISTRAL_API_KEY'),
  });
  return client(modelId);
}

case 'ollama': {
  // Ollama runs locally on port 11434 with an OpenAI-compatible API
  const client = createOpenAI({
    baseURL: this.options.baseUrl ?? 'http://localhost:11434/v1',
    apiKey: 'ollama',  // required by SDK but ignored by Ollama
  });
  return client.chat(modelId);
}
```

Note: `getModel()` must become `async getModel()` since google/mistral use dynamic imports. Update the return type to `Promise<LanguageModel>` and update all callers in `agent.ts` accordingly (`const model = await this.providerManager.getModel()`).

---

### Phase 4 — Interactive Model Picker

**New file: `packages/cli/src/components/ModelPicker.tsx`**

An inline Ink component that renders below the message list. Uses `useInput` for keyboard navigation.

```tsx
import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { MODEL_REGISTRY, getModelsByProvider } from '@personal-cli/shared';
import type { ProviderName } from '@personal-cli/shared';

interface Props {
  onSelect: (provider: ProviderName, modelId: string) => void;
  onClose: () => void;
}

export function ModelPicker({ onSelect, onClose }: Props) {
  const [filter, setFilter] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);

  // Filter and flatten models
  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return MODEL_REGISTRY.filter(
      m => m.id.includes(q) || m.label.toLowerCase().includes(q) || m.provider.includes(q)
    );
  }, [filter]);

  useInput((input, key) => {
    if (key.escape) { onClose(); return; }
    if (key.return) {
      const m = filtered[focusIndex];
      if (m) onSelect(m.provider, m.id);
      return;
    }
    if (key.upArrow) { setFocusIndex(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setFocusIndex(i => Math.min(filtered.length - 1, i + 1)); return; }
    if (key.backspace || key.delete) { setFilter(f => f.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) { setFilter(f => f + input); setFocusIndex(0); }
  });

  // Group filtered models by provider for display
  const byProvider = new Map<ProviderName, typeof filtered>();
  for (const m of filtered) {
    if (!byProvider.has(m.provider)) byProvider.set(m.provider, []);
    byProvider.get(m.provider)!.push(m);
  }

  // Build flat list index for focus tracking
  const flatList: typeof filtered = [];
  for (const [, models] of byProvider) flatList.push(...models);

  const formatCost = (m: typeof MODEL_REGISTRY[0]) => {
    if (m.free) return 'FREE';
    if (m.inputCostPer1M == null) return '?';
    return `$${m.inputCostPer1M}/$${m.outputCostPer1M}`;
  };

  const formatCtx = (n: number) => n >= 1_000_000 ? `${n/1_000_000}M` : `${n/1_000}k`;

  return (
    <Box borderStyle="round" borderColor="#58A6FF" flexDirection="column" paddingX={1} marginY={1}>
      <Box marginBottom={1}>
        <Text bold color="#58A6FF">SELECT MODEL  </Text>
        <Text color="#8C959F">Filter: </Text>
        <Text color="#C9D1D9">{filter || ' '}</Text>
        <Text color="#484F58">_</Text>
      </Box>

      {filtered.length === 0 && (
        <Text color="#484F58">No models match "{filter}"</Text>
      )}

      {Array.from(byProvider.entries()).map(([provider, models]) => (
        <Box key={provider} flexDirection="column" marginBottom={1}>
          <Text color="#484F58" bold>{provider}</Text>
          {models.map(m => {
            const idx = flatList.indexOf(m);
            const focused = idx === focusIndex;
            return (
              <Box key={m.id} paddingLeft={2}>
                <Text color={focused ? '#58A6FF' : '#8C959F'}>{focused ? '▶ ' : '  '}</Text>
                <Text color={focused ? '#C9D1D9' : '#8C959F'} bold={focused}>
                  {m.id.padEnd(38)}
                </Text>
                <Text color="#484F58">{formatCtx(m.contextWindow).padEnd(8)}</Text>
                <Text color={m.free ? '#3FB950' : '#8C959F'}>{formatCost(m)}</Text>
              </Box>
            );
          })}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color="#484F58">↑↓ navigate  Enter select  Esc cancel</Text>
      </Box>
    </Box>
  );
}
```

**Modified: `packages/cli/src/hooks/useAgent.ts`**
- Add to `AgentState`:
  ```ts
  isPickingModel: boolean;
  ```
- Initialize to `false`.
- Expose `openModelPicker: () => void` and `closeModelPicker: () => void` in the returned object.

**Modified: `packages/cli/src/app.tsx`**
- Destructure `isPickingModel, openModelPicker, closeModelPicker` from `useAgent()`.
- Change `/model` handler:
  ```ts
  if (trimmed === '/model') {
    openModelPicker();
    setInputValue('');
    return;
  }
  if (trimmed.startsWith('/model ')) {
    const rest = trimmed.slice(7).trim();
    // Support both "provider/modelId" and "provider modelId"
    const parts = rest.includes('/') ? rest.split('/') : rest.split(' ');
    if (parts.length >= 2) {
      switchModel(parts[0], parts.slice(1).join('/'));
      addSystemMessage(`Switched to ${parts[0]}/${parts.slice(1).join('/')}`);
    } else {
      addSystemMessage('Usage: /model <provider/modelId> or type /model to browse');
    }
    setInputValue('');
    return;
  }
  ```
- Render picker in the conversation box:
  ```tsx
  {isPickingModel && (
    <ModelPicker
      onSelect={(provider, modelId) => {
        switchModel(provider, modelId);
        closeModelPicker();
        addSystemMessage(`Switched to ${provider}/${modelId}`);
      }}
      onClose={closeModelPicker}
    />
  )}
  ```

---

### Phase 5 — Provider Add Wizard (/provider add)

**New file: `packages/cli/src/components/ProviderWizard.tsx`**

```tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  providerName: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

export function ProviderWizard({ providerName, onSave, onClose }: Props) {
  const [key, setKey] = useState('');

  useInput((input, inkKey) => {
    if (inkKey.escape) { onClose(); return; }
    if (inkKey.return) { if (key.trim()) onSave(key.trim()); return; }
    if (inkKey.backspace || inkKey.delete) { setKey(k => k.slice(0, -1)); return; }
    if (input && !inkKey.ctrl) setKey(k => k + input);
  });

  return (
    <Box borderStyle="round" borderColor="#D29922" flexDirection="column" paddingX={1} marginY={1}>
      <Text bold color="#D29922">ADD PROVIDER: {providerName.toUpperCase()}</Text>
      <Box marginTop={1}>
        <Text color="#8C959F">API Key: </Text>
        <Text color="#C9D1D9">{'•'.repeat(key.length)}</Text>
        <Text color="#484F58">_</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="#484F58">Enter to save  Esc to cancel</Text>
      </Box>
    </Box>
  );
}
```

**Modified: `packages/cli/src/app.tsx`**
- Add state: `const [pendingProviderAdd, setPendingProviderAdd] = useState<string | null>(null)`
- Import `setProviderKey, removeProviderKey, readAuth` from `@personal-cli/core`
- Add slash command handlers:
  ```ts
  if (trimmed.startsWith('/provider add ')) {
    const name = trimmed.slice(14).trim();
    setPendingProviderAdd(name);
    setInputValue('');
    return;
  }
  if (trimmed === '/provider list') {
    const auth = readAuth();
    const lines = Object.entries(auth).map(([p, v]) => `  ${p}: ${'•'.repeat(Math.min(8, v.key.length))}...`);
    addSystemMessage(lines.length ? `Configured providers:\n${lines.join('\n')}` : 'No providers configured in auth.json.');
    setInputValue('');
    return;
  }
  if (trimmed.startsWith('/provider remove ')) {
    const name = trimmed.slice(17).trim();
    removeProviderKey(name);
    addSystemMessage(`Removed key for ${name}.`);
    setInputValue('');
    return;
  }
  ```
- Render wizard:
  ```tsx
  {pendingProviderAdd && (
    <ProviderWizard
      providerName={pendingProviderAdd}
      onSave={(key) => {
        setProviderKey(pendingProviderAdd, key);
        addSystemMessage(`Saved API key for ${pendingProviderAdd}.`);
        setPendingProviderAdd(null);
      }}
      onClose={() => setPendingProviderAdd(null)}
    />
  )}
  ```
- Update `/help` text to include the new provider commands.

---

### Phase 6 — Context Attach (/add)

**Purpose:** Let the user attach file contents as context before sending a message.

**Modified: `packages/cli/src/hooks/useAgent.ts`**
- Add to `AgentState`: `attachedFiles: Array<{ path: string; content: string }>`
- Initialize to `[]`
- Add method:
  ```ts
  attachFile: useCallback(async (filePath: string) => {
    const content = await fs.readFile(filePath, 'utf-8').catch(() => null);
    if (!content) return false;
    setState(prev => ({ ...prev, attachedFiles: [...prev.attachedFiles, { path: filePath, content }] }));
    return true;
  }, []),
  clearAttachments: useCallback(() => {
    setState(prev => ({ ...prev, attachedFiles: [] }));
  }, []),
  ```

**Modified: `packages/core/src/agent.ts`**
- Change signature: `async *sendMessage(userContent: string, attachedFiles?: Array<{ path: string; content: string }>)`
- If `attachedFiles?.length`, prepend a context block to the user message content:
  ```ts
  const contextBlock = attachedFiles?.length
    ? `<context>\n${attachedFiles.map(f => `<file path="${f.path}">\n${f.content}\n</file>`).join('\n')}\n</context>\n\n`
    : '';
  const fullContent = contextBlock + userContent;
  ```
- Use `fullContent` instead of `userContent` when building `userMessage.content`.

**Modified: `packages/cli/src/hooks/useAgent.ts`**
- Pass `attachedFiles` to `agent.sendMessage(content, state.attachedFiles)`
- Clear attachments after each send (or keep them — user preference).

**Modified: `packages/cli/src/app.tsx`**
- Add handlers:
  ```ts
  if (trimmed.startsWith('/add ')) {
    const filePath = trimmed.slice(5).trim();
    const ok = await attachFile(filePath);
    addSystemMessage(ok ? `Attached: ${filePath}` : `Error: could not read ${filePath}`);
    setInputValue('');
    return;
  }
  if (trimmed === '/add --clear' || trimmed === '/detach') {
    clearAttachments();
    addSystemMessage('Cleared all attached files.');
    setInputValue('');
    return;
  }
  ```

**Modified: `packages/cli/src/components/StatusBar.tsx`**
- Add prop `attachedCount?: number`
- When > 0, show `📎 ${attachedCount}` in the status bar next to the token count.

---

### Phase 7 — Conversation History

**New file: `packages/core/src/persistence/conversations.ts`**

```ts
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Message, ActiveModel } from '@personal-cli/shared';

const HISTORY_DIR = () => join(homedir(), '.personal-cli', 'conversations');

export interface ConversationMeta {
  id: string;
  title: string;
  date: number;
  model: string;        // "provider/modelId"
  messageCount: number;
}

export interface SavedConversation {
  id: string;
  title: string;
  date: number;
  model: ActiveModel;
  messages: Message[];
}

function ensureDir() {
  const d = HISTORY_DIR();
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

export function saveConversation(messages: Message[], model: ActiveModel): string {
  ensureDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const firstUserMsg = messages.find(m => m.role === 'user');
  const title = (firstUserMsg?.content ?? 'Untitled').slice(0, 60);
  const data: SavedConversation = { id, title, date: Date.now(), model, messages };
  writeFileSync(join(HISTORY_DIR(), `${id}.json`), JSON.stringify(data, null, 2));
  return id;
}

export function loadConversation(id: string): SavedConversation | null {
  const p = join(HISTORY_DIR(), `${id}.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

export function listConversations(): ConversationMeta[] {
  ensureDir();
  return readdirSync(HISTORY_DIR())
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const d: SavedConversation = JSON.parse(readFileSync(join(HISTORY_DIR(), f), 'utf-8'));
        return { id: d.id, title: d.title, date: d.date, model: `${d.model.provider}/${d.model.modelId}`, messageCount: d.messages.length };
      } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => b!.date - a!.date) as ConversationMeta[];
}

export function deleteConversation(id: string): void {
  const p = join(HISTORY_DIR(), `${id}.json`);
  if (existsSync(p)) unlinkSync(p);
}
```

**Export from `packages/core/src/index.ts`:**
```ts
export { saveConversation, loadConversation, listConversations, deleteConversation } from './persistence/conversations.js';
```

**Modified: `packages/core/src/agent.ts`**
- Import `saveConversation` from `./persistence/conversations.js`
- At the end of a successful `sendMessage()` call (after yielding `finish`), fire and forget:
  ```ts
  saveConversation(this.messages, this.providerManager.getActiveModel()).catch(() => {});
  ```
- Add method `loadHistory(id: string)`:
  ```ts
  loadHistory(id: string): boolean {
    const saved = loadConversation(id);
    if (!saved) return false;
    this.messages = saved.messages;
    return true;
  }
  ```

**New file: `packages/cli/src/components/HistoryPicker.tsx`**

Same UI pattern as `ModelPicker`. Shows a list of saved conversations with title, date (relative), model, message count. Arrow keys + Enter to load, Esc to close. Fetch `listConversations()` on mount.

```tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { listConversations } from '@personal-cli/core';
import type { ConversationMeta } from '@personal-cli/core';

interface Props {
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function HistoryPicker({ onSelect, onClose }: Props) {
  const [items] = useState<ConversationMeta[]>(() => listConversations());
  const [focusIndex, setFocusIndex] = useState(0);

  useInput((_, key) => {
    if (key.escape) { onClose(); return; }
    if (key.return && items[focusIndex]) { onSelect(items[focusIndex].id); return; }
    if (key.upArrow) setFocusIndex(i => Math.max(0, i - 1));
    if (key.downArrow) setFocusIndex(i => Math.min(items.length - 1, i + 1));
  });

  const relativeDate = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  };

  return (
    <Box borderStyle="round" borderColor="#8B949E" flexDirection="column" paddingX={1} marginY={1}>
      <Text bold color="#8B949E">CONVERSATION HISTORY</Text>
      {items.length === 0 && <Text color="#484F58">No saved conversations.</Text>}
      {items.map((item, i) => (
        <Box key={item.id} paddingLeft={1}>
          <Text color={i === focusIndex ? '#58A6FF' : '#8C959F'}>{i === focusIndex ? '▶ ' : '  '}</Text>
          <Text color={i === focusIndex ? '#C9D1D9' : '#8C959F'}>
            {item.title.slice(0, 42).padEnd(43)}
          </Text>
          <Text color="#484F58">{relativeDate(item.date).padEnd(10)}</Text>
          <Text color="#484F58">{item.model}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color="#484F58">↑↓ navigate  Enter load  Esc cancel</Text>
      </Box>
    </Box>
  );
}
```

**Modified: `packages/cli/src/app.tsx`**
- Add state: `const [showHistory, setShowHistory] = useState(false)`
- Add to `useAgent()` destructure: `loadHistory` (new hook method wrapping `agent.loadHistory`)
- Add handlers:
  ```ts
  if (trimmed === '/history') {
    setShowHistory(true);
    setInputValue('');
    return;
  }
  if (trimmed === '/history clear') {
    // TODO: confirm + deleteConversation for all
    addSystemMessage('Use /history and select conversations to remove.');
    setInputValue('');
    return;
  }
  ```
- Render:
  ```tsx
  {showHistory && (
    <HistoryPicker
      onSelect={(id) => {
        loadHistory(id);
        setShowHistory(false);
        addSystemMessage('Conversation loaded.');
      }}
      onClose={() => setShowHistory(false)}
    />
  )}
  ```

---

## Updated Slash Command Reference

After all phases complete:

```
/model                        → opens interactive model picker
/model <provider/modelId>     → direct model switch (e.g. /model anthropic/claude-sonnet-4-6)
/mode <ask|auto|build>        → switch agent mode
/provider add <name>          → wizard to save API key for a provider
/provider list                → show configured providers from auth.json
/provider remove <name>       → remove provider key
/add <filepath>               → attach file contents as context
/add --clear                  → remove all attached context files
/history                      → open conversation history picker
/cost                         → show session token usage and estimated cost
/clear                        → clear conversation history
/help                         → show all available commands
/exit | /quit | Ctrl+C        → exit
```

---

## Implementation Order Summary

| Phase | What | Files Created | Files Modified |
|-------|------|---------------|----------------|
| 1 | Model registry + cost tracking | `shared/src/models/registry.ts` | `shared/src/index.ts`, `core/src/agent.ts` |
| 2 | auth.json + key resolution | `core/src/config/auth.ts` | `core/src/index.ts`, `core/src/providers/manager.ts` |
| 3 | google/mistral/ollama providers | — | `core/src/providers/manager.ts`, `cli/package.json`, `core/package.json` |
| 4 | Interactive model picker | `cli/src/components/ModelPicker.tsx` | `cli/src/hooks/useAgent.ts`, `cli/src/app.tsx` |
| 5 | /provider add wizard | `cli/src/components/ProviderWizard.tsx` | `cli/src/app.tsx` |
| 6 | /add file context attach | — | `core/src/agent.ts`, `cli/src/hooks/useAgent.ts`, `cli/src/app.tsx`, `cli/src/components/StatusBar.tsx` |
| 7 | Conversation history | `core/src/persistence/conversations.ts`, `cli/src/components/HistoryPicker.tsx` | `core/src/agent.ts`, `cli/src/app.tsx` |

---

## Verification After Each Phase

```bash
# Build check (must pass after every phase)
export PATH="$PATH:/c/Users/ramos/AppData/Roaming/npm"
pnpm build

# Phase 1 — model registry exports correctly
node -e "import('@personal-cli/shared').then(m => console.log(m.MODEL_REGISTRY.length + ' models'))"

# Phase 2 — auth.json
node -e "
  const { setProviderKey, getProviderKey } = require('./packages/core/dist/index.js');
  setProviderKey('test', 'sk-test-123');
  console.log(getProviderKey('test')); // sk-test-123
"

# Phase 3 — new providers don't crash
# Set GOOGLE_API_KEY or MISTRAL_API_KEY, then in the app:
# /model google/gemini-2.5-flash

# Phase 4 — model picker
# node packages/cli/dist/bin.js → type /model → picker appears → arrow keys work → Enter switches

# Phase 5 — provider wizard
# In app: /provider add anthropic → wizard appears → enter key → /provider list shows it

# Phase 6 — context attach
# In app: /add packages/core/src/agent.ts → ask "what does sendMessage do?" → agent references file

# Phase 7 — history
# Have a conversation → exit → re-launch → /history → select previous → conversation restored
```

---

## Key Technical Notes

1. **`getModel()` becomes async** in Phase 3 due to dynamic imports for google/mistral. Update `agent.ts` to `await this.providerManager.getModel()`.

2. **Ink `useInput` ordering** — `ModelPicker` and `HistoryPicker` use `useInput`. When they are mounted, their `useInput` handlers fire first. The main app's `useInput` (Ctrl+C exit) should still function since Ink calls all registered handlers. No conflict expected but test carefully.

3. **`ProviderWizard` input vs `InputBox`** — When the wizard is mounted, the regular `InputBox` should be disabled (`isDisabled={true}`) so keystrokes go to the wizard. Add a condition: `isDisabled={isStreaming || !!pendingProviderAdd || isPickingModel || showHistory}`.

4. **Conversation auto-save** fires after each completed `sendMessage()`. To avoid saving duplicate entries for tool-loop intermediate steps, only save once per user turn (after `finish` event).

5. **Context block size** — In Phase 6, consider truncating very large files before injecting as context. A reasonable limit is 50k characters per file to avoid blowing the token budget.
