import { homedir } from 'os';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { generateId } from './id.js';

const SESSIONS_DIR = () => join(homedir(), '.personal-cli', 'sessions');

export interface Session {
  sessionId: string;
  data: any;
}

export function saveSession(data: any): string {
  const sessionId = generateId();
  const dir = SESSIONS_DIR();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const session: Session = { sessionId, data };
  writeFileSync(join(dir, `${sessionId}.json`), JSON.stringify(session, null, 2));
  return sessionId;
}

export function loadSession(sessionId: string): Session | null {
  const path = join(SESSIONS_DIR(), `${sessionId}.json`);
  if (!existsSync(path)) return null;
  try {
    const content = require('fs').readFileSync(path, 'utf-8');
    return JSON.parse(content) as Session;
  } catch {
    return null;
  }
}

export function listSessions(): string[] {
  const dir = SESSIONS_DIR();
  if (!existsSync(dir)) return [];
  const files = require('fs').readdirSync(dir);
  return files
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => f.replace('.json', ''));
}
