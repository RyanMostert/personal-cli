import { homedir } from 'os';
import { join } from 'path';
<<<<<<< HEAD
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import type { Message, ActiveModel } from '@personal-cli/shared';

// Conversation/frecency/history types (kept local to persistence layer)
export interface ConversationMeta {
  id: string;
  title: string;
  date: number;
  model: string; // "provider/modelId"
  messageCount: number;
}

export interface SavedConversation {
  id: string;
  title: string;
  date: number;
  model: ActiveModel;
  messages: Message[];
}

export interface SavedWorkspace extends SavedConversation {
  attachments: any[];
  tokensUsed: number;
  cost: number;
}

interface HistoryEntry {
  text: string;
  timestamp: number;
}

interface FrecencyEntry {
  score: number;
  lastUsed: number;
}
=======
import {
  readFileSync,
  writeFileSync,
  existsSync,
  appendFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from 'fs';
import type { Message, ActiveModel } from '@personal-cli/shared';
import type {
  ConversationMeta,
  SavedConversation,
  SavedWorkspace,
  HistoryEntry,
  FrecencyEntry,
} from './types.js';
export type { ConversationMeta, SavedConversation, SavedWorkspace } from './types.js';
>>>>>>> tools_improvement

export interface PersistenceStore {
  appendHistory(text: string): void;
  loadHistory(): string[];

  saveConversation(
    messages: Message[],
    model: ActiveModel,
    firstUserMessage: string,
    title?: string,
    existingId?: string,
  ): string;
  loadConversation(id: string): SavedConversation | null;
  listConversations(): ConversationMeta[];
  deleteConversation(id: string): void;
  renameConversation(id: string, title: string): boolean;
  saveWorkspace(path: string, data: SavedWorkspace): void;
  loadWorkspace(path: string): SavedWorkspace | null;
<<<<<<< HEAD
  exportConversation(messages: Message[], model: ActiveModel, tokensUsed: number, cost: number, path?: string): string;
=======
  exportConversation(
    messages: Message[],
    model: ActiveModel,
    tokensUsed: number,
    cost: number,
    path?: string,
  ): string;
>>>>>>> tools_improvement

  getFrecency(path: string): number;
  getBatchFrecency(paths: string[]): Map<string, number>;
  getTopRecentFiles(n: number): string[];
  recordAccess(path: string): void;
}

// Filesystem-backed implementation (current behavior moved here)
class FileSystemPersistenceStore implements PersistenceStore {
  // History
  private HISTORY_FILE = join(homedir(), '.personal-cli', 'prompt-history.jsonl');
  private HISTORY_MAX = 100;

  appendHistory(text: string): void {
    if (!text.trim()) return;
    try {
      const history = this.loadHistory();
      if (history.length > 0 && history[0] === text.trim()) {
        return;
      }
      const entry: HistoryEntry = { text: text.trim(), timestamp: Date.now() };
      appendFileSync(this.HISTORY_FILE, JSON.stringify(entry) + '\n', { mode: 0o600 });

      // Trim
      const data = readFileSync(this.HISTORY_FILE, 'utf-8').trim();
      const lines = data ? data.split('\n') : [];
      if (lines.length > this.HISTORY_MAX) {
        const trimmed = lines.slice(-this.HISTORY_MAX);
        writeFileSync(this.HISTORY_FILE, trimmed.join('\n') + '\n', { mode: 0o600 });
      }
    } catch {
      // ignore
    }
  }

  loadHistory(): string[] {
    try {
      if (!existsSync(this.HISTORY_FILE)) return [];
      const data = readFileSync(this.HISTORY_FILE, 'utf-8').trim();
      if (!data) return [];
      const lines = data.split('\n');
      const entries: HistoryEntry[] = [];
      for (const line of lines) {
        try {
          const e = JSON.parse(line) as HistoryEntry;
          if (e.text) entries.push(e);
        } catch {
          // skip
        }
      }
      return entries.sort((a, b) => b.timestamp - a.timestamp).map((e) => e.text);
    } catch {
      return [];
    }
  }

  // Conversations
  private HISTORY_DIR() {
    return join(homedir(), '.personal-cli', 'conversations');
  }

  private ensureDir() {
    const d = this.HISTORY_DIR();
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }

  saveConversation(
    messages: Message[],
    model: ActiveModel,
    firstUserMessage: string,
    title?: string,
    existingId?: string,
  ): string {
    this.ensureDir();
    const timestamp = Date.now();
    const id =
      existingId ??
      (title
        ? `${this.slugify(title)}-${timestamp.toString().slice(-6)}`
        : `${timestamp}-${Math.random().toString(36).slice(2, 8)}`);
    const title_ = (title ?? firstUserMessage ?? 'Untitled').slice(0, 60);
    const data: SavedConversation = { id, title: title_, date: timestamp, model, messages };
    writeFileSync(join(this.HISTORY_DIR(), `${id}.json`), JSON.stringify(data, null, 2));
    return id;
  }

  loadConversation(id: string): SavedConversation | null {
    const p = join(this.HISTORY_DIR(), `${id}.json`);
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(readFileSync(p, 'utf-8')) as SavedConversation;
    } catch {
      return null;
    }
  }

  listConversations(): ConversationMeta[] {
    this.ensureDir();
    return readdirSync(this.HISTORY_DIR())
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        try {
<<<<<<< HEAD
          const d = JSON.parse(readFileSync(join(this.HISTORY_DIR(), f), 'utf-8')) as SavedConversation;
=======
          const d = JSON.parse(
            readFileSync(join(this.HISTORY_DIR(), f), 'utf-8'),
          ) as SavedConversation;
>>>>>>> tools_improvement
          return {
            id: d.id,
            title: d.title,
            date: d.date,
            model: `${d.model.provider}/${d.model.modelId}`,
            messageCount: d.messages.length,
          } as ConversationMeta;
        } catch {
          return null as unknown as ConversationMeta;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b!.date - a!.date) as ConversationMeta[];
  }

  deleteConversation(id: string): void {
    const p = join(this.HISTORY_DIR(), `${id}.json`);
    if (existsSync(p)) unlinkSync(p);
  }

  renameConversation(id: string, title: string): boolean {
    const p = join(this.HISTORY_DIR(), `${id}.json`);
    if (!existsSync(p)) return false;
    try {
      const data = JSON.parse(readFileSync(p, 'utf-8')) as SavedConversation;
      data.title = title.slice(0, 60);
      writeFileSync(p, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  }

  saveWorkspace(path: string, data: SavedWorkspace): void {
    const fullPath = path.endsWith('.pcli') ? path : `${path}.pcli`;
    writeFileSync(fullPath, JSON.stringify(data, null, 2));
  }

  loadWorkspace(path: string): SavedWorkspace | null {
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, 'utf-8')) as SavedWorkspace;
    } catch {
      return null;
    }
  }

