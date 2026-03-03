#!/usr/bin/env node
// Suppress Vercel AI SDK compatibility warnings (e.g. specificationVersion)
(globalThis as any).AI_SDK_LOG_WARNINGS = false;

// Prevent raw stack traces from leaking to the terminal — errors are displayed in the Ink UI
process.on('unhandledRejection', () => {});

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from './app.js';
import { OverlayProvider } from './context/OverlayContext.js';
import { APP_NAME, APP_VERSION } from '@personal-cli/shared';

const program = new Command();

program
  .name(APP_NAME)
  .description('A multi-provider, token-efficient CLI AI agent')
  .version(APP_VERSION)
  .action(() => {
    const { unmount } = render(
      React.createElement(OverlayProvider, { children: React.createElement(App) }),
      {
        exitOnCtrlC: false,
      }
    );

    process.on('exit', () => unmount());
  });

program.parse(process.argv);
