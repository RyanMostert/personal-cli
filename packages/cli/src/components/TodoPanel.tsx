import React from 'react';
import { Box, Text } from 'ink';
import type { TodoItem } from '@personal-cli/shared';
import { useTheme } from '../context/ThemeContext.js';

interface Props {
  todos: TodoItem[];
}

export function TodoPanel({ todos }: Props) {
  const theme = useTheme();

  if (todos.length === 0) return null;

  const done = todos.filter((t) => t.done).length;
  const total = todos.length;

  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      {/* Header */}
      <Box flexDirection="row" gap={1}>
<<<<<<< HEAD
        <Text color={theme.primary} bold>◉ TASKS</Text>
        <Text color={theme.dim}>{done}/{total}</Text>
=======
        <Text color={theme.primary} bold>
          ◉ TASKS
        </Text>
        <Text color={theme.dim}>
          {done}/{total}
        </Text>
>>>>>>> tools_improvement
      </Box>

      {/* Task rows */}
      <Box flexDirection="column" paddingLeft={2}>
        {todos.map((t) => (
          <Box key={t.id} flexDirection="row" gap={1}>
<<<<<<< HEAD
            <Text color={t.done ? theme.success : theme.warning}>
              {t.done ? '✔' : '○'}
            </Text>
            <Text
              color={t.done ? theme.dim : 'white'}
              dimColor={t.done}
              strikethrough={t.done}
            >
=======
            <Text color={t.done ? theme.success : theme.warning}>{t.done ? '✔' : '○'}</Text>
            <Text color={t.done ? theme.dim : 'white'} dimColor={t.done} strikethrough={t.done}>
>>>>>>> tools_improvement
              {t.text}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
