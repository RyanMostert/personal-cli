#!/usr/bin/env node
// Ensure we always run with a larger V8 heap — re-exec with --max-old-space-size if not already set.
if (!process.env.__PCLI_HEAPED__) {
  const { spawnSync } = await import('child_process');
  process.env.__PCLI_HEAPED__ = '1';
  const result = spawnSync(process.execPath, ['--max-old-space-size=8192', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status ?? 0);
}

// Suppress Vercel AI SDK compatibility warnings (e.g. specificationVersion)
(globalThis as any).AI_SDK_LOG_WARNINGS = false;

// Prevent raw stack traces from leaking to the terminal — errors are displayed in the Ink UI
process.on('unhandledRejection', () => {});

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from './app.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { OverlayProvider } from './context/OverlayContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { APP_NAME, APP_VERSION } from '@personal-cli/shared';

const program = new Command();

program
  .name(APP_NAME)
  .description('A multi-provider, token-efficient CLI AI agent')
  .version(APP_VERSION)
  .option('-f, --file <path>', 'attach a file to the conversation (can be used multiple times)', collect, [])
  .option('-i, --image <path>', 'attach an image to the conversation (can be used multiple times)', collect, [])
  .action(async (options) => {
    // Process attached files from CLI arguments
    const attachments: Array<{ path: string; type: 'file' | 'image' }> = [];

    for (const filePath of options.file) {
      attachments.push({ path: filePath, type: 'file' });
    }

    for (const imagePath of options.image) {
      attachments.push({ path: imagePath, type: 'image' });
    }

    const { unmount, waitUntilExit } = render(
      React.createElement(ErrorBoundary, {
        children: React.createElement(ThemeProvider, {
          children: React.createElement(OverlayProvider, {
            children: React.createElement(App, { initialAttachments: attachments }),
          }),
        }),
      }),
      {
        exitOnCtrlC: false,
      },
    );

    await waitUntilExit();
    unmount();
    process.exit(0);
  });

// Helper to collect multiple values for an option
function collect(value: string, previous: string[]) {
  return previous.concat([value]);
}

process.on('uncaughtException', (error) => {
  console.error('\n\n [!] UNCAUGHT_EXCEPTION_DETECTED');
  console.error(error);
  process.exit(1);
});

program.parse(process.argv);
