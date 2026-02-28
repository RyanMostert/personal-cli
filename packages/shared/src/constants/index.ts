export const APP_NAME = 'personal-cli';
export const APP_VERSION = '0.1.0';

export const DEFAULT_PROVIDER = 'opencode-zen' as const;
export const DEFAULT_MODEL = 'kimi-k2.5-free' as const;

export const DEFAULT_MAX_TOKENS = 200_000;
export const DEFAULT_TOKEN_BUDGET = 100_000;
export const DEFAULT_MAX_ITERATIONS = 10;
export const TOOL_OUTPUT_MAX_CHARS = 2_000;

export const CONFIG_DIR = '.personal-cli';
export const CONFIG_PROVIDERS_FILE = 'providers.yaml';
export const CONFIG_PERMISSIONS_FILE = 'permissions.yaml';

export const PROJECT_CONTEXT_DIR = '.ai';
export const PROJECT_CONTEXT_FILE = 'CONTEXT.md';

export const COLORS = {
  brand: '#58A6FF',
  success: '#3FB950',
  warning: '#D29922',
  error: '#F85149',
  muted: '#484F58',
  toolBg: '#161B22',
  codeBg: '#1C2128',
} as const;
