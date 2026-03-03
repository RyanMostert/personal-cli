# Fix: isStreaming stuck + Escape abort + Duplicate model keys

## Bug 1 — `isStreaming` never clears (root cause of all streaming issues)

**File**: `packages/cli/src/hooks/useAgent.ts`

`sendMessage` has a `for await` loop over the agent stream, but there is **no code after the loop** to set `isStreaming: false`. The only place `isStreaming: false` is set is in the `catch` block. On any successful completion (including after abort), the loop simply exits and the UI stays stuck in `⠇ COMPUTING...` forever.

```typescript
// Current — nothing runs after the loop:
for await (const event of stream) {
  if (event.type === 'text-delta') ...
}
// ← isStreaming never cleared here
```

**Fix**: After the `for await` loop, always clear streaming state and sync messages from the agent.

Also the loop only handles `text-delta`. It silently drops:
- `type: 'error'` events (yielded by agent on error — the catch block never fires because the generator yields errors rather than throwing)
- `type: 'tool-call-start'` / `type: 'tool-call-result'` (tool calls never appear in UI after stream starts)
- `type: 'finish'` (token counts never updated)

### Fixed `sendMessage` in `useAgent.ts`:

```typescript
const sendMessage = useCallback(async (content: string) => {
  const agent = getAgent();
  const currentAttachedFiles = attachedFilesRef.current;
  attachedFilesRef.current = [];

  setStreamingText('');
  setState((prev) => ({ ...prev, isStreaming: true, error: null, toolCalls: [], attachedFiles: [] }));

  try {
    const stream = agent.sendMessage(content, currentAttachedFiles);

    for await (const event of stream) {
      switch (event.type) {
        case 'text-delta':
          if (event.delta) setStreamingText((prev) => prev + event.delta);
          break;
        case 'tool-call-start':
          setState((prev) => ({
            ...prev,
            toolCalls: [...prev.toolCalls, {
              toolCallId: event.toolCall.toolCallId,
              toolName: event.toolCall.toolName,
              args: event.toolCall.args,
            }],
          }));
          break;
        case 'tool-call-result':
          setState((prev) => ({
            ...prev,
            toolCalls: prev.toolCalls.map(tc =>
              tc.toolCallId === event.toolCall.toolCallId
                ? { ...tc, result: event.toolCall.result }
                : tc
            ),
          }));
          break;
        case 'error':
          throw event.error; // re-throw so catch block handles it
      }
    }

    // Stream completed (normally OR after abort) — always runs
    setState((prev) => ({
      ...prev,
      isStreaming: false,
      messages: agent.getMessages(),
      tokensUsed: agent.getTokensUsed(),
      cost: agent.getCost(),
      toolCalls: [],
    }));
    setStreamingText('');

  } catch (err) {
    setStreamingText('');
    setState((prev) => ({
      ...prev,
      isStreaming: false,
      toolCalls: [],
      error: err instanceof Error ? err.message : String(err),
    }));
  }
}, [getAgent]);
```

---

## Bug 2 — Escape key has no visible effect (caused by Bug 1)

The `abort()` call in `app.tsx` fires correctly, the agent catches the `AbortError` and yields a `finish` event, the generator returns, the `for await` loop exits. But since Bug 1 means `isStreaming` is never cleared, the UI never updates. Fixing Bug 1 fixes this.

One additional issue: `app.tsx` checks `key.escape && isStreaming` but the Escape key handler is deep in `useInput`. Since `isStreaming` locks the `InputBox` (`isDisabled={anyOverlay}` where `anyOverlay` includes `isStreaming`), and `useInput` fires on all keys regardless of InputBox focus — this should work. Verify after Bug 1 is fixed.

---

## Bug 3 — Duplicate React keys in ModelPicker

**File**: `packages/cli/src/components/ModelPicker.tsx`

The `rows` array contains models from two sources:
1. The "★ Recent" section — same `ModelEntry` objects from `MODEL_REGISTRY`
2. The regular per-provider sections — same objects again

Both render with key `m-${m.provider}-${m.id}` (line 265). If a model is in both sections, the key collides.

**Fix**: Prefix recent section row keys with `recent-`:

```tsx
// In the rows render, where recent models are rendered:
<Box key={`recent-m-${m.provider}-${m.id}`} ...>

// Regular provider sections keep their key:
<Box key={`m-${m.provider}-${m.id}`} ...>
```

The rows array mixes both via a `kind` field. The render loop needs to know which section a row belongs to. Simplest fix: add a `recent?: boolean` field to the `RowModel` type and use it in the key.

---

## Summary

| File | Fix |
|------|-----|
| `packages/cli/src/hooks/useAgent.ts` | After `for await` loop: set `isStreaming: false`, sync messages/tokens. Handle all event types in loop. |
| `packages/cli/src/components/ModelPicker.tsx` | Prefix recent-section row keys with `recent-` to prevent collisions. |

---

## Progress Checklist

- [x] Bug 1+2: Fix `sendMessage` in `useAgent.ts`
- [x] Bug 3: Fix duplicate keys in `ModelPicker.tsx`
