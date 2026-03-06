import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const PREFS_FILE = join(homedir(), '.personal-cli', 'prefs.json');

interface Prefs {
  theme?: string;
  recentModels?: Array<{ provider: string; modelId: string }>;
  telemetryEnabled?: boolean;
}

function readPrefs(): Prefs {
  try {
    if (existsSync(PREFS_FILE)) {
      return JSON.parse(readFileSync(PREFS_FILE, 'utf-8')) as Prefs;
    }
  } catch (err) {
    // Ignore errors
  }
  return {};
}

function writePrefs(prefs: Prefs): void {
  try {
    writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2), { mode: 0o600 });
  } catch (err) {
    // Ignore errors
  }
}

export function getTelemetryEnabled(): boolean {
  return readPrefs().telemetryEnabled ?? false;
}

export function setTelemetryEnabled(enabled: boolean): void {
  const prefs = readPrefs();
  prefs.telemetryEnabled = enabled;
  writePrefs(prefs);
}

export function getTheme(): string {
  return readPrefs().theme ?? 'default';
}

export function setTheme(name: string): void {
  const prefs = readPrefs();
  prefs.theme = name;
  writePrefs(prefs);
}

export function getRecentModels(): Array<{ provider: string; modelId: string }> {
  return readPrefs().recentModels ?? [];
}

export function addRecentModel(provider: string, modelId: string): void {
  const prefs = readPrefs();
  if (!prefs.recentModels) prefs.recentModels = [];

  // Remove if already exists
  prefs.recentModels = prefs.recentModels.filter((m) => !(m.provider === provider && m.modelId === modelId));

  // Add to front
  prefs.recentModels.unshift({ provider, modelId });

  // Keep only last 5
  if (prefs.recentModels.length > 5) {
    prefs.recentModels = prefs.recentModels.slice(0, 5);
  }

  writePrefs(prefs);
}
