import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { PROVIDER_REGISTRY, type ProviderEntry } from '@personal-cli/shared';

const FALLBACK_INFO: ProviderEntry = {
  id: 'custom' as any,
  label: 'Provider',
  color: '#8C959F',
  description: 'Enter your API key below',
  tags: [],
  keyLabel: 'API Key',
};

interface Props {
  providerName: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

export function ProviderWizard({ providerName, onSave, onClose }: Props) {
  const [key, setKey] = useState('');
  const [oauthPhase, setOauthPhase] = useState<'init' | 'waiting' | 'done' | 'error'>('init');
  const [deviceInfo, setDeviceInfo] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  
  const info = PROVIDER_REGISTRY.find(p => p.id === providerName) ?? FALLBACK_INFO;

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

  const scanLine = '░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░';

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
