export interface KeyCombo {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  key?: string;
  input?: string;
}

export interface Keybinding {
  combo: KeyCombo;
  action: string;
  description: string;
}

export const DEFAULT_KEYBINDINGS: Keybinding[] = [
  { combo: { ctrl: true, input: 'c' }, action: 'exit', description: 'Exit' },
  { combo: { ctrl: true, input: 'd' }, action: 'exit', description: 'Exit (EOF)' },
  { combo: { ctrl: true, input: 'm' }, action: 'model_picker', description: 'Open model picker' },
  { combo: { ctrl: true, input: 'u' }, action: 'clear_input', description: 'Clear input' },
  { combo: { ctrl: true, input: 'w' }, action: 'delete_word', description: 'Delete last word' },
  { combo: { key: 'pageUp' }, action: 'scroll_up', description: 'Scroll up' },
  { combo: { key: 'pageDown' }, action: 'scroll_down', description: 'Scroll down' },
  { combo: { key: 'escape' }, action: 'close_overlay', description: 'Close overlay/panel' },
  { combo: { shift: true, key: 'return' }, action: 'newline', description: 'Insert newline' },
  { combo: { key: 'upArrow' }, action: 'history_prev', description: 'Previous input history' },
  { combo: { key: 'downArrow' }, action: 'history_next', description: 'Next input history' },
];

export function matchKeybinding(
  input: string,
  key: { ctrl?: boolean; meta?: boolean; shift?: boolean; return?: boolean; escape?: boolean;
         upArrow?: boolean; downArrow?: boolean; pageUp?: boolean; pageDown?: boolean; },
  bindings: Keybinding[] = DEFAULT_KEYBINDINGS,
): string | null {
  for (const binding of bindings) {
    const { combo } = binding;
    if (combo.ctrl !== undefined && !!combo.ctrl !== !!key.ctrl) continue;
    if (combo.meta !== undefined && !!combo.meta !== !!key.meta) continue;
    if (combo.shift !== undefined && !!combo.shift !== !!key.shift) continue;
    if (combo.input !== undefined && combo.input !== input) continue;
    if (combo.key) {
      const keyMap: Record<string, boolean | undefined> = {
        return: key.return,
        escape: key.escape,
        upArrow: key.upArrow,
        downArrow: key.downArrow,
        pageUp: key.pageUp,
        pageDown: key.pageDown,
      };
      if (!keyMap[combo.key]) continue;
    }
    return binding.action;
  }
  return null;
}
