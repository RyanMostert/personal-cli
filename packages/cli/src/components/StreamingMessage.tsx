import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { useTheme } from '../context/ThemeContext.js';
import { ThoughtView } from './ThoughtView.js';

interface Props {
  text: string;
  thought?: string;
  /** Approximate token count for the current stream (optional). */
  tokenCount?: number;
}

/** Blink cursor that alternates between full-block and dim-block every 500ms. */
function BlinkCursor() {
  const theme = useTheme();
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), 500);
    return () => clearInterval(t);
  }, []);
  return <Text color={on ? theme.primary : theme.dim}>▋</Text>;
}

export function StreamingMessage({ text, thought, tokenCount }: Props) {
  const theme = useTheme();

  // Approximate word count from streamed text — cheap proxy for tokens
  const wordCount = text ? text.trim().split(/\s+/).length : 0;
  const approxTokens = tokenCount ?? Math.ceil(wordCount * 1.33);

  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
      {thought && <ThoughtView text={thought} isStreaming={true} />}

      <Box flexDirection="column">
        {text ? (
          <Box flexDirection="column">
            <MarkdownRenderer text={text} />
            {/* Inline streaming stats — shown while text is actively arriving */}
            <Box flexDirection="row" marginTop={0}>
              <BlinkCursor />
              <Text color={theme.dim} italic>
                {' '}
                ~{approxTokens} tokens
              </Text>
            </Box>
          </Box>
        ) : !thought ? (
<<<<<<< HEAD
          <Text color={theme.dim}>▋ <Text italic>receiving…</Text></Text>
=======
          <Box flexDirection="row" alignItems="center">
            <BlinkCursor />
            <Text color={theme.dim} italic>
              {' '}
              receiving…
            </Text>
          </Box>
>>>>>>> tools_improvement
        ) : null}
      </Box>
    </Box>
  );
}
