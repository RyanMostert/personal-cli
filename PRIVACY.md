# Privacy & Data Handling

Personal-CLI is designed with your privacy in mind.

## 1. Code and Data
Your code, conversations, and files are **never** collected or analyzed by the creators of Personal-CLI.
- Messages and context are sent *directly* to the LLM provider you configure (e.g. OpenAI, Anthropic, or local endpoints like Ollama).
- All session history, cache, and preferences are stored entirely locally on your machine in `~/.personal-cli/`.

## 2. Telemetry
Personal-CLI includes **opt-in** basic usage telemetry to help guide future development. 

**If enabled:**
- We log only high-level actions (e.g., "command_run: /model").
- **No** PII, source code, file paths, or conversation content is recorded.
- Telemetry data is currently saved locally to `~/.personal-cli/telemetry.log`.

**To toggle telemetry:**
- Run `/telemetry on` to enable.
- Run `/telemetry off` to disable.
- Run `/telemetry` to check your current status.
