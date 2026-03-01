import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const FRECENCY_FILE = join(homedir(), '.personal-cli', 'file-frecency.json');
const FRECENCY_DIR  = join(homedir(), '.personal-cli');

interface FrecencyEntry {
  score: number;
  lastUsed: number;
}

type FrecencyStore = Record<string, FrecencyEntry>;

const MAX_ENTRIES = 500;

// In-memory cache — reads the file at most once per process lifetime.
// Invalidated on write so scores stay consistent.
let _cache: FrecencyStore | null = null;

function readStore(): FrecencyStore {
  if (_cache !== null) return _cache;
  try {
    if (existsSync(FRECENCY_FILE)) {
      _cache = JSON.parse(readFileSync(FRECENCY_FILE, 'utf-8')) as FrecencyStore;
      return _cache;
    }
  } catch {
    // Corrupt file — start fresh
  }
  _cache = {};
  return _cache;
}

function writeStore(store: FrecencyStore): void {
  try {
    const entries = Object.entries(store);
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => b[1].score - a[1].score);
      store = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
    }
    mkdirSync(FRECENCY_DIR, { recursive: true });
    writeFileSync(FRECENCY_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
    _cache = store; // keep cache in sync after write
  } catch {
    // Ignore write errors
  }
}

export function getFrecency(path: string): number {
  const store = readStore(); // hits cache after first call
  const entry = store[path];
  if (!entry) return 0;
  const daysSinceAccess = (Date.now() - entry.lastUsed) / (1000 * 60 * 60 * 24);
  return entry.score + Math.max(0, 10 - daysSinceAccess);
}

/** Score multiple paths in one call using the already-loaded in-memory store. */
export function getBatchFrecency(paths: string[]): Map<string, number> {
  const store = readStore();
  const now = Date.now();
  const out = new Map<string, number>();
  for (const p of paths) {
    const entry = store[p];
    if (!entry) { out.set(p, 0); continue; }
    const days = (now - entry.lastUsed) / (1000 * 60 * 60 * 24);
    out.set(p, entry.score + Math.max(0, 10 - days));
  }
  return out;
}

/** Return the top N most frecent paths from the store (used for empty-query suggestions). */
export function getTopRecentFiles(n: number): string[] {
  const store = readStore();
  const now = Date.now();
  return Object.entries(store)
    .map(([path, entry]) => {
      const days = (now - entry.lastUsed) / (1000 * 60 * 60 * 24);
      return { path, score: entry.score + Math.max(0, 10 - days) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(e => e.path);
}

export function recordAccess(path: string): void {
  const store = readStore();
  const now = Date.now();
  const prev = store[path];
  const days = prev ? (now - prev.lastUsed) / (1000 * 60 * 60 * 24) : Infinity;
  store[path] = {
    score: (prev?.score ?? 0) + 1 + Math.max(0, 10 - days),
    lastUsed: now,
  };
  writeStore(store);
}
