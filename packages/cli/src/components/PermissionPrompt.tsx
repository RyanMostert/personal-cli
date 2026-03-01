import React from 'react';
import { Box, Text, useInput } from 'ink';

export interface PendingPermission {
  toolName: string;
  args?: Record<string, unknown>;
  resolve: (allow: boolean) => void;
}

interface Props {
  permission: PendingPermission | null;
}

export function PermissionPrompt({ permission }: Props) {
  useInput((input, key) => {
    if (!permission) return;
    
    const char = input.toLowerCase();
    if (char === 'y') {
      permission.resolve(true);
    } else if (char === 'n') {
      permission.resolve(false);
    }
  });

  if (!permission) return null;

  return (
    <Box marginY={1} padding={1} borderStyle="round" borderColor="#D29922" flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="#D29922">⚠️ Permission Required</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>
          Allow <Text color="#58A6FF">{permission.toolName}</Text> to execute?
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="#8C959F">
          {permission.args ? JSON.stringify(permission.args, null, 2) : 'No arguments'}
        </Text>
      </Box>
      <Box>
        <Text color="#484F58">Press </Text>
        <Text bold color="#3FB950">Y</Text>
        <Text color="#484F58">es or </Text>
        <Text bold color="#F85149">N</Text>
        <Text color="#484F58">o</Text>
      </Box>
    </Box>
  );
}
