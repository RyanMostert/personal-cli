import type { ProviderName } from '../types/index.js';

export type ModelTag = 'reasoning' | 'coding' | 'vision' | 'fast' | 'large';

export interface ModelEntry {
  provider: ProviderName;
  id: string;
  label: string;
  contextWindow: number;
  inputCostPer1M: number | null;
  outputCostPer1M: number | null;
  free: boolean;
  tags?: ModelTag[];
}
