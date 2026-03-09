import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Text } from 'ink';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    // In a real app, we might log this to a file
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          flexDirection="column"
          padding={2}
          borderStyle="double"
          borderColor="#FF5555"
          width="100%"
        >
          <Box marginBottom={1} justifyContent="center">
            <Text color="#FF5555" bold inverse>
              {' '}
              ⚠️ CRITICAL_SYSTEM_FAILURE ⚠️{' '}
            </Text>
          </Box>

          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="#484F58"
            paddingX={2}
            paddingY={1}
          >
            <Text color="#FF5555" bold>
              ERROR_TYPE:{' '}
            </Text>
            <Text color="white">{this.state.error?.name || 'UnknownError'}</Text>

            <Box marginTop={1}>
              <Text color="#FF5555" bold>
                MESSAGE:{' '}
              </Text>
              <Text color="white">{this.state.error?.message}</Text>
            </Box>

            <Box marginTop={1} flexDirection="column">
              <Text color="#484F58" bold>
                STACK_TRACE_SUMMARY:
              </Text>
              <Text color="#484F58">
                {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
              </Text>
            </Box>
          </Box>

          <Box marginTop={2} flexDirection="column" alignItems="center">
            <Text color="#00E5FF" bold>
              {' '}
              RECOVERY_OPTIONS:{' '}
            </Text>
            <Text color="#8C959F"> ❯ Press Ctrl+C to terminate process </Text>
            <Text color="#8C959F"> ❯ Check .personal-cli/logs for detailed diagnostic data </Text>
          </Box>

          <Box marginTop={1} backgroundColor="#484F58" paddingX={1} alignSelf="center">
            <Text color="white"> KERNEL_HALTED: SYSTEM_STATE_PRESERVED </Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
