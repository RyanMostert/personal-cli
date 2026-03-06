import { getPersistenceStore } from './store.js';

export function getFrecency(path: string): number {
  return getPersistenceStore().getFrecency(path);
}

export function getBatchFrecency(paths: string[]): Map<string, number> {
  return getPersistenceStore().getBatchFrecency(paths);
}

export function getTopRecentFiles(n: number): string[] {
  return getPersistenceStore().getTopRecentFiles(n);
}

export function recordAccess(path: string): void {
  return getPersistenceStore().recordAccess(path);
}
