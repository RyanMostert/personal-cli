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

export function saveConversation(messages: Message[], model: ActiveModel, title?: string): string {
  ensureDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const firstUserMsg = messages.find(m => m.role === 'user');
  const title_ = (title ?? firstUserMsg?.content ?? 'Untitled').slice(0, 60);
  const data: SavedConversation = { id, title: title_, date: Date.now(), model, messages };
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

export function renameConversation(id: string, title: string): boolean {
  const p = join(HISTORY_DIR(), `${id}.json`);
  if (!existsSync(p)) return false;
  try {
    const data: SavedConversation = JSON.parse(readFileSync(p, 'utf-8'));
    data.title = title.slice(0, 60);
    writeFileSync(p, JSON.stringify(data, null, 2));
    return true;
  } catch { return false; }
}

export function exportConversation(
  messages: Message[],
  model: ActiveModel,
  tokensUsed: number,
  cost: number,
  path?: string
): string {
  const date = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toLocaleTimeString();
  const filePath = path ?? join(homedir(), `conversation-${date}-${Date.now()}.md`);

  const content = [`# Conversation Export — ${date}`,
    '',
    `**Model:** ${model.provider} / ${model.modelId}`,
    `**Messages:** ${messages.length}`,
    `**Tokens:** ${tokensUsed.toLocaleString()}`,
    `**Cost:** $${cost.toFixed(4)}`,
    '',
    '---',
    '',
    ...messages.map(m => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      const role = m.role.charAt(0).toUpperCase() + m.role.slice(1);
      return `**${role}** · ${time}\n\n${m.content}\n`;
    }),
  ].join('\n');

  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}
