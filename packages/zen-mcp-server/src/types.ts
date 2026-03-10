import { z } from 'zod';

export const ZenModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  description: z.string().optional(),
  maxTokens: z.number().optional(),
  capabilities: z.array(z.string()).optional(),
});

export const ZenGatewayConfigSchema = z.object({
  endpoint: z.string().url().default('https://opencode.ai/zen/v1'),
  apiKey: z.string(),
  enabled: z.boolean().default(true),
});

export const ZenGatewayStatusSchema = z.object({
  connected: z.boolean(),
  endpoint: z.string(),
  modelsAvailable: z.number(),
  lastError: z.string().optional(),
});

export type ZenModel = z.infer<typeof ZenModelSchema>;
export type ZenGatewayConfig = z.infer<typeof ZenGatewayConfigSchema>;
export type ZenGatewayStatus = z.infer<typeof ZenGatewayStatusSchema>;
