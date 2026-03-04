import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { MCPServerConfig } from '@personal-cli/mcp-client';

interface Props {
  mode: 'add' | 'edit';
  serverName?: string;
  existingConfig?: MCPServerConfig;
  onSave: (name: string, config: MCPServerConfig) => void;
  onClose: () => void;
}

type FormField = 'name' | 'transport' | 'command' | 'args' | 'env' | 'url' | 'headers' | 'timeout' | 'trust';

const TRANSPORTS = ['stdio', 'sse', 'http'] as const;

export function MCPWizard({ mode, serverName: initialName, existingConfig, onSave, onClose }: Props) {
  const [focusField, setFocusField] = useState<FormField>('name');
  const [name, setName] = useState(initialName || '');
  const [transport, setTransport] = useState<typeof TRANSPORTS[number]>(existingConfig?.transport || 'stdio');
  const [command, setCommand] = useState(existingConfig?.command || '');
  const [args, setArgs] = useState(existingConfig?.args?.join(', ') || '');
  const [env, setEnv] = useState(
    existingConfig?.env ? Object.entries(existingConfig.env).map(([k, v]) => `${k}=${v}`).join('\n') : ''
  );
  const [url, setUrl] = useState(existingConfig?.url || '');
  const [headers, setHeaders] = useState(
    existingConfig?.headers ? Object.entries(existingConfig.headers).map(([k, v]) => `${k}=${v}`).join('\n') : ''
  );
  const [timeout, setTimeout] = useState(String(existingConfig?.timeout || 60000));
  const [trust, setTrust] = useState(existingConfig?.trust || false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = mode === 'edit';
  const canEditName = !isEditing;

  const fields: FormField[] = [
    'name',
    'transport',
    ...(transport === 'stdio' ? ['command', 'args', 'env'] as FormField[] : []),
    ...(transport !== 'stdio' ? ['url', 'headers'] as FormField[] : []),
    'timeout',
    'trust',
  ];

  useInput((input, key) => {
    if (key.escape) { onClose(); return; }

    if (key.return) {
      const currentIndex = fields.indexOf(focusField);
      if (currentIndex < fields.length - 1) {
        setFocusField(fields[currentIndex + 1]);
      } else {
        // Save
        if (!name.trim()) {
          setError('Server name is required');
          return;
        }

        const config: MCPServerConfig = {
          transport,
          timeout: parseInt(timeout) || 60000,
          trust,
          enabled: true,
        };

        if (transport === 'stdio') {
          if (!command.trim()) {
            setError('Command is required for stdio transport');
            return;
          }
          config.command = command.trim();
          if (args.trim()) {
            config.args = args.split(',').map(a => a.trim()).filter(Boolean);
          }
          if (env.trim()) {
            config.env = {};
            env.split('\n').forEach(line => {
              const [k, ...v] = line.split('=');
              if (k && v.length > 0) {
                config.env![k.trim()] = v.join('=').trim();
              }
            });
          }
        } else {
          if (!url.trim()) {
            setError('URL is required for SSE/HTTP transport');
            return;
          }
          config.url = url.trim();
          if (headers.trim()) {
            config.headers = {};
            headers.split('\n').forEach(line => {
              const [k, ...v] = line.split('=');
              if (k && v.length > 0) {
                config.headers![k.trim()] = v.join('=').trim();
              }
            });
          }
        }

        onSave(name.trim(), config);
      }
      return;
    }

    if (key.tab) {
      const currentIndex = fields.indexOf(focusField);
      const nextIndex = (currentIndex + 1) % fields.length;
      setFocusField(fields[nextIndex]);
      return;
    }

    if (key.upArrow) {
      const currentIndex = fields.indexOf(focusField);
      if (currentIndex > 0) {
        setFocusField(fields[currentIndex - 1]);
      }
      return;
    }

    if (key.downArrow) {
      const currentIndex = fields.indexOf(focusField);
      if (currentIndex < fields.length - 1) {
        setFocusField(fields[currentIndex + 1]);
      }
      return;
    }

    // Handle input for focused field
    switch (focusField) {
      case 'name':
        if (canEditName) {
          if (key.backspace || key.delete) {
            setName(n => n.slice(0, -1));
          } else if (input && !key.ctrl && !key.meta) {
            setName(n => n + input);
          }
        }
        break;

      case 'transport':
        if (input === 's') setTransport('stdio');
        if (input === 'e') setTransport('sse');
        if (input === 'h') setTransport('http');
        break;

      case 'command':
        if (key.backspace || key.delete) {
          setCommand(c => c.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setCommand(c => c + input);
        }
        break;

      case 'args':
        if (key.backspace || key.delete) {
          setArgs(a => a.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setArgs(a => a + input);
        }
        break;

      case 'env':
        if (key.backspace || key.delete) {
          setEnv(e => e.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setEnv(e => e + input);
        }
        break;

      case 'url':
        if (key.backspace || key.delete) {
          setUrl(u => u.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setUrl(u => u + input);
        }
        break;

      case 'headers':
        if (key.backspace || key.delete) {
          setHeaders(h => h.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setHeaders(h => h + input);
        }
        break;

      case 'timeout':
        if (key.backspace || key.delete) {
          setTimeout(t => t.slice(0, -1));
        } else if (/\d/.test(input)) {
          setTimeout(t => t + input);
        }
        break;

      case 'trust':
        if (input === 'y' || input === 'n') {
          setTrust(input === 'y');
        }
        break;
    }

    // Clear error on any input
    if (error) setError(null);
  });

  const scanLine = '░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░';

  const renderField = (field: FormField, label: string, value: string, isFocused: boolean) => (
    <Box 
      flexDirection="column" 
      marginBottom={1}
      borderStyle={isFocused ? 'double' : undefined}
      borderColor={isFocused ? '#00E5FF' : undefined}
      paddingX={isFocused ? 1 : 0}
    >
      <Text color={isFocused ? '#00E5FF' : '#484F58'} bold>
        {isFocused ? '❯ ' : '  '}{label}
      </Text>
      <Box>
        <Text color={isFocused ? 'white' : '#8C959F'}>
          {value || (isFocused ? '_' : '<empty>')}
        </Text>
        {isFocused && value && <Text color="#00E5FF">_</Text>}
      </Box>
    </Box>
  );

  return (
    <Box
      flexDirection="column"
      paddingX={2}
      paddingY={1}
      marginY={1}
      borderStyle="single"
      borderColor="#00E5FF"
    >
      {/* Header */}
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color="#00E5FF" bold> 
          {isEditing ? 'MODIFYING_MCP_LINK' : 'INITIALIZING_MCP_LINK'} 
        </Text>
      </Box>

      {/* Main Content */}
      <Box flexDirection="row">
        <Box flexDirection="column" flexGrow={1}>
          {/* Name */}
          {renderField('name', 'NEURAL_SIGNATURE (unique name)', name, focusField === 'name')}
          {isEditing && (
            <Text color="#484F58">Editing existing server configuration</Text>
          )}

          {/* Transport */}
          <Box 
            flexDirection="column" 
            marginBottom={1}
            borderStyle={focusField === 'transport' ? 'double' : undefined}
            borderColor={focusField === 'transport' ? '#00E5FF' : undefined}
            paddingX={focusField === 'transport' ? 1 : 0}
          >
            <Text color={focusField === 'transport' ? '#00E5FF' : '#484F58'} bold>
              {focusField === 'transport' ? '❯ ' : '  '}TRANSPORT PROTOCOL
            </Text>
            <Box>
              {TRANSPORTS.map(t => (
                <Text key={t} color={transport === t ? '#00E5FF' : '#484F58'}>
                  {transport === t ? '▓▓ ' : '░░ '}{t.toUpperCase()} 
                </Text>
              ))}
            </Box>
          </Box>

          {/* Stdio fields */}
          {transport === 'stdio' && (
            <>
              {renderField('command', 'COMMAND (executable)', command, focusField === 'command')}
              {renderField('args', 'ARGUMENTS (comma-separated)', args, focusField === 'args')}
              {renderField('env', 'ENVIRONMENT (KEY=VALUE per line)', env, focusField === 'env')}
            </>
          )}

          {/* SSE/HTTP fields */}
          {transport !== 'stdio' && (
            <>
              {renderField('url', 'ENDPOINT URL', url, focusField === 'url')}
              {renderField('headers', 'HEADERS (KEY=VALUE per line)', headers, focusField === 'headers')}
            </>
          )}

          {/* Common fields */}
          {renderField('timeout', 'TIMEOUT (milliseconds)', timeout, focusField === 'timeout')}
          
          <Box 
            flexDirection="column" 
            marginBottom={1}
            borderStyle={focusField === 'trust' ? 'double' : undefined}
            borderColor={focusField === 'trust' ? '#00E5FF' : undefined}
            paddingX={focusField === 'trust' ? 1 : 0}
          >
            <Text color={focusField === 'trust' ? '#00E5FF' : '#484F58'} bold>
              {focusField === 'trust' ? '❯ ' : '  '}TRUST LEVEL (auto-approve tools)
            </Text>
            <Box>
              <Text color={trust ? '#3FB950' : '#484F58'}>
                {trust ? '▓▓ YES (tools auto-approved)' : '░░ NO (ask for approval)'}
              </Text>
            </Box>
          </Box>

          {/* Error */}
          {error && (
            <Box marginTop={1} paddingX={1} borderStyle="single" borderColor="#FF5555">
              <Text color="#FF5555" bold>⚠ {error}</Text>
            </Box>
          )}
        </Box>

        {/* Side Panel */}
        <Box flexDirection="column" marginLeft={4} width={15} borderStyle="single" borderColor="#484F58">
          <Text color="#484F58"> SYS_SCAN </Text>
          <Text color="#00E5FF">{scanLine.slice(0, 10)}</Text>
          <Text color="#484F58"> [OK] 100% </Text>
        </Box>
      </Box>

      {/* Actions */}
      <Box marginTop={1} justifyContent="space-between">
        <Text color="#484F58"> ESC:ABORT │ TAB:NEXT FIELD </Text>
        <Text color="#00E5FF" bold> ENTER:{focusField === fields[fields.length - 1] ? 'SAVE_CONFIG' : 'NEXT_FIELD'} </Text>
      </Box>
    </Box>
  );
}
