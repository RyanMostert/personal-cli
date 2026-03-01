import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { marked, type Token } from 'marked';
import { highlightCode } from '../highlight.js';

interface Props {
  text: string;
  dimmed?: boolean;
}

interface CodeBlockState {
  key: string;
  highlighted: string | null;
}

export function MarkdownRenderer({ text, dimmed = false }: Props) {
  const [highlightedBlocks, setHighlightedBlocks] = useState<Map<string, string>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());

  const tokens = marked.lexer(text);

  // Kick off async highlighting for code blocks we haven't processed yet
  useEffect(() => {
    const codeTokens = tokens.filter((t): t is Extract<Token, { type: 'code' }> => t.type === 'code');
    for (const token of codeTokens) {
      const key = `${token.lang ?? 'text'}:${token.text}`;
      if (!highlightedBlocks.has(key) && !pendingRef.current.has(key)) {
        pendingRef.current.add(key);
        highlightCode(token.text, token.lang ?? 'text').then((result) => {
          pendingRef.current.delete(key);
          setHighlightedBlocks((prev) => {
            const next = new Map(prev);
            next.set(key, result);
            return next;
          });
        });
      }
    }
  }, [text]);

  const color = dimmed ? 'gray' : undefined;

  return (
    <Box flexDirection="column">
      {tokens.map((token, i) => (
        <TokenView
          key={`${token.type}-${i}`}
          token={token}
          highlightedBlocks={highlightedBlocks}
          dimmed={dimmed}
        />
      ))}
    </Box>
  );
}

interface TokenViewProps {
  token: Token;
  highlightedBlocks: Map<string, string>;
  dimmed: boolean;
}

function TokenView({ token, highlightedBlocks, dimmed }: TokenViewProps) {
  const muted = dimmed ? 'gray' : undefined;

  switch (token.type) {
    case 'heading': {
      const colors = ['#58A6FF', '#79C0FF', '#A5D6FF'];
      const c = colors[Math.min(token.depth - 1, colors.length - 1)];
      const prefix = '#'.repeat(token.depth) + ' ';
      return (
        <Box marginTop={token.depth === 1 ? 1 : 0} marginBottom={0}>
          <Text bold color={dimmed ? muted : c}>
            {prefix}{stripInlineMarkdown(token.text)}
          </Text>
        </Box>
      );
    }

    case 'paragraph':
      return (
        <Box marginBottom={1}>
          <Text color={muted} wrap="wrap">
            {renderInline(token.text, dimmed)}
          </Text>
        </Box>
      );

    case 'code': {
      const key = `${token.lang ?? 'text'}:${token.text}`;
      const highlighted = highlightedBlocks.get(key);
      return (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={dimmed ? 'gray' : '#30363D'}
          marginBottom={1}
          paddingX={1}
        >
          <Box borderBottom borderStyle="single" borderColor="#30363D" paddingBottom={0} marginBottom={1} justifyContent="space-between">
            <Text>
              <Text color="#F85149">● </Text>
              <Text color="#D29922">● </Text>
              <Text color="#3FB950">●</Text>
            </Text>
            {token.lang ? (
              <Text color={dimmed ? muted : '#8B949E'} dimColor>
                {token.lang}
              </Text>
            ) : null}
          </Box>
          {highlighted ? (
            <Text>{highlighted}</Text>
          ) : (
            <Text color={dimmed ? muted : 'white'}>{token.text}</Text>
          )}
        </Box>
      );
    }

    case 'blockquote':
      return (
        <Box borderStyle="single" borderLeft borderRight={false} borderTop={false} borderBottom={false} borderColor="#484F58" paddingLeft={1} marginBottom={1}>
          <Text color={dimmed ? muted : 'gray'} italic>
            {stripInlineMarkdown(token.text)}
          </Text>
        </Box>
      );

    case 'list': {
      return (
        <Box flexDirection="column" marginBottom={1}>
          {token.items.map((item: any, i: number) => (
            <Box key={i}>
              <Text color={dimmed ? muted : '#58A6FF'}>{token.ordered ? `${i + 1}. ` : '• '}</Text>
              <Text color={muted} wrap="wrap">
                {stripInlineMarkdown(item.text)}
              </Text>
            </Box>
          ))}
        </Box>
      );
    }

    case 'hr':
      return (
        <Box marginBottom={1}>
          <Text color={dimmed ? muted : '#484F58'}>{'─'.repeat(40)}</Text>
        </Box>
      );

    case 'space':
      return <Box />;

    case 'html':
      return <Text color={muted}>{token.text}</Text>;

    default:
      if ('text' in token && typeof token.text === 'string') {
        return <Text color={muted} wrap="wrap">{token.text}</Text>;
      }
      return null;
  }
}

// Render inline markdown (bold, italic, code) as React children
function renderInline(text: string, dimmed: boolean): React.ReactNode {
  // Simple inline rendering — split on bold/italic/code patterns
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let idx = 0;

  // Patterns: **bold**, *italic*, `code`
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`t-${idx++}`} color={dimmed ? 'gray' : undefined}>
          {text.slice(lastIndex, match.index)}
        </Text>,
      );
    }

    if (match[2]) {
      parts.push(<Text key={`b-${idx++}`} bold color={dimmed ? 'gray' : undefined}>{match[2]}</Text>);
    } else if (match[3]) {
      parts.push(<Text key={`i-${idx++}`} italic color={dimmed ? 'gray' : undefined}>{match[3]}</Text>);
    } else if (match[4]) {
      parts.push(<Text key={`c-${idx++}`} color={dimmed ? 'gray' : '#E6EDF3'} backgroundColor={dimmed ? undefined : '#1C2128'}>{` ${match[4]} `}</Text>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t-${idx++}`} color={dimmed ? 'gray' : undefined}>
        {text.slice(lastIndex)}
      </Text>,
    );
  }

  return parts.length > 0 ? parts : text;
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}
