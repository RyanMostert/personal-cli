export interface KeyCombo {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  key?: string;
  input?: string;
}

export interface Keybinding {
  id: string;
  combo: KeyCombo;
  action: string;
  description: string;
  category: 'global' | 'navigation' | 'editing' | 'panel';
}

export const DEFAULT_KEYBINDINGS: Keybinding[] = [
  // Global
  {
    id: 'exit',
    combo: { ctrl: true, input: 'c' },
    action: 'exit',
    description: 'Exit application',
    category: 'global',
  },
<<<<<<< HEAD
  { id: 'exit_eof', combo: { ctrl: true, input: 'd' }, action: 'exit', description: 'Exit (EOF)', category: 'global' },
=======
  {
    id: 'exit_eof',
    combo: { ctrl: true, input: 'd' },
    action: 'exit',
    description: 'Exit (EOF)',
    category: 'global',
  },
>>>>>>> tools_improvement
  {
    id: 'model_picker',
    combo: { ctrl: true, input: 'm' },
    action: 'model_picker',
    description: 'Open model picker',
    category: 'global',
  },
  {
    id: 'file_explorer',
    combo: { ctrl: true, input: 'o' },
    action: 'file_explorer',
    description: 'Open project file explorer',
    category: 'global',
  },
  {
    id: 'provider_manager',
    combo: { ctrl: true, input: 'p' },
    action: 'provider_manager',
    description: 'Open provider manager',
    category: 'global',
  },
  {
    id: 'history_picker',
    combo: { ctrl: true, input: 'h' },
    action: 'history_picker',
    description: 'Open conversation history',
    category: 'global',
  },
  {
    id: 'keybind_manager',
    combo: { ctrl: true, input: 'k' },
    action: 'keybind_manager',
    description: 'Open keybinding manager',
    category: 'global',
  },
  {
    id: 'help_overlay',
    combo: { input: '?' },
    action: 'help_overlay',
    description: 'Show quick help overlay',
    category: 'global',
  },

  // Navigation / Focus
  {
    id: 'toggle_focus',
    combo: { ctrl: true, input: 'l' },
    action: 'toggle_focus',
    description: 'Toggle focus between input and panel',
    category: 'navigation',
  },
  {
    id: 'tool_focus',
    combo: { ctrl: true, input: 't' },
    action: 'tool_focus',
    description: 'Cycle focus through tool calls',
    category: 'navigation',
  },
  {
    id: 'cycle_mode',
    combo: { ctrl: true, key: 'tab' },
    action: 'cycle_mode',
    description: 'Cycle agent mode (ask/plan/build)',
    category: 'navigation',
  },

  // Panels
  {
    id: 'close_overlay',
    combo: { key: 'escape' },
    action: 'close_overlay',
    description: 'Close current overlay or panel',
    category: 'panel',
  },
  {
    id: 'scroll_up',
    combo: { key: 'upArrow' },
    action: 'scroll_up',
    description: 'Scroll up / Previous item',
    category: 'panel',
  },
  {
    id: 'scroll_down',
    combo: { key: 'downArrow' },
    action: 'scroll_down',
    description: 'Scroll down / Next item',
    category: 'panel',
  },

  // Editing
  {
    id: 'clear_input',
    combo: { ctrl: true, input: 'u' },
    action: 'clear_input',
    description: 'Clear input line',
    category: 'editing',
  },
  {
    id: 'delete_word',
    combo: { ctrl: true, input: 'w' },
    action: 'delete_word',
    description: 'Delete last word',
    category: 'editing',
  },
  {
    id: 'newline',
    combo: { shift: true, key: 'return' },
    action: 'newline',
    description: 'Insert newline',
    category: 'editing',
  },
  {
    id: 'history_prev',
    combo: { key: 'upArrow' },
    action: 'history_prev',
    description: 'Previous input history',
    category: 'editing',
  },
  {
    id: 'history_next',
    combo: { key: 'downArrow' },
    action: 'history_next',
    description: 'Next input history',
    category: 'editing',
  },
];

export function formatKeyCombo(combo: KeyCombo): string {
  const parts: string[] = [];
  if (combo.ctrl) parts.push('Ctrl');
  if (combo.meta) parts.push('Meta');
  if (combo.shift) parts.push('Shift');
  if (combo.key) parts.push(combo.key.toUpperCase());
  if (combo.input) parts.push(combo.input.toUpperCase());
  return parts.join('+');
}

export function matchKeybinding(
  input: string,
  key: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    return?: boolean;
    escape?: boolean;
    upArrow?: boolean;
    downArrow?: boolean;
    pageUp?: boolean;
    pageDown?: boolean;
    tab?: boolean;
  },
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
        tab: key.tab,
      };
      if (!keyMap[combo.key]) continue;
    }
    return binding.action;
  }
  return null;
}
