import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface ProviderInfo {
  label: string;
  color: string;
  description: string;
  keyLabel: string;
  keyUrl?: string;
  envVar?: string;
  noKeyNeeded?: boolean;
  oauthFlow?: boolean;
  extraNote?: string;
}

const PROVIDER_INFO: Record<string, ProviderInfo> = {
  'opencode-zen': {
    label: 'OpenCode Zen',
    color: '#00E5FF',
    description: 'Free AI gateway — Kimi, MiniMax, Trinity and more at zero cost',
    keyLabel: 'ACCESS_KEY',
    keyUrl: 'opencode.ai/zen',
    envVar: 'OPENCODE_API_KEY',
  },
  'anthropic': {
    label: 'Anthropic',
    color: '#FF00AA',
    description: 'Claude Opus, Sonnet, Haiku — industry-leading reasoning and coding',
    keyLabel: 'X-API-KEY',
    keyUrl: 'console.anthropic.com/settings/keys',
    envVar: 'ANTHROPIC_API_KEY',
  },
  'openai': {
    label: 'OpenAI',
    color: '#3FB950',
    description: 'GPT-4o, o3, o4-mini — flagship models from OpenAI',
    keyLabel: 'BEARER_TOKEN',
    keyUrl: 'platform.openai.com/api-keys',
    envVar: 'OPENAI_API_KEY',
  },
  'google': {
    label: 'Google AI Studio',
    color: '#AA00FF',
    description: 'Gemini 2.5 Pro/Flash — up to 1M token context window',
    keyLabel: 'API_KEY',
    keyUrl: 'aistudio.google.com/app/apikey',
    envVar: 'GOOGLE_API_KEY',
  },
  'mistral': {
    label: 'Mistral AI',
    color: '#BD93F9',
    description: 'Mistral Large, Codestral, Devstral — European open models',
    keyLabel: 'MISTRAL_KEY',
    keyUrl: 'console.mistral.ai/api-keys',
    envVar: 'MISTRAL_API_KEY',
  },
  'openrouter': {
    label: 'OpenRouter',
    color: '#00E5FF',
    description: 'Access 200+ models via one key — includes free-tier models',
    keyLabel: 'OR_API_KEY',
    keyUrl: 'openrouter.ai/keys',
    envVar: 'OPENROUTER_API_KEY',
    extraNote: 'Tip: filter with #free in /model to see zero-cost models',
  },
  'groq': {
    label: 'Groq',
    color: '#50FA7B',
    description: 'Ultra-fast LPU inference — Llama, QwQ at blazing speed',
    keyLabel: 'GROQ_API_KEY',
    keyUrl: 'console.groq.com/keys',
    envVar: 'GROQ_API_KEY',
  },
  'xai': {
    label: 'xAI',
    color: '#FF5555',
    description: "Grok 3, Grok 3 Mini — xAI's reasoning-capable models",
    keyLabel: 'XAI_KEY',
    keyUrl: 'console.x.ai',
    envVar: 'XAI_API_KEY',
  },
  'deepseek': {
    label: 'DeepSeek',
    color: '#8BE9FD',
    description: 'DeepSeek-V3 and R1 reasoning — exceptional value, low cost',
    keyLabel: 'DS_API_KEY',
    keyUrl: 'platform.deepseek.com/api_keys',
    envVar: 'DEEPSEEK_API_KEY',
  },
  'perplexity': {
    label: 'Perplexity',
    color: '#FFB86C',
    description: 'Sonar models with live web search built in',
    keyLabel: 'PPLX_KEY',
    keyUrl: 'perplexity.ai/settings/api',
    envVar: 'PERPLEXITY_API_KEY',
  },
  'cerebras': {
    label: 'Cerebras',
    color: '#FF00AA',
    description: 'Hardware-accelerated inference — fastest token generation available',
    keyLabel: 'CB_API_KEY',
    keyUrl: 'cloud.cerebras.ai/platform/api_keys',
    envVar: 'CEREBRAS_API_KEY',
  },
  'together': {
    label: 'Together AI',
    color: '#6272A4',
    description: 'Multi-model inference — Llama, Qwen, DeepSeek via one API',
    keyLabel: 'TOG_KEY',
    keyUrl: 'api.together.xyz/settings/api-keys',
    envVar: 'TOGETHER_API_KEY',
  },
  'github-copilot': {
    label: 'GitHub Copilot',
    color: '#3FB950',
    description: 'AI pair programmer — access GPT-4o, Claude, Gemini via your Copilot subscription',
    keyLabel: '',
    oauthFlow: true,
    extraNote: 'Requires GitHub Copilot Pro or Enterprise subscription',
  },
  'ollama': {
    label: 'Ollama',
    color: '#3FB950',
    description: 'Run open models locally — completely private, no API key needed',
    keyLabel: '',
    noKeyNeeded: true,
    extraNote: 'Install: ollama.com  |  Pull a model: ollama pull llama3.3',
  },

  'custom': {
    label: 'Custom Provider',
    color: '#8C959F',
    description: 'Any OpenAI-compatible API endpoint',
    keyLabel: 'CUSTOM_KEY',
    envVar: 'CUSTOM_API_KEY',
    extraNote: 'Switch with: /model custom/http://localhost:8080/v1|model-name',
  },
};

