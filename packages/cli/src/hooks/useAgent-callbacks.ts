import type { PendingPermission, PendingQuestion } from './useAgent-types.js';

export type PermissionCallback = (
  toolName: string,
  args?: Record<string, unknown>,
) => Promise<boolean>;

export type QuestionCallback = (question: string) => Promise<string>;

export function createPermissionCallback(
  setState: React.Dispatch<React.SetStateAction<unknown>>,
): PermissionCallback {
  return (toolName: string, args?: Record<string, unknown>) => {
    return new Promise<boolean>((resolve) => {
      setState((prev: unknown) => {
        const state = prev as { pendingPermission: PendingPermission | null };
        return {
          ...state,
          pendingPermission: {
            toolName,
            args,
            resolve: (allow: boolean) => {
              setState((p: unknown) => {
                const s = p as { pendingPermission: PendingPermission | null };
                return { ...s, pendingPermission: null };
              });
              resolve(allow);
            },
          },
        };
      });
    });
  };
}

export function createQuestionCallback(
  setState: React.Dispatch<React.SetStateAction<unknown>>,
): QuestionCallback {
  return (question: string) => {
    return new Promise<string>((resolve) => {
      setState((prev: unknown) => {
        const state = prev as { pendingQuestion: PendingQuestion | null };
        return {
          ...state,
          pendingQuestion: {
            question,
            resolve: (answer: string) => {
              setState((p: unknown) => {
                const s = p as { pendingQuestion: PendingQuestion | null };
                return { ...s, pendingQuestion: null };
              });
              resolve(answer);
            },
          },
        };
      });
    });
  };
}
