import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  mode: 'add' | 'edit';
  pluginName?: string;
  onSave: (data: { name: string; version: string; description: string; createTemplate: boolean }) => void;
  onClose: () => void;
}

type FormField = 'name' | 'version' | 'description' | 'template';

export function PluginWizard({ mode, pluginName: initialName, onSave, onClose }: Props) {
  const [focusField, setFocusField] = useState<FormField>('name');
  const [name, setName] = useState(initialName || '');
  const [version, setVersion] = useState('0.1.0');
  const [description, setDescription] = useState('');
  const [createTemplate, setCreateTemplate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEditing = mode === 'edit';
  const fields: FormField[] = ['name', 'version', 'description', 'template'];

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      const currentIndex = fields.indexOf(focusField);
      if (currentIndex < fields.length - 1) {
        setFocusField(fields[currentIndex + 1]);
      } else {
        if (!name.trim()) {
          setError('Plugin name is required');
          return;
        }
        onSave({ name: name.trim(), version, description, createTemplate });
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
      if (currentIndex > 0) setFocusField(fields[currentIndex - 1]);
      return;
    }

    if (key.downArrow) {
      const currentIndex = fields.indexOf(focusField);
      if (currentIndex < fields.length - 1) setFocusField(fields[currentIndex + 1]);
      return;
    }

    // Handle input
    switch (focusField) {
      case 'name':
        if (!isEditing) {
          if (key.backspace || key.delete) setName((n) => n.slice(0, -1));
          else if (input && !key.ctrl && !key.meta) setName((n) => n + input);
        }
        break;
      case 'version':
        if (key.backspace || key.delete) setVersion((v) => v.slice(0, -1));
        else if (input && !key.ctrl && !key.meta) setVersion((v) => v + input);
        break;
      case 'description':
        if (key.backspace || key.delete) setDescription((d) => d.slice(0, -1));
        else if (input && !key.ctrl && !key.meta) setDescription((d) => d + input);
        break;
      case 'template':
        if (input === 'y' || input === 'n') setCreateTemplate(input === 'y');
        break;
    }

    if (error) setError(null);
  });

  const renderField = (field: FormField, label: string, value: string, isFocused: boolean) => (
    <Box
      flexDirection="column"
      marginBottom={1}
      borderStyle={isFocused ? 'double' : undefined}
      borderColor={isFocused ? '#AA00FF' : undefined}
      paddingX={isFocused ? 1 : 0}
    >
      <Text color={isFocused ? '#AA00FF' : '#484F58'} bold>
        {isFocused ? '❯ ' : '  '}
        {label}
      </Text>
      <Box>
        <Text color={isFocused ? 'white' : '#8C959F'}>{value || (isFocused ? '_' : '<empty>')}</Text>
        {isFocused && value && <Text color="#AA00FF">_</Text>}
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} marginY={1} borderStyle="single" borderColor="#AA00FF">
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color="#AA00FF" bold>
          {isEditing ? 'RECONFIGURING_MODULE' : 'INITIALIZING_NEW_MODULE'}
        </Text>
      </Box>

      <Box flexDirection="column">
        {renderField('name', 'MODULE_IDENTIFIER', name, focusField === 'name')}
        {renderField('version', 'VERSION_TAG', version, focusField === 'version')}
        {renderField('description', 'FUNCTIONAL_PURPOSE', description, focusField === 'description')}

        <Box
          flexDirection="column"
          marginBottom={1}
          borderStyle={focusField === 'template' ? 'double' : undefined}
          borderColor={focusField === 'template' ? '#AA00FF' : undefined}
          paddingX={focusField === 'template' ? 1 : 0}
        >
          <Text color={focusField === 'template' ? '#AA00FF' : '#484F58'} bold>
            {focusField === 'template' ? '❯ ' : '  '}GENERATE_BOOTSTRAP_TEMPLATE (index.js)?
          </Text>
          <Box>
            <Text color={createTemplate ? '#3FB950' : '#484F58'}>
              {createTemplate ? '▓▓ YES (Recommended)' : '░░ NO (Manual implementation)'}
            </Text>
          </Box>
        </Box>

        {error && (
          <Box marginTop={1} paddingX={1} borderStyle="single" borderColor="#FF5555">
            <Text color="#FF5555" bold>
              ⚠ {error}
            </Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text color="#484F58"> ESC:ABORT │ TAB:NEXT FIELD </Text>
        <Text color="#AA00FF" bold>
          {' '}
          ENTER:{focusField === 'template' ? 'EXECUTE_INIT' : 'NEXT_FIELD'}{' '}
        </Text>
      </Box>
    </Box>
  );
}
