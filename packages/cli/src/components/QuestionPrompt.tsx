import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface PendingQuestion {
  header: string;
  options: string[];
  resolve: (answer: string) => void;
}

interface Props {
  question: PendingQuestion | null;
}

export function QuestionPrompt({ question }: Props) {
  const [freeText, setFreeText] = useState('');

  useInput((input, key) => {
    if (!question) return;

    if (question.options.length > 0) {
      // Numbered option selection
      const n = parseInt(input);
      if (!isNaN(n) && n >= 1 && n <= question.options.length) {
        question.resolve(question.options[n - 1]);
      }
    } else {
      // Free-text entry
      if (key.return) {
        question.resolve(freeText || '(no answer)');
        setFreeText('');
      } else if (key.backspace || key.delete) {
        setFreeText((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setFreeText((prev) => prev + input);
      }
    }
  });

  if (!question) return null;

  return (
    <Box marginY={1} padding={1} borderStyle="round" borderColor="#58A6FF" flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="#58A6FF">
          ? Question
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text>{question.header}</Text>
      </Box>

      {question.options.length > 0 ? (
        <Box flexDirection="column" marginBottom={1}>
          {question.options.map((opt, i) => (
            <Box key={i}>
              <Text color="#8C959F">{i + 1}. </Text>
              <Text>{opt}</Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text color="#484F58">Press a number to select</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color="#484F58">› </Text>
            <Text>{freeText}</Text>
            <Text color="#484F58">█</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="#484F58">Press Enter to confirm</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
