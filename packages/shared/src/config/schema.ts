import { z } from 'zod';

// ─── Model ────────────────────────────────────────────────────────────────────

export const ModelConfigSchema = z.object({
  id: z.string(),
  maxTokens: z.number().optional(),
  costPer1kInput: z.number().optional(),
  costPer1kOutput: z.number().optional(),
});

// ─── Providers ────────────────────────────────────────────────────────────────

export const ProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  models: z.array(ModelConfigSchema),
});

const ProviderNameSchema = z.enum([
  'anthropic',
  'openai',
  'google',
  'mistral',
  'ollama',
  'opencode-zen',
  'custom',
]);

export const ProvidersConfigSchema = z.object({
  providers: z.record(ProviderNameSchema, ProviderConfigSchema).optional().default({}),
  defaults: z.object({
    provider: ProviderNameSchema,
    model: z.string(),
    fallback: z
      .object({
        provider: ProviderNameSchema,
        model: z.string(),
      })
      .optional(),
  }),
});

// ─── Permissions ──────────────────────────────────────────────────────────────

const PolicySchema = z.enum(['auto-allow', 'ask', 'deny']);

const ToolPermissionSchema = z.union([
  PolicySchema,
  z.object({
    default: PolicySchema,
    autoAllow: z.array(z.object({ pattern: z.string() })).optional(),
    deny: z.array(z.object({ pattern: z.string() })).optional(),
  }),
]);

export const PermissionsConfigSchema = z.record(z.string(), ToolPermissionSchema);

// ─── Agent ────────────────────────────────────────────────────────────────────

export const AgentConfigSchema = z.object({
  mode: z.enum(['ask', 'auto', 'plan', 'build']).default('ask'),
  maxIterations: z.number().min(1).max(50).default(10),
  tokenBudget: z.number().positive().default(100_000),
  systemPrompt: z.string().optional(),
});

// ─── App Config (merged) ──────────────────────────────────────────────────────

export const AppConfigSchema = z.object({
  providers: ProvidersConfigSchema.optional(),
  permissions: PermissionsConfigSchema.optional(),
  agent: AgentConfigSchema.optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;
export type PermissionsConfig = z.infer<typeof PermissionsConfigSchema>;
export type AgentConfigInput = z.infer<typeof AgentConfigSchema>;
