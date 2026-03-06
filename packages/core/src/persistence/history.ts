import { getPersistenceStore } from './store.js';

export function appendHistory(text: string): void {
  return getPersistenceStore().appendHistory(text);
}

export function loadHistory(): string[] {
  return getPersistenceStore().loadHistory();
}
