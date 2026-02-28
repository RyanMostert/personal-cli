#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from './app.js';
import { APP_NAME, APP_VERSION } from '@personal-cli/shared';

const program = new Command();

program
  .name(APP_NAME)
  .description('A multi-provider, token-efficient CLI AI agent')
  .version(APP_VERSION)
  .action(() => {
    // Need at least one provider key
    const hasKey =
      process.env.OPENCODE_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY;

    if (!hasKey) {
      console.error(
        'Error: No API key found.\n' +
        'Set one of: OPENCODE_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY',
      );
      process.exit(1);
    }

    const { unmount } = render(React.createElement(App), {
      exitOnCtrlC: false,
    });

    process.on('exit', () => unmount());
  });

program.parse(process.argv);
