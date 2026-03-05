import React from 'react';
import { Box, Text } from 'ink';
import { MODEL_REGISTRY, type ModelEntry, type ProviderName } from '@personal-cli/shared';

interface Props {
  currentProvider: string;
  currentModelId: string;
  currentCost: number;
  onSelect?: (provider: ProviderName, modelId: string) => void;
}

// Get average cost per 1M tokens
function getAvgCost(m: ModelEntry): number {
  if (m.free) return 0;
  if (m.inputCostPer1M == null || m.outputCostPer1M == null) return 10;
  return (m.inputCostPer1M + m.outputCostPer1M) / 2;
}

// Find cheaper alternatives with similar capabilities
function findCheaperAlternatives(current: ModelEntry, limit: number = 3): ModelEntry[] {
  const currentCost = getAvgCost(current);
  const currentTags = new Set(current.tags || []);

  return MODEL_REGISTRY.filter((m) => {
    if (m.provider === current.provider && m.id === current.id) return false;
    if (getAvgCost(m) >= currentCost) return false;

    // Match by tags (prioritize same capability tags)
    const mTags = new Set(m.tags || []);
    const hasMatchingTag = Array.from(currentTags).some((tag) => mTags.has(tag));

    // Prioritize: same tags + similar context window
    return hasMatchingTag || m.contextWindow >= current.contextWindow * 0.5;
  })
    .sort((a, b) => getAvgCost(a) - getAvgCost(b))
    .slice(0, limit);
}

export function CostRecommendation({ currentProvider, currentModelId, currentCost, onSelect }: Props) {
  const current = MODEL_REGISTRY.find((m) => m.provider === currentProvider && m.id === currentModelId);

  if (!current) return null;

  const currentAvgCost = getAvgCost(current);
  const alternatives = findCheaperAlternatives(current);

  if (alternatives.length === 0) return null;

  const savings = alternatives.map((alt) => ({
    model: alt,
    savings: ((1 - getAvgCost(alt) / currentAvgCost) * 100).toFixed(0),
  }));

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="#FFB86C" paddingX={1} marginY={1}>
      <Box marginBottom={1}>
        <Text color="#FFB86C" bold>
          ⚡ COST-SAVING TIPS
        </Text>
      </Box>

      <Text color="#8C959F" dimColor>
        You are using {currentProvider}/{currentModelId} (${currentAvgCost.toFixed(2)}/1M tokens)
      </Text>

      <Box marginTop={1}>
        <Text color="#3FB950">Consider these cheaper alternatives:</Text>
      </Box>

      {savings.map(({ model, savings }) => (
        <Box key={`${model.provider}-${model.id}`} marginTop={1} paddingLeft={2}>
          <Text color="#00E5FF">• </Text>
          <Text color="white">
            {model.provider}/{model.id}
          </Text>
          <Text color="#8C959F"> - </Text>
          <Text color="#3FB950" bold>
            {savings}% cheaper
          </Text>
          {model.free && <Text color="#3FB950"> (FREE)</Text>}
          {onSelect && <Text color="#484F58"> [press number to switch]</Text>}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color="#484F58" dimColor>
          Type /model and filter with #cheap or press $ for cost-saving mode
        </Text>
      </Box>
    </Box>
  );
}

// Hook to determine if cost recommendations should be shown
export function shouldShowRecommendation(cost: number, costBudget: number): boolean {
  return cost > costBudget * 0.5; // Show when >50% of budget used
}
