import type { StreamEvent, TextDelta, ThoughtDelta, ToolCallStart, ToolCallResult, SystemEvent, FinishEvent, ErrorEvent } from './streaming-protocol';

// Lightweight parser that maps provider stream "parts" to StreamEvent values.
// This is intentionally conservative for a first pass: it forwards structured
// stream parts when they already provide intent, and normalizes common shapes.

export async function* parseStream<T = any>(asyncIterable: AsyncIterable<T>): AsyncGenerator<StreamEvent> {
  // Accumulate streamed tool-input-delta chunks per tool call (AI SDK v6+)
  const toolInputBuffers = new Map<string, { toolName: string; argsJson: string }>();
  // Track IDs already emitted via tool-input-end to skip the legacy tool-call duplicate
  const emittedToolCallIds = new Set<string>();

  for await (const part of asyncIterable as AsyncIterable<any>) {
    try {
      const t = part?.type;
      switch (t) {
        // ── Silent no-ops (lifecycle markers, no UI value) ──────────────────
        case 'start':
        case 'start-step':
        case 'text-start':
        case 'text-end':
          break;

        case 'text-delta': {
          const delta = part.text ?? part.delta ?? '';
          yield { type: 'text-delta', delta } as TextDelta;
          break;
        }
        case 'reasoning-delta':
        case 'thought-delta': {
          const delta = (part.reasoning as string) ?? (part.text as string) ?? (part.delta as string) ?? '';
          yield { type: 'thought-delta', delta } as ThoughtDelta;
          break;
        }

        // ── AI SDK v4 legacy tool events (kept for backwards compat) ─────────
        case 'tool-call': {
          const id = part.toolCallId ?? part.id ?? String(Date.now());
          // Skip if already emitted by the v6 tool-input-end handler
          if (emittedToolCallIds.has(id)) break;
          const toolCall = {
            toolCallId: id,
            toolName: part.toolName ?? part.recipient_name ?? 'unknown',
            args: part.args ?? part.input ?? undefined,
          };
          emittedToolCallIds.add(id);
          yield { type: 'tool-call-start', toolCall } as ToolCallStart;
          break;
        }
        case 'tool-result': {
          const toolCall = {
            toolCallId: part.toolCallId ?? part.id ?? String(Date.now()),
            toolName: part.toolName ?? part.recipient_name ?? 'unknown',
            result: part.result ?? part.output ?? undefined,
          };
          yield { type: 'tool-call-result', toolCall } as ToolCallResult;
          break;
        }

        // ── AI SDK v6 streaming tool-call protocol ───────────────────────────
        case 'tool-input-start': {
          const id = part.toolCallId ?? part.id ?? String(Date.now());
          toolInputBuffers.set(id, { toolName: part.toolName ?? 'unknown', argsJson: '' });
          break;
        }
        case 'tool-input-delta': {
          const id = part.toolCallId ?? part.id;
          if (id && toolInputBuffers.has(id)) {
            toolInputBuffers.get(id)!.argsJson += part.inputTextDelta ?? part.delta ?? '';
          }
          break;
        }
        case 'tool-input-end': {
          const id = part.toolCallId ?? part.id;
          if (id && toolInputBuffers.has(id)) {
            const buf = toolInputBuffers.get(id)!;
            toolInputBuffers.delete(id);
            let args: Record<string, unknown> | undefined;
            try { args = JSON.parse(buf.argsJson); } catch { /* leave undefined */ }
            emittedToolCallIds.add(id);
            yield {
              type: 'tool-call-start',
              toolCall: { toolCallId: id, toolName: buf.toolName, args },
            } as ToolCallStart;
          }
          break;
        }

        case 'system': {
          const message = part.message ?? part.text ?? String(part);
          yield { type: 'system', message } as SystemEvent;
          break;
        }
        case 'finish':
        case 'finish-step':
        case 'step-finish': {
          const usage = (part as any).usage ?? (part as any).usageInfo ?? undefined;
          yield { type: 'finish', usage } as FinishEvent;
          break;
        }
        case 'error': {
          yield { type: 'error', error: part.error ?? part } as ErrorEvent;
          break;
        }
        default: {
          // Unknown part types: try to coerce to text-delta when possible
          if (typeof part === 'string') {
            yield { type: 'text-delta', delta: part } as TextDelta;
          } else if (part?.text) {
            yield { type: 'text-delta', delta: part.text } as TextDelta;
          }
          // Silently drop truly unknown parts (no system message noise)
          break;
        }
      }
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err : String(err) } as ErrorEvent;
    }
  }
}
