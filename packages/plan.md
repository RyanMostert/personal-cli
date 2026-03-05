# Missing Features Plan: CLI AI Agent Enhancement

_Last updated: 2026-03-05 09:57_

## Goal

Finalize and polish the CLI experience for your AI agent, ensuring parity with (or surpassing) top AI CLI tools for usability, guidance, and output streaming/feedback.

---

## Still Missing—Features To Implement

### 1. Attachment User Feedback and Preview ✅ _Done in cli/src/components/AttachmentPreview.tsx_

- Echoed attached files/images before running with type, size, path
- Text files: Show first 5 lines
- Images: Print dimensions if present
- Graceful error/warning UI for missing/unreadable/unsupported files

### 2. Inline Attachment Rendering in Output

- **Render image/file attachments inline** in streamed chat history and tool responses:
  - Use markdown for images when supported by the terminal or indicate with a clear placeholder (e.g. ‘[image: diagram.png]’).
  - For files, show name, size, and preview or link (as supported).

### 3. Enhanced Streaming and Output Experience

- **Token-by-token/live output streaming:**
  - Show incremental AI output in CLI as it is generated (like gemini-cli and ChatGPT).
- **Spinner/progress feedback:**
  - During agent response or tool runs, show clear in-progress indicators, spinners, or status messages.
- **Interrupt support:**
  - Allow user to cancel or halt long responses (with Ctrl+C or similar).

### 4. CLI Attachment Remove/Replace (Optional Bonus)

- **Attachment lifecycle:**
  - Allow user to remove last or all attachments before sending prompt, via a simple CLI flag or confirmation step.

### 5. Further Tool Fallback & Summary Messaging

- **Always summarize tool results:**
  - After fallback/tool output, print a concise summary for the user, not just raw tool output.
  - If fallback fails, show next best path or guidance (e.g. “Try different file”/“Try again later”).

### 6. Documentation and Onboarding Updates

- **CLI `/help` and onboarding:**
  - Add explicit usage samples for attachment, streaming, error handling, and tool/plugin features.
  - Guide users to new features on first launch or after update.
  - Add troubleshooting section for common attachment errors.

---

## Checklist

- [ ] Echo and preview for all CLI file/image attachments
- [ ] Inline rendering of attachments in streamed chat output
- [ ] Token-by-token streaming for AI and tool responses
- [ ] Progress/spinner and cancelation
- [ ] Summary after each tool/fallback
- [ ] User-friendly error/warning system
- [ ] `/help` and onboarding for all new features
- [ ] (Optional) CLI remove/replace attachments pre-send

---

## References

- [gemini-cli](https://github.com/google-gemini/gemini-cli) for attachment flags, streaming, CLI UX
- [opencode](https://github.com/anomalyco/opencode) for polish and preview/feedback patterns

---

**Implementing these will bring your CLI to leader-level usability for AI/LLM-based workflows!**
