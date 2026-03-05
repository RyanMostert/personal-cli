import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';

const HISTORY_FILE = join(homedir(), '.personal-cli', 'prompt-history.jsonl');
const MAX_ENTRIES = 100;

interface HistoryEntry {
  text: string;
  timestamp: number;
}

export function appendHistory(text: string): void {
  if (!text.trim()) return;

  try {
    // Check if identical to last entry
    const history = loadHistory();
    if (history.length > 0 && history[0] === text.trim()) {
      return; // Skip duplicate
    }

    const entry: HistoryEntry = {
      text: text.trim(),
      timestamp: Date.now(),
    };

    appendFileSync(HISTORY_FILE, JSON.stringify(entry) + '\n', { mode: 0o600 });

    // Trim if too large
    const lines = readFileSync(HISTORY_FILE, 'utf-8').trim().split('\n');
    if (lines.length > MAX_ENTRIES) {
      const trimmed = lines.slice(-MAX_ENTRIES);
      writeFileSync(HISTORY_FILE, trimmed.join('\n') + '\n', { mode: 0o600 });
    }
  } catch {
    // Ignore errors
  }
}

export function loadHistory(): string[] {
  try {
    if (!existsSync(HISTORY_FILE)) {
      return [];
    }

    const data = readFileSync(HISTORY_FILE, 'utf-8').trim();
    if (!data) return [];

    const lines = data.split('\n');
    const entries: HistoryEntry[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as HistoryEntry;
        if (entry.text) {
          entries.push(entry);
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Return most recent first
    return entries.sort((a, b) => b.timestamp - a.timestamp).map((e) => e.text);
  } catch {
    return [];
  }
}
