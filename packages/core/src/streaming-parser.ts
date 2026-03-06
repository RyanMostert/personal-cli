import type { StreamEvent, TextDelta, ThoughtDelta, ToolCallStart, ToolCallResult, SystemEvent, FinishEvent, ErrorEvent } from './streaming-protocol';

// Lightweight parser that maps provider stream "parts" to StreamEvent values.
// This is intentionally conservative for a first pass: it forwards structured
// stream parts when they already provide intent, and normalizes common shapes.

export async function* parseStream<T = any>(asyncIterable: AsyncIterable<T>): AsyncGenerator<StreamEvent> {
  for await (const part of asyncIterable as AsyncIterable<any>) {
    try {
      const t = part?.type;
      switch (t) {
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
        case 'tool-call': {
          const toolCall = {
            toolCallId: part.toolCallId ?? part.id ?? String(Date.now()),
            toolName: part.toolName ?? part.recipient_name ?? 'unknown',
            args: part.args ?? part.input ?? undefined,
          };
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
        case 'system': {
          const message = part.message ?? part.text ?? String(part);
          yield { type: 'system', message } as SystemEvent;
          break;
        }
        case 'finish':
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
          } else {
            // Emit as system message for visibility
            yield { type: 'system', message: `Unknown stream part: ${JSON.stringify(part).slice(0, 200)}` } as SystemEvent;
          }
          break;
        }
      }
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err : String(err) } as ErrorEvent;
    }
  }
}