const FALLBACK_INFO: ProviderInfo = {
  label: 'Provider',
  color: '#8C959F',
  description: 'Enter your API key below',
  keyLabel: 'API Key',
};

interface Props {
  providerName: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

export function ProviderWizard({ providerName, onSave, onClose }: Props) {
  const [key, setKey] = useState('');
  const [scanPos, setScanPos] = useState(0);
  const [oauthPhase, setOauthPhase] = useState<'init' | 'waiting' | 'done' | 'error'>('init');
  const [deviceInfo, setDeviceInfo] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const info = PROVIDER_INFO[providerName] ?? FALLBACK_INFO;

  useEffect(() => {
    const timer = setInterval(() => {
      setScanPos((p) => (p + 1) % 40);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Handle OAuth device flow for providers that use it
  useEffect(() => {
    if (!info.oauthFlow) return;

    setOauthPhase('init');

    // Dynamically import to avoid loading in non-copilot cases
    import('@personal-cli/core').then(async ({ startDeviceFlow, pollForGitHubToken, saveGitHubToken, isCopilotAuthenticated }) => {
      try {
        // Check if already authenticated
        if (isCopilotAuthenticated()) {
          setOauthPhase('done');
          onSave('oauth');
          return;
        }

        const { userCode, verificationUri, deviceCode, interval } = await startDeviceFlow();
        setDeviceInfo({ userCode, verificationUri });
        setOauthPhase('waiting');

        const githubToken = await pollForGitHubToken(deviceCode, interval);
        saveGitHubToken(githubToken);
        setOauthPhase('done');
        onSave('oauth');
      } catch (err: any) {
        setOauthError(err.message ?? 'Authorization failed');
        setOauthPhase('error');
      }
    });
  }, []);

  useInput((input, inkKey) => {
    if (inkKey.escape) { onClose(); return; }
    if (info.oauthFlow) return; // OAuth handles its own flow
    if (inkKey.return) {
      if (info.noKeyNeeded) { onSave(''); return; }
      if (key.trim()) onSave(key.trim());
      return;
    }
    if (info.noKeyNeeded) return;
    if (inkKey.backspace || inkKey.delete) { setKey(k => k.slice(0, -1)); return; }
    if (input && !inkKey.ctrl && !inkKey.meta) setKey(k => k + input);
  });

  const scanLine = ' '.repeat(scanPos) + '█' + ' '.repeat(Math.max(0, 40 - scanPos));

  return (
    <Box
      flexDirection="column"
      paddingX={2}
      paddingY={1}
      marginY={1}
      borderStyle="single"
      borderColor={info.color}
    >
      {/* Header Overlay */}
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color={info.color} bold> INITIALIZING_PROVIDER_LINK_{providerName.toUpperCase()} </Text>
      </Box>

      {/* Main Info */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="column" flexGrow={1}>
          <Box marginBottom={1}>
            <Text bold color={info.color} inverse> {info.label.toUpperCase()} </Text>
            <Text color={info.color}> ▐ </Text>
            <Text italic color="#8C959F">{info.description}</Text>
          </Box>

          {info.keyUrl && (
            <Box>
              <Text color="#484F58">SOURCE_NODE: </Text>
              <Text color={info.color} underline>{info.keyUrl}</Text>
            </Box>
          )}

          {info.envVar && (
            <Box>
              <Text color="#484F58">ENV_VARIABLE: </Text>
              <Text color="#AA00FF" bold>{info.envVar}</Text>
            </Box>
          )}
        </Box>

        {/* Diagnostic Scan Panel */}
        <Box flexDirection="column" marginLeft={4} width={15} borderStyle="single" borderColor="#484F58">
          <Text color="#484F58"> SYS_SCAN </Text>
          <Text color={info.color}>{scanLine.slice(0, 10)}</Text>
          <Text color="#484F58"> [OK] 100% </Text>
        </Box>
      </Box>

      {/* Input Section */}
      <Box
        marginTop={1}
        paddingX={2}
        paddingY={1}
        backgroundColor="#161b22"
        borderStyle="double"
        borderColor={info.noKeyNeeded || info.oauthFlow ? '#3FB950' : (key.length > 0 ? info.color : '#484F58')}
      >
        {info.oauthFlow ? (
          // OAuth Flow UI
          oauthPhase === 'init' ? (
            <Box flexDirection="row" alignItems="center">
              <Text color="#3FB950" bold> [ CONNECTING ] </Text>
              <Text color="#8C959F"> Initializing GitHub device flow...</Text>
            </Box>
          ) : oauthPhase === 'waiting' && deviceInfo ? (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text color="#3FB950" bold> [ AUTHORIZATION REQUIRED ] </Text>
              </Box>
              <Box marginBottom={1}>
                <Text color="#8C959F">Visit: </Text>
                <Text color="#00E5FF" underline>{deviceInfo.verificationUri}</Text>
              </Box>
              <Box marginBottom={1}>
                <Text color="#8C959F">Enter code: </Text>
                <Text color="#FF00AA" bold> {deviceInfo.userCode} </Text>
              </Box>
              <Box>
                <Text color="#484F58">Waiting for authorization</Text>
                <Text color="#3FB950">{scanLine.slice(0, 3)}</Text>
              </Box>
            </Box>
          ) : oauthPhase === 'done' ? (
            <Box flexDirection="row" alignItems="center">
              <Text color="#3FB950" bold> [ AUTHORIZED ] </Text>
              <Text color="#8C959F"> GitHub Copilot linked successfully!</Text>
            </Box>
          ) : oauthPhase === 'error' ? (
            <Box flexDirection="column">
              <Text color="#FF5555" bold> [ AUTHORIZATION FAILED ] </Text>
              <Text color="#8C959F">{oauthError}</Text>
            </Box>
          ) : null
        ) : info.noKeyNeeded ? (
          <Box flexDirection="row" alignItems="center">
            <Text color="#3FB950" bold> [ LINK READY ] </Text>
            <Text color="#8C959F"> {info.extraNote}</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            <Box flexDirection="row">
              <Text color={info.color} bold>{info.keyLabel} » </Text>
              <Text color="white">{'*'.repeat(key.length)}</Text>
              <Text color={info.color} bold>{key.length % 2 === 0 ? '_' : ' '}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="#484F58">CRYPT_SIGNATURE: </Text>
              <Text color="#AA00FF">{Buffer.from(key).toString('hex').slice(0, 16)}...</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Actions */}
      <Box marginTop={1} justifyContent="space-between">
        <Text color="#484F58"> ESC:ABORT_LINK </Text>
        {info.oauthFlow ? (
          <Text color={info.color} bold> [OAUTH FLOW ACTIVE] </Text>
        ) : (
          <Text color={info.color} bold> ENTER:ESTABLISH_CONNECTION </Text>
        )}
      </Box>
    </Box>
  );
}
