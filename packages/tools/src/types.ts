export type PermissionAction = 'allow' | 'deny' | 'ask';

export interface PermissionRule {
  tool: string; // e.g. 'writeFile', 'runCommand', '*'
  pattern?: string; // glob pattern on the path/command arg (optional)
  action: PermissionAction;
}

// Built-in default rules applied before user callback
export const DEFAULT_PERMISSION_RULES: PermissionRule[] = [
  // Protect .env files — ask before reading, deny writes
  { tool: 'readFile', pattern: '*.env', action: 'ask' },
  { tool: 'readFile', pattern: '*.env.*', action: 'ask' },
  { tool: 'writeFile', pattern: '*.env', action: 'deny' },
  { tool: 'writeFile', pattern: '*.env.*', action: 'deny' },
  { tool: 'editFile', pattern: '*.env', action: 'deny' },
  { tool: 'editFile', pattern: '*.env.*', action: 'deny' },
];

// Mode-specific rule sets — these are MERGED on top of defaults
export const MODE_RULES: Record<string, PermissionRule[]> = {
  ask: [
    // Propose edits: ask before write/execute tools (Gemini CLI style)
    { tool: 'writeFile', action: 'ask' },
    { tool: 'editFile', action: 'ask' },
    { tool: 'patch', action: 'ask' },
    { tool: 'runCommand', action: 'deny' },
    { tool: 'gitCommit', action: 'deny' },
  ],
  plan: [
    // Ask before every write/execute — user approves each step
    { tool: 'writeFile', action: 'ask' },
    { tool: 'editFile', action: 'ask' },
    { tool: 'runCommand', action: 'ask' },
    { tool: 'gitCommit', action: 'ask' },
    { tool: 'patch', action: 'ask' },
  ],
  auto: [
    // Everything allowed without asking (user opted in)
    { tool: '*', action: 'allow' },
  ],
  build: [
    // Dangerous operations ask, everything else allowed
    { tool: 'runCommand', action: 'ask' },
    { tool: 'gitCommit', action: 'ask' },
  ],
};

export type PermissionCallback = (toolName: string, args: Record<string, unknown>) => Promise<boolean>;

/** Called after a successful file write with the absolute path and before/after content. */
export type WriteCallback = (path: string, before: string | null, after: string) => void;

/** Called when the question tool needs the user to answer something mid-task. */
export type QuestionCallback = (header: string, options: string[]) => Promise<string>;

export interface ToolResult {
  output?: string;
  error?: string;
}

export type ToolCategory = 'file' | 'search' | 'git' | 'web' | 'system' | 'utility' | 'custom';

export interface ToolSchema {
  name: string;
  description: string;
  args?: Record<string, ToolArgSchema>;
  category: ToolCategory;
  example?: string;
  docstring?: string;
}

export interface ToolArgSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
}

export interface PluginManifest {
  name: string;
  version?: string;
  description?: string;
  tools: ToolSchema[];
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  module: unknown;
  tools: Record<string, unknown>;
}
