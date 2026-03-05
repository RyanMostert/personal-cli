import React from 'react';
import { Box, Text } from 'ink';
import { marked, type Token } from 'marked';

interface Props {
  text: string;
  dimmed?: boolean;
}

export function MarkdownRenderer({ text, dimmed = false }: Props) {
  if (!text || typeof text !== 'string') return null;

  try {
    const tokens = marked.lexer(text);
    if (!tokens || tokens.length === 0) {
      return <Text color={dimmed ? 'gray' : undefined}>{text}</Text>;
    }

    return (
      <Box flexDirection="column" width="100%">
        {tokens.map((token, i) => (
          <TokenView key={`${token.type}-${i}`} token={token} dimmed={dimmed} />
        ))}
      </Box>
    );
  } catch (err) {
    return <Text color={dimmed ? 'gray' : undefined}>{text}</Text>;
  }
}

interface TokenViewProps {
  token: Token;
  dimmed: boolean;
}

function TokenView({ token, dimmed }: TokenViewProps) {
  const muted = dimmed ? 'gray' : undefined;

  try {
    switch (token.type) {
      case 'heading':
        return (
          <Box marginTop={1} marginBottom={0} width="100%">
            <Text bold color={dimmed ? muted : '#58A6FF'}>
              {'#'.repeat(token.depth || 1)} {stripInlineMarkdown(token.text || '')}
            </Text>
          </Box>
        );

      case 'paragraph':
        return (
          <Box marginBottom={1} width="100%">
            <Text color={muted} wrap="wrap">
              {renderInline(token.text || '', dimmed)}
            </Text>
          </Box>
        );

      case 'code':
        return (
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={dimmed ? 'gray' : '#30363D'}
            marginBottom={1}
            paddingX={1}
            width="100%"
          >
            <Text color={dimmed ? muted : 'white'}>{token.text || ''}</Text>
          </Box>
        );

      case 'list':
        return (
          <Box flexDirection="column" marginBottom={1} width="100%">
            {(token.items || []).map((item: any, i: number) => (
              <Box key={i} width="100%">
                <Text color={dimmed ? muted : '#58A6FF'}>{token.ordered ? `${i + 1}. ` : '• '}</Text>
                <Text color={muted} wrap="wrap">
                  {stripInlineMarkdown(item.text || '')}
                </Text>
              </Box>
            ))}
          </Box>
        );

      case 'blockquote':
        return (
          <Box
            borderStyle="single"
            borderLeft
            borderRight={false}
            borderTop={false}
            borderBottom={false}
            borderColor="#484F58"
            paddingLeft={1}
            marginBottom={1}
            width="100%"
          >
            <Text color={dimmed ? muted : 'gray'} italic>
              {stripInlineMarkdown(token.text || '')}
            </Text>
          </Box>
        );

      default:
        if ('text' in token && typeof token.text === 'string') {
          return (
            <Text color={muted} wrap="wrap">
              {token.text}
            </Text>
          );
        }
        return null;
    }
  } catch (err) {
    return null;
  }
}

function renderInline(text: string, dimmed: boolean): React.ReactNode {
  if (!text) return '';
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let idx = 0;

  try {
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
        parts.push(
          <Text key={`b-${idx++}`} bold color={dimmed ? 'gray' : undefined}>
            {match[2]}
          </Text>,
        );
      } else if (match[3]) {
        parts.push(
          <Text key={`i-${idx++}`} italic color={dimmed ? 'gray' : undefined}>
            {match[3]}
          </Text>,
        );
      } else if (match[4]) {
        parts.push(
          <Text
            key={`c-${idx++}`}
            color={dimmed ? 'gray' : '#E6EDF3'}
            backgroundColor={dimmed ? undefined : '#1C2128'}
          >{` ${match[4]} `}</Text>,
        );
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
  } catch (err) {
    return text;
  }

  return parts.length > 0 ? parts : text;
}

function stripInlineMarkdown(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}
