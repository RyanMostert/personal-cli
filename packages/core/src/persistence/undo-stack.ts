import { writeFileSync, unlinkSync } from 'fs';

export interface UndoEntry {
  path: string; // absolute path
  before: string | null; // file contents before the change (null = file was created)
  after: string; // file contents after the change
}

export class UndoStack {
  private past: UndoEntry[] = [];
  private future: UndoEntry[] = [];

  push(entry: UndoEntry): void {
    this.past.push(entry);
    this.future = []; // new change wipes redo history
  }

  undo(): { path: string; restored: string | null } | null {
    const entry = this.past.pop();
    if (!entry) return null;
    this.future.push(entry);
    if (entry.before === null) {
      // File was created in the change — remove it to undo
      try {
        unlinkSync(entry.path);
      } catch {}
    } else {
      writeFileSync(entry.path, entry.before, 'utf-8');
    }
    return { path: entry.path, restored: entry.before };
  }

  redo(): { path: string; restored: string } | null {
    const entry = this.future.pop();
    if (!entry) return null;
    this.past.push(entry);
    writeFileSync(entry.path, entry.after, 'utf-8');
    return { path: entry.path, restored: entry.after };
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }
  canRedo(): boolean {
    return this.future.length > 0;
  }
}
