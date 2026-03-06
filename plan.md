# Personal-CLI Enhancement Roadmap

This document outlines the strategic plan for evolving Personal-CLI into a world-class AI-driven terminal workspace.

---

## 🛠️ Phases of Development

### 1. Enhanced Feedback for Long-Running Operations ✅
**Goal**: Make the user aware of running tasks, estimated duration, and system status.
- [x] **Global Activity Indicator**: Added a dynamic "SYSTEM_BUSY" line to the StatusBar showing active tool counts and streaming status.
- [x] **Compact Tool Stream**: Reworked `ToolCallView` to be cleaner and more modern, using subtle status icons (`⠶`, `✔`, `✖`) and `⎿` connectors.
- [x] **Live Durations**: Integrated real-time timers for each tool call to track execution speed.
- [x] **Interruption Support**: Added `/cancel` command and contextual `Ctrl+C` to abort active operations (Streaming or Tools).
- [ ] **Completion Notifications**: Optionally notify the user via OS notification when a background task finishes.

### 2. Drag-and-Drop & Modern Input Modalities ✅
**Goal**: Allow users to attach or input content via interactive methods.
- [x] **Terminal Drag-and-Drop**: PasteHandler now detects if a pasted/dropped string is a valid file path and attaches it automatically.
- [x] **Clipboard Integration**: Enhanced `PasteHandler` to support `Ctrl+V` for both base64 images and file paths.
- [x] **Input Preview**: Enhanced the `InputBox` with a "📦 INVENTORY:ATTACHMENTS" preview showing file icons, names, and sizes.

### 3. Natural Language Parsing & Workflow Flexibility ✅
**Goal**: Accept flexible, conversational input and predict user intentions.
- [x] **Intent Mapping**: Added a regex-based intent engine to map natural phrases like "attach file X" or "undo that" to CLI commands.
- [x] **Smart Suggestions**: Implemented a Levenshtein-based "Did you mean...?" system for misspelled commands.
- [ ] **Conversational Triggers**: Trigger `/clip` automatically if a user mentions "this screenshot".

### 4. External Tool & Editor Integration ✅
**Goal**: Connect the CLI to the user's wider development environment.
- [x] **External Editor Support**: Added `/edit [filename]` to open files in external editors (VS Code, Vim, or system default).
- [x] **Piping & Export**: Enhanced `/export` with clearer feedback and support for specific export paths.
- [ ] **OS Deep-Link**: Integrate with OS APIs for browsers, notes, and file explorers.

### 5. Plugin & Extension System ✅
**Goal**: Empower users to expand functionality without editing the core.
- [x] **Plugin API**: Exposed `loadPlugins` to the CLI and core agent, enabling dynamic discovery of external tools.
- [x] **Plugin Management**: Added `/plugins` command to list active extensions and their provided tools.
- [x] **Lifecycle Hooks**: Tools can now be injected from external JS modules in the `.personal-cli/plugins` directory.

### 6. Workspace & Session Syncing ✅
**Goal**: Make Personal-CLI state portable and persistent.
- [x] **Workspace Files**: Added `/workspace save` and `/workspace load` to persist the entire session state to `.pcli` files.
- [x] **Cloud Sync**: Added a simulated `/sync` command to harmonize local state with remote repositories.
- [ ] **Collaboration**: Shared workspaces for team-based AI interaction.

### 7. In-App Documentation & Reference Helpers ✅
**Goal**: Improve feature discoverability and onboarding.
- [ ] **Help Overlays**: Rich, navigable `/help` screens within the TUI.
- [x] **Contextual Tips**: Added activity-based suggestions to the StatusBar (e.g., tokens usage warnings).
- [x] **Interactive Autocomplete**: Enhanced the command menu with a "💡 INTELLIGENCE:HINT" preview for descriptions and examples.

### 8. UI Theming & Customization ✅
**Goal**: Let users personalize their terminal workspace.
- [x] **Preset Themes**: Added a "The Matrix" (Hacker) theme to the existing collection (Dracula, Nord, Tokyo Night, etc.).
- [ ] **Custom Themes**: Allow JSON-based theme definitions for colors, icons, and layout.
- [ ] **Live Preview**: Preview theme changes instantly before applying.

---

## 📈 Implementation Sequence
1. **Feedback & Input** (Done)
2. **Editor Integration & NLP** (Done)
3. **Plugin Architecture & Persistence** (Done)
4. **Polishing & Theming** (Done)

---

# Codebase Improvement Plan (2026-03)

## Overview
This plan addresses missing features and improvement areas identified in the latest codebase review. It focuses on onboarding, help overlays, error handling, clipboard/image support, usage tracking, telemetry, and code/documentation cleanup.

## Todos

1. **Onboarding & Help Flows**
   - [x] Implement a guided onboarding wizard for new users.
   - [x] Expand `/help` overlays with contextual tips and usage samples.
   - [x] Add explicit onboarding documentation and quickstart guides.

2. **Clipboard/Image Support**
   - [x] Complete TODOs in `useClipboardImage.ts` to support more image types and clipboard formats.
   - [x] Add error handling and user feedback for unsupported formats.

3. **Error Handling & Reliability**
   - [x] Audit all modules for minimal or missing error handling (e.g., empty catch blocks).
   - [x] Standardize error reporting and user-facing error messages.

4. **Usage Tracking & Telemetry**
   - [x] Implement usage tracking and auto-compaction features as planned.
   - [x] Add telemetry/monitoring with user opt-in and clear privacy documentation.

5. **Documentation & Code Cleanup**
   - [x] Update and expand documentation for all major features and flows.
   - [x] Remove legacy/untracked directories and files as noted in review feedback.
   - [x] Address all TODOs and FIXMEs in code and docs.

## Notes
- Prioritize onboarding/help and error handling for immediate user impact.
- Reference `plan.md`, `future_plan.md`, and review feedback files for additional context.
- Track progress using the todos table and update this plan as work proceeds.
