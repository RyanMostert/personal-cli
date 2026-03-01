export interface Theme {
  name: string;
  // UI colors
  primary: string;    // blue accent (borders, selected)
  success: string;    // green (free models, ok)
  warning: string;    // yellow (streaming indicator)
  error: string;      // red (errors)
  muted: string;      // dim text, metadata
  text: string;       // main text
  dim: string;        // very dim (scrollback hints)
  // Role colors
  userLabel: string;
  assistantLabel: string;
  systemLabel: string;
  // Tool call colors
  toolBorder: string;
  toolName: string;
}

export const THEMES: Record<string, Theme> = {
  default: {
    name: 'Default (Dark)',
    primary: '#58A6FF', success: '#3FB950', warning: '#D29922',
    error: '#F85149', muted: '#8C959F', text: '#C9D1D9', dim: '#484F58',
    userLabel: '#58A6FF', assistantLabel: '#3FB950', systemLabel: '#8C959F',
    toolBorder: '#30363D', toolName: '#79C0FF',
  },
  dracula: {
    name: 'Dracula',
    primary: '#BD93F9', success: '#50FA7B', warning: '#F1FA8C',
    error: '#FF5555', muted: '#6272A4', text: '#F8F8F2', dim: '#44475A',
    userLabel: '#BD93F9', assistantLabel: '#50FA7B', systemLabel: '#6272A4',
    toolBorder: '#44475A', toolName: '#8BE9FD',
  },
  'tokyo-night': {
    name: 'Tokyo Night',
    primary: '#7AA2F7', success: '#9ECE6A', warning: '#E0AF68',
    error: '#F7768E', muted: '#565F89', text: '#A9B1D6', dim: '#3B4261',
    userLabel: '#7AA2F7', assistantLabel: '#9ECE6A', systemLabel: '#565F89',
    toolBorder: '#292E42', toolName: '#2AC3DE',
  },
  nord: {
    name: 'Nord',
    primary: '#81A1C1', success: '#A3BE8C', warning: '#EBCB8B',
    error: '#BF616A', muted: '#616E88', text: '#D8DEE9', dim: '#434C5E',
    userLabel: '#81A1C1', assistantLabel: '#A3BE8C', systemLabel: '#616E88',
    toolBorder: '#3B4252', toolName: '#88C0D0',
  },
  gruvbox: {
    name: 'Gruvbox Dark',
    primary: '#83A598', success: '#B8BB26', warning: '#FABD2F',
    error: '#FB4934', muted: '#928374', text: '#EBDBB2', dim: '#504945',
    userLabel: '#83A598', assistantLabel: '#B8BB26', systemLabel: '#928374',
    toolBorder: '#3C3836', toolName: '#8EC07C',
  },
};

export type ThemeName = keyof typeof THEMES;
