export interface FallbackStrategy {
  name: string;
  description: string;
  attempt: (
    toolName: string,
    args: Record<string, unknown>,
    originalResult: unknown,
  ) => Promise<FallbackResult | null>;
}

export interface FallbackResult {
  success: boolean;
  output: string;
  source: string;
  attempts: FallbackAttempt[];
}

export interface FallbackAttempt {
  strategy: string;
  success: boolean;
  duration: number;
  error?: string;
}

export interface FallbackConfig {
  enabled: boolean;
  maxRetries: number;
  strategies: string[];
  autoSynthesize: boolean;
}

export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  enabled: true,
  maxRetries: 3,
  strategies: ['docs_site', 'llm_synthesis', 'code_search'],
  autoSynthesize: true,
};
