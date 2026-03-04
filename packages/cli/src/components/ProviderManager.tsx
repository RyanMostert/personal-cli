import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

interface ProviderEntry {
  id: string;
  label: string;
  description: string;
  color: string;
  tags: string[];
  oauthFlow?: boolean;
}

const PROVIDERS: ProviderEntry[] = [
  {
    id: 'opencode-zen',
    label: 'OpenCode Zen',
    color: '#00E5FF',
    description: 'Free AI gateway — Kimi, MiniMax, Trinity and more at zero cost',
    tags: ['free', 'gateway', 'coding'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    color: '#FF00AA',
    description: 'Claude 3.5 Sonnet, Opus — industry-leading reasoning',
    tags: ['premium', 'reasoning', 'coding'],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    color: '#3FB950',
    description: 'GPT-4o, o1, o3-mini — flagship models from OpenAI',
    tags: ['premium', 'flagship'],
  },
  {
    id: 'google',
    label: 'Google AI Studio',
    color: '#AA00FF',
    description: 'Gemini 2.0 Pro/Flash — up to 2M token context window',
    tags: ['vision', 'long-context'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    color: '#00E5FF',
    description: 'Access 200+ models via one key — includes free-tier models',
    tags: ['aggregator', '200+ models'],
  },
  {
    id: 'groq',
    label: 'Groq',
    color: '#50FA7B',
    description: 'Ultra-fast LPU inference — Llama, QwQ at blazing speed',
    tags: ['speed', 'lpu'],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    color: '#8BE9FD',
    description: 'DeepSeek-V3 and R1 reasoning — exceptional value, low cost',
    tags: ['cheap', 'reasoning'],
  },
  {
    id: 'ollama',
    label: 'Ollama',
    color: '#3FB950',
    description: 'Run open models locally — completely private, no API key needed',
    tags: ['local', 'private'],
  },
  {
    id: 'google-vertex',
    label: 'Google Vertex AI',
    color: '#AA00FF',
    description: 'Gemini on GCP — flagship performance with GCP compliance',
    tags: ['enterprise', 'long-context'],
  },
  {
    id: 'opencode',
    label: 'opencode',
    color: '#00E5FF',
    description: 'opencode.ai gateway — high-throughput access to top models',
    tags: ['gateway', 'high-throughput'],
  },
  {
    id: 'amazon-bedrock',
    label: 'Amazon Bedrock',
    color: '#FF9900',
    description: 'AWS-managed models — Anthropic Claude and Amazon Nova',
    tags: ['enterprise', 'aws'],
  },
  {
    id: 'azure',
    label: 'Azure OpenAI',
    color: '#0078D4',
    description: 'OpenAI models on Azure — enterprise-grade deployments',
    tags: ['enterprise', 'azure'],
  },
  {
    id: 'github-copilot',
    label: 'GitHub Copilot',
    color: '#3FB950',
    description: 'GPT-4o, Claude, Gemini — via your Copilot subscription (OAuth)',
    tags: ['coding', 'oauth'],
    oauthFlow: true,
  },
];

interface Props {
  configuredProviders: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export function ProviderManager({ configuredProviders, onAdd, onRemove, onClose }: Props) {
  const [filter, setFilter] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = filter.toLowerCase();
    const all = PROVIDERS.filter(p =>
      p.id.includes(query) ||
      p.label.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags.some(t => t.includes(query))
    );

    const configured = all.filter(p => configuredProviders.includes(p.id));
    const available = all.filter(p => !configuredProviders.includes(p.id));

    return { configured, available, total: configured.length + available.length };
  }, [filter, configuredProviders]);

  useEffect(() => { setFocusIndex(0); }, [filter]);

  const allList = [...filtered.configured, ...filtered.available];

  useInput((input, key) => {
    if (confirmDelete) {
      if (input.toLowerCase() === 'y') {
        onRemove(confirmDelete);
        setConfirmDelete(null);
      } else if (input.toLowerCase() === 'n' || key.escape) {
        setConfirmDelete(null);
      }
      return;
    }

    if (key.escape) { onClose(); return; }

    if (key.return) {
      const p = allList[focusIndex];
      if (p) {
        if (configuredProviders.includes(p.id)) {
          // Maybe switch model or just do nothing? User said "add and delete"
          // Let's make Enter on configured do nothing or show info
        } else {
          onAdd(p.id);
        }
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (filter.length > 0) {
        setFilter(f => f.slice(0, -1));
      } else {
        const p = allList[focusIndex];
        if (p && configuredProviders.includes(p.id)) {
          setConfirmDelete(p.id);
        }
      }
      return;
    }

    if (key.upArrow) { setFocusIndex(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setFocusIndex(i => Math.min(allList.length - 1, i + 1)); return; }

    if (input && !key.ctrl && !key.meta) { setFilter(f => f + input); }
  });

  return (
    <Box
      borderStyle="single"
      borderColor="#FF00AA"
      flexDirection="column"
      paddingX={1}
      paddingY={1}
      marginY={1}
    >
      {/* Header Overlay */}
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color="#FF00AA" bold> NEURAL_LINK:PROVIDER_CORE_MANAGER </Text>
      </Box>

      {/* Filter bar */}
      <Box marginBottom={1} paddingX={1} borderStyle="round" borderColor="#484F58">
        <Text color="#00E5FF" bold>❯ </Text>
        <Text color="#FF00AA" bold>SCAN_NETWORK: </Text>
        <Text color="white" bold>{filter}</Text>
        <Text color="#FF00AA">▌</Text>
      </Box>

      {allList.length === 0 && (
        <Box paddingY={2} alignItems="center">
          <Text color="#FF5555" bold> [!] NO_NODES_DETECTED </Text>
        </Box>
      )}

      {/* Configured Section */}
      {filtered.configured.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="#3FB950" bold> ╭─ ACTIVE_NODES [{filtered.configured.length}] ───</Text>
          {filtered.configured.map((p, i) => {
            const focused = i === focusIndex;
            return (
              <Box key={p.id} paddingLeft={2} backgroundColor={focused ? '#161b22' : undefined}>
                <Text color={focused ? '#00E5FF' : '#484F58'}>{focused ? '❯❯ ' : '   '}</Text>
                <Box flexDirection="row" justifyContent="space-between" flexGrow={1}>
                  <Box>
                    <Text color={focused ? 'white' : '#8C959F'} bold={focused}>{p.label.toUpperCase()}</Text>
                    <Text color="#3FB950"> [CONNECTED] </Text>
                  </Box>
                  <Box>
                    <Text color="#FF5555"> [BACKSPACE:PURGE] </Text>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Available Section */}
      {filtered.available.length > 0 && (
        <Box flexDirection="column">
          <Text color="#484F58" bold> ╭─ AVAILABLE_NODES [{filtered.available.length}] ───</Text>
          {filtered.available.map((p, i) => {
            const idx = i + filtered.configured.length;
            const focused = idx === focusIndex;
            return (
              <Box key={p.id} paddingLeft={2} backgroundColor={focused ? '#161b22' : undefined}>
                <Text color={focused ? '#00E5FF' : '#484F58'}>{focused ? '❯❯ ' : '   '}</Text>
                <Box flexDirection="row" justifyContent="space-between" flexGrow={1}>
                  <Box>
                    <Text color={focused ? 'white' : '#8C959F'} bold={focused}>{p.label.toUpperCase()}</Text>
                    <Text color="#8C959F"> [{p.id}] </Text>
                  </Box>
                  <Box>
                    <Text color={focused ? '#FF00AA' : '#484F58'}> {p.oauthFlow ? '[ENTER:AUTHORIZE]' : '[ENTER:ESTABLISH]'} </Text>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Confirmation Modal (Inline) */}
      {confirmDelete && (
        <Box
          position="absolute"
          alignSelf="center"
          marginTop={5}
          paddingX={2}
          paddingY={1}
          backgroundColor="black"
          borderStyle="double"
          borderColor="#FF5555"
        >
          <Text color="#FF5555" bold> PURGE CONNECTION TO {confirmDelete.toUpperCase()}? [Y/N] </Text>
        </Box>
      )}

      <Box marginTop={1} justifyContent="space-between" paddingX={1}>
        <Text color="#484F58"> ESC:ABORT </Text>
        <Text color="#484F58"> ↑↓:NAVIGATE </Text>
      </Box>
    </Box>
  );
}
