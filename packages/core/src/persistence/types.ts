import type { Message, ActiveModel, Attachment } from '@personal-cli/shared';

export interface ConversationMeta {
  id: string;
  title: string;
  date: number;
  model: string;
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
  attachments: Attachment[];
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

export type { HistoryEntry, FrecencyEntry };
