import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  providerName: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

export function ProviderWizard({ providerName, onSave, onClose }: Props) {
  const [key, setKey] = useState('');

  useInput((input, inkKey) => {
    if (inkKey.escape) { onClose(); return; }
    if (inkKey.return) { if (key.trim()) onSave(key.trim()); return; }
    if (inkKey.backspace || inkKey.delete) { setKey(k => k.slice(0, -1)); return; }
    if (input && !inkKey.ctrl) setKey(k => k + input);
  });

  return (
    <Box borderStyle="round" borderColor="#D29922" flexDirection="column" paddingX={1} marginY={1}>
      <Text bold color="#D29922">ADD PROVIDER: {providerName.toUpperCase()}</Text>
      <Box marginTop={1}>
        <Text color="#8C959F">API Key: </Text>
        <Text color="#C9D1D9">{'•'.repeat(key.length)}</Text>
        <Text color="#484F58">_</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="#484F58">Enter to save  Esc to cancel</Text>
      </Box>
    </Box>
  );
}