<<<<<<< HEAD
  exportConversation(messages: Message[], model: ActiveModel, tokensUsed: number, cost: number, path?: string): string {
=======
  exportConversation(
    messages: Message[],
    model: ActiveModel,
    tokensUsed: number,
    cost: number,
    path?: string,
  ): string {
>>>>>>> tools_improvement
    const date = new Date().toISOString().split('T')[0];
    const filePath = path ?? join(homedir(), `conversation-${date}-${Date.now()}.md`);
    const content = [
      `# Conversation Export — ${date}`,
      '',
      `**Model:** ${model.provider} / ${model.modelId}`,
      `**Messages:** ${messages.length}`,
      `**Tokens:** ${tokensUsed.toLocaleString()}`,
      `**Cost:** $${cost.toFixed(4)}`,
      '',
      '---',
      '',
      ...messages.map((m) => {
        const time = new Date(m.timestamp).toLocaleTimeString();
        const role = m.role.charAt(0).toUpperCase() + m.role.slice(1);
        let text = `**${role}** · ${time}\n\n`;
        if (m.toolCalls?.length) {
          text += `*Tool Calls:*\n`;
          for (const tc of m.toolCalls) {
            text += `- **${tc.toolName}**: ${JSON.stringify(tc.args)}\n`;
            if (tc.result) {
              const res = typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result);
              text += `  > ${res.slice(0, 200)}${res.length > 200 ? '...' : ''}\n`;
            }
          }
          text += '\n';
        }
        text += `${m.content}\n`;
        return text;
      }),
    ].join('\n');

    writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  private _frecency_cache: Record<string, FrecencyEntry> | null = null;
  private FRECENCY_FILE = join(homedir(), '.personal-cli', 'file-frecency.json');
  private FRECENCY_DIR = join(homedir(), '.personal-cli');
  private FRECENCY_MAX = 500;

  private readFrecencyStore(): Record<string, FrecencyEntry> {
    if (this._frecency_cache !== null) return this._frecency_cache;
    try {
      if (existsSync(this.FRECENCY_FILE)) {
        this._frecency_cache = JSON.parse(readFileSync(this.FRECENCY_FILE, 'utf-8')) as Record<
          string,
          FrecencyEntry
        >;
        return this._frecency_cache;
      }
    } catch {
      // corrupt
    }
    this._frecency_cache = {};
    return this._frecency_cache;
  }

  private writeFrecencyStore(store: Record<string, FrecencyEntry>): void {
    try {
      const entries = Object.entries(store);
      if (entries.length > this.FRECENCY_MAX) {
        entries.sort((a, b) => b[1].score - a[1].score);
        store = Object.fromEntries(entries.slice(0, this.FRECENCY_MAX));
      }
      mkdirSync(this.FRECENCY_DIR, { recursive: true });
      writeFileSync(this.FRECENCY_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
      this._frecency_cache = store;
    } catch {
      // ignore
    }
  }

  getFrecency(path: string): number {
    const store = this.readFrecencyStore();
    const entry = store[path];
    if (!entry) return 0;
    const daysSince = (Date.now() - entry.lastUsed) / (1000 * 60 * 60 * 24);
    return entry.score + Math.max(0, 10 - daysSince);
  }

  getBatchFrecency(paths: string[]): Map<string, number> {
    const store = this.readFrecencyStore();
    const now = Date.now();
    const out = new Map<string, number>();
    for (const p of paths) {
      const entry = store[p];
      if (!entry) {
        out.set(p, 0);
        continue;
      }
      const days = (now - entry.lastUsed) / (1000 * 60 * 60 * 24);
      out.set(p, entry.score + Math.max(0, 10 - days));
    }
    return out;
  }

  getTopRecentFiles(n: number): string[] {
    const store = this.readFrecencyStore();
    const now = Date.now();
    return Object.entries(store)
<<<<<<< HEAD
      .map(([p, e]) => ({ path: p, score: e.score + Math.max(0, 10 - (now - e.lastUsed) / (1000 * 60 * 60 * 24)) }))
=======
      .map(([p, e]) => ({
        path: p,
        score: e.score + Math.max(0, 10 - (now - e.lastUsed) / (1000 * 60 * 60 * 24)),
      }))
>>>>>>> tools_improvement
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map((e) => e.path);
  }

  recordAccess(path: string): void {
    const store = this.readFrecencyStore();
    const now = Date.now();
    const prev = store[path];
    const days = prev ? (now - prev.lastUsed) / (1000 * 60 * 60 * 24) : Infinity;
    store[path] = { score: (prev?.score ?? 0) + 1 + Math.max(0, 10 - days), lastUsed: now };
    this.writeFrecencyStore(store);
  }

  private slugify(text: string): string {
<<<<<<< HEAD
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
=======
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
>>>>>>> tools_improvement
  }
}

// In-memory store for tests and decoupled components
export class InMemoryPersistenceStore implements PersistenceStore {
  private _history: HistoryEntry[] = [];
  private _convos: Map<string, SavedConversation> = new Map();
  private _frecency: Record<string, FrecencyEntry> = {};

  appendHistory(text: string): void {
    if (!text.trim()) return;
    if (this._history.length > 0 && this._history[0].text === text.trim()) return;
    this._history.unshift({ text: text.trim(), timestamp: Date.now() });
    if (this._history.length > 100) this._history = this._history.slice(0, 100);
  }

  loadHistory(): string[] {
    return this._history.map((e) => e.text);
  }

<<<<<<< HEAD
  saveConversation(messages: Message[], model: ActiveModel, firstUserMessage: string, title?: string, existingId?: string): string {
=======
  saveConversation(
    messages: Message[],
    model: ActiveModel,
    firstUserMessage: string,
    title?: string,
    existingId?: string,
  ): string {
>>>>>>> tools_improvement
    const timestamp = Date.now();
    const id = existingId ?? `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
    const title_ = (title ?? firstUserMessage ?? 'Untitled').slice(0, 60);
    const data: SavedConversation = { id, title: title_, date: timestamp, model, messages };
    this._convos.set(id, data);
    return id;
  }

  loadConversation(id: string): SavedConversation | null {
    return this._convos.get(id) ?? null;
  }

  listConversations(): ConversationMeta[] {
    return Array.from(this._convos.values())
<<<<<<< HEAD
      .map((d) => ({ id: d.id, title: d.title, date: d.date, model: `${d.model.provider}/${d.model.modelId}`, messageCount: d.messages.length }))
=======
      .map((d) => ({
        id: d.id,
        title: d.title,
        date: d.date,
        model: `${d.model.provider}/${d.model.modelId}`,
        messageCount: d.messages.length,
      }))
>>>>>>> tools_improvement
      .sort((a, b) => b.date - a.date);
  }

  deleteConversation(id: string): void {
    this._convos.delete(id);
  }

  renameConversation(id: string, title: string): boolean {
    const v = this._convos.get(id);
    if (!v) return false;
    v.title = title.slice(0, 60);
    this._convos.set(id, v);
    return true;
  }

  saveWorkspace(_path: string, _data: SavedWorkspace): void {
    // no-op in-memory
  }

  loadWorkspace(_path: string): SavedWorkspace | null {
    return null;
  }

<<<<<<< HEAD
  exportConversation(_messages: Message[], _model: ActiveModel, _tokensUsed: number, _cost: number, _path?: string): string {
=======
  exportConversation(
    _messages: Message[],
    _model: ActiveModel,
    _tokensUsed: number,
    _cost: number,
    _path?: string,
  ): string {
>>>>>>> tools_improvement
    return 'in-memory-export';
  }

  getFrecency(path: string): number {
    const e = this._frecency[path];
    if (!e) return 0;
    const daysSince = (Date.now() - e.lastUsed) / (1000 * 60 * 60 * 24);
    return e.score + Math.max(0, 10 - daysSince);
  }

  getBatchFrecency(paths: string[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const p of paths) out.set(p, this.getFrecency(p));
    return out;
  }

  getTopRecentFiles(n: number): string[] {
    return Object.entries(this._frecency)
      .map(([p, e]) => ({ path: p, score: e.score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map((e) => e.path);
  }

  recordAccess(path: string): void {
    const now = Date.now();
    const prev = this._frecency[path];
    const days = prev ? (now - prev.lastUsed) / (1000 * 60 * 60 * 24) : Infinity;
<<<<<<< HEAD
    this._frecency[path] = { score: (prev?.score ?? 0) + 1 + Math.max(0, 10 - days), lastUsed: now };
=======
    this._frecency[path] = {
      score: (prev?.score ?? 0) + 1 + Math.max(0, 10 - days),
      lastUsed: now,
    };
>>>>>>> tools_improvement
  }
}

// Default store instance (filesystem)
let _store: PersistenceStore = new FileSystemPersistenceStore();

export function setPersistenceStore(s: PersistenceStore) {
  _store = s;
}

export function getPersistenceStore(): PersistenceStore {
  return _store;
}

<<<<<<< HEAD
export function createInMemoryPersistenceStore(initial?: { history?: HistoryEntry[]; convos?: SavedConversation[]; frecency?: Record<string, FrecencyEntry> }) {
=======
export function createInMemoryPersistenceStore(initial?: {
  history?: HistoryEntry[];
  convos?: SavedConversation[];
  frecency?: Record<string, FrecencyEntry>;
}) {
>>>>>>> tools_improvement
  const s = new InMemoryPersistenceStore();
  if (initial?.history) s['_history'] = initial.history.slice();
  if (initial?.convos) for (const c of initial.convos) s['_convos'].set(c.id, c);
  if (initial?.frecency) s['_frecency'] = { ...initial.frecency };
  return s;
}
