import { useCallback } from 'react';
import { promises as fs } from 'fs';
import { recordAccess } from '@personal-cli/core';

export interface SidePanelState {
  type: 'file' | 'diff' | 'thoughts' | 'patches';
  path?: string;
  content?: string;
  oldText?: string;
  newText?: string;
  thought?: string;
}

export interface UseSidePanelResult {
  openFileInPanel: (fp: string) => Promise<void>;
  handleSaveFile: (path: string, content: string) => Promise<void>;
  handleExplainChange: () => Promise<void>;
}

export function useSidePanel(
  setSidePanel: React.Dispatch<React.SetStateAction<SidePanelState | null>>,
  addSystemMessage: (msg: string) => void,
  synthesizeAnswer: (topic: string) => Promise<string>,
  pendingPermission: { toolName: string; args?: Record<string, unknown> } | null,
): UseSidePanelResult {
  const openFileInPanel = useCallback(
    async (fp: string) => {
      try {
        const content = await fs.readFile(fp, 'utf-8');
        recordAccess(fp);
        setSidePanel({ type: 'file', path: fp, content });
      } catch {
        addSystemMessage(`Error: could not open ${fp}`);
      }
    },
    [addSystemMessage, setSidePanel],
  );

  const handleSaveFile = useCallback(
    async (path: string, content: string) => {
      try {
        await fs.writeFile(path, content, 'utf-8');
        addSystemMessage(`✓ Saved changes to ${path}`);
        setSidePanel((prev) => (prev && prev.path === path ? { ...prev, content } : prev));
      } catch (err) {
        addSystemMessage(
          `✗ Failed to save ${path}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [addSystemMessage, setSidePanel],
  );

  const handleExplainChange = useCallback(async () => {
    if (!pendingPermission) return;
    const { toolName, args } = pendingPermission;
    if (toolName !== 'edit_file' && toolName !== 'patch') return;

    setSidePanel({ type: 'thoughts', thought: 'Analysing proposed changes...' });

    const diffText =
      toolName === 'edit_file'
        ? `File: ${args?.path}\nSearch: ${args?.search}\nReplace: ${args?.replace}`
        : `Patch: ${args?.patch}`;

    try {
      const topic = `Explain what these code changes do in plain English. Focus on the impact and intent:\n\n${diffText}`;
      const explanation = await synthesizeAnswer(topic);
      setSidePanel({ type: 'thoughts', thought: explanation });
    } catch {
      setSidePanel({ type: 'thoughts', thought: 'Error generating explanation.' });
    }
  }, [pendingPermission, synthesizeAnswer, setSidePanel]);

  return {
    openFileInPanel,
    handleSaveFile,
    handleExplainChange,
  };
}
