export type PermissionAction = 'allow' | 'deny' | 'ask';

export interface PermissionRule {
  tool: string;           // e.g. 'writeFile', 'runCommand', '*'
  pattern?: string;       // glob pattern on the path/command arg (optional)
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
    // Read-only: deny all write/execute tools
    { tool: 'writeFile', action: 'deny' },
    { tool: 'editFile', action: 'deny' },
    { tool: 'runCommand', action: 'deny' },
    { tool: 'gitCommit', action: 'deny' },
  ],
  plan: [
    // Same as ask — read-only
    { tool: 'writeFile', action: 'deny' },
    { tool: 'editFile', action: 'deny' },
    { tool: 'runCommand', action: 'deny' },
    { tool: 'gitCommit', action: 'deny' },
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

export type PermissionCallback = (
  toolName: string,
  args: Record<string, unknown>,
) => Promise<boolean>;

export interface ToolResult {
  output?: string;
  error?: string;
}
