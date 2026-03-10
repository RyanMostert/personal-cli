export type { ConversationMeta, SavedConversation, SavedWorkspace } from './store.js';
import { getPersistenceStore } from './store.js';

export function saveConversation(
  messages: import('@personal-cli/shared').Message[],
  model: import('@personal-cli/shared').ActiveModel,
  firstUserMessage: string,
  title?: string,
  existingId?: string,
): string {
<<<<<<< HEAD
  return getPersistenceStore().saveConversation(messages, model, firstUserMessage, title, existingId);
=======
  return getPersistenceStore().saveConversation(
    messages,
    model,
    firstUserMessage,
    title,
    existingId,
  );
>>>>>>> tools_improvement
}

export function loadConversation(id: string) {
  return getPersistenceStore().loadConversation(id);
}

export function listConversations() {
  return getPersistenceStore().listConversations();
}

export function deleteConversation(id: string): void {
  return getPersistenceStore().deleteConversation(id);
}

export function renameConversation(id: string, title: string): boolean {
  return getPersistenceStore().renameConversation(id, title);
}

export function saveWorkspace(path: string, data: any): void {
  return getPersistenceStore().saveWorkspace(path, data);
}

export function loadWorkspace(path: string) {
  return getPersistenceStore().loadWorkspace(path);
}

<<<<<<< HEAD
export function exportConversation(messages: any[], model: any, tokensUsed: number, cost: number, path?: string): string {
=======
export function exportConversation(
  messages: any[],
  model: any,
  tokensUsed: number,
  cost: number,
  path?: string,
): string {
>>>>>>> tools_improvement
  return getPersistenceStore().exportConversation(messages, model, tokensUsed, cost, path);
}
