# personal-cli

personal-cli is a small command-line tool for personal automation and developer workflows.

## Overview

This repository contains the CLI used for common personal development tasks and integrations. It supports pluggable authentication/providers so you can add or switch providers as needed.

## GitHub Copilot Provider

This repository includes support for using GitHub Copilot as a provider for certain CLI features. The Copilot provider is optional and can be enabled via configuration.

Changes in the development branch `rm-dev/1-add-gh-copilot-as-provider` have introduced the Copilot provider implementation. The main branch README documents how to use and configure providers, including Copilot.

## Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/RyanMostert/personal-cli.git
cd personal-cli
# follow language/runtime specific install below (example for Node)
npm install
```

## Usage

Run the CLI:

```bash
# example command (replace with real commands for this project)
./bin/personal-cli --help
```

## Providers

The CLI supports multiple providers. To use GitHub Copilot provider:

1. Ensure the provider is configured (environment variables or config file).
2. Example environment variables:
   - `COPILOT_CLIENT_ID`
   - `COPILOT_CLIENT_SECRET`
3. Example config (YAML/JSON):
```yaml
provider: copilot
copilot:
  clientId: "<COPILOT_CLIENT_ID>"
  clientSecret: "<COPILOT_CLIENT_SECRET>"
```

If your project uses a different configuration format, adapt accordingly.

## Development

- Branching strategy: feature branches off `rm-dev/*` for experimental work, open PRs to `main` when ready.
- Run tests:

```bash
npm test
```

## Contributing

Contributions are welcome. Please follow the repository's contribution guidelines and open a PR for new features or bug fixes.

## Notes / TODO

- Add example config files for each provider in `examples/`
- Add integration tests for the Copilot provider authentication flow
- Document migration steps if switching providers

## License

Specify the license here (e.g., MIT).