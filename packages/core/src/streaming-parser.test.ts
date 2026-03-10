import { describe, it, expect } from 'vitest';
import { parseStream } from './streaming-parser.js';

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of gen) {
    results.push(item);
  }
  return results;
}

async function* toAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    // Yield control to simulate async delivery
    await new Promise<void>((r) => setTimeout(r, 0));
    yield item;
  }
}

describe('parseStream', () => {
  it('normalises text-delta parts to TextDelta events', async () => {
    const parts = [
      { type: 'text-delta', text: 'Hello' },
      { type: 'text-delta', text: ' world' },
    ];
    const events = await collect(parseStream(toAsyncIterable(parts)));
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'text-delta', delta: 'Hello' });
    expect(events[1]).toEqual({ type: 'text-delta', delta: ' world' });
  });

  it('normalises text-delta using .delta field as fallback', async () => {
    const parts = [{ type: 'text-delta', delta: 'Fallback delta' }];
    const events = await collect(parseStream(toAsyncIterable(parts)));
    expect(events[0]).toEqual({ type: 'text-delta', delta: 'Fallback delta' });
  });

  it('emits incremental events in arrival order', async () => {
    const tokens = ['One', ' Two', ' Three', ' Four', ' Five'];
    const parts = tokens.map((t) => ({ type: 'text-delta', text: t }));
    const events = await collect(parseStream(toAsyncIterable(parts)));
    const deltas = events.map((e: any) => e.delta);
    expect(deltas).toEqual(tokens);
  });

  it('normalises thought-delta and reasoning-delta parts', async () => {
    const parts = [
      { type: 'thought-delta', text: 'Thinking...' },
      { type: 'reasoning-delta', reasoning: 'More thinking' },
    ];
    const events = await collect(parseStream(toAsyncIterable(parts)));
    expect(events[0]).toEqual({ type: 'thought-delta', delta: 'Thinking...' });
    expect(events[1]).toEqual({ type: 'thought-delta', delta: 'More thinking' });
  });

  it('normalises tool-call parts', async () => {
<<<<<<< HEAD
    const part = { type: 'tool-call', toolCallId: 'c1', toolName: 'run_command', args: { cmd: 'ls' } };
    const events = await collect(parseStream(toAsyncIterable([part])));
    expect(events[0]).toMatchObject({ type: 'tool-call-start', toolCall: { toolCallId: 'c1', toolName: 'run_command' } });
  });

  it('normalises tool-result parts', async () => {
    const part = { type: 'tool-result', toolCallId: 'c1', toolName: 'run_command', result: 'file1.ts' };
    const events = await collect(parseStream(toAsyncIterable([part])));
    expect(events[0]).toMatchObject({ type: 'tool-call-result', toolCall: { toolCallId: 'c1', result: 'file1.ts' } });
=======
    const part = {
      type: 'tool-call',
      toolCallId: 'c1',
      toolName: 'run_command',
      args: { cmd: 'ls' },
    };
    const events = await collect(parseStream(toAsyncIterable([part])));
    expect(events[0]).toMatchObject({
      type: 'tool-call-start',
      toolCall: { toolCallId: 'c1', toolName: 'run_command' },
    });
  });

  it('normalises tool-result parts', async () => {
    const part = {
      type: 'tool-result',
      toolCallId: 'c1',
      toolName: 'run_command',
      result: 'file1.ts',
    };
    const events = await collect(parseStream(toAsyncIterable([part])));
    expect(events[0]).toMatchObject({
      type: 'tool-call-result',
      toolCall: { toolCallId: 'c1', result: 'file1.ts' },
    });
>>>>>>> tools_improvement
  });

  it('normalises finish and step-finish parts', async () => {
    const parts = [
      { type: 'finish', usage: { promptTokens: 10, completionTokens: 5 } },
      { type: 'step-finish' },
    ];
    const events = await collect(parseStream(toAsyncIterable(parts)));
<<<<<<< HEAD
    expect(events[0]).toMatchObject({ type: 'finish', usage: { promptTokens: 10, completionTokens: 5 } });
=======
    expect(events[0]).toMatchObject({
      type: 'finish',
      usage: { promptTokens: 10, completionTokens: 5 },
    });
>>>>>>> tools_improvement
    expect(events[1]).toMatchObject({ type: 'finish' });
  });

  it('normalises error parts', async () => {
    const err = new Error('boom');
    const parts = [{ type: 'error', error: err }];
    const events = await collect(parseStream(toAsyncIterable(parts)));
    expect(events[0]).toEqual({ type: 'error', error: err });
  });

  it('coerces plain string parts to text-delta', async () => {
    const events = await collect(parseStream(toAsyncIterable(['hello' as any])));
    expect(events[0]).toEqual({ type: 'text-delta', delta: 'hello' });
  });

  it('coerces unknown objects with .text field to text-delta', async () => {
<<<<<<< HEAD
    const events = await collect(parseStream(toAsyncIterable([{ type: 'unknown', text: 'hi' } as any])));
=======
    const events = await collect(
      parseStream(toAsyncIterable([{ type: 'unknown', text: 'hi' } as any])),
    );
>>>>>>> tools_improvement
    expect(events[0]).toEqual({ type: 'text-delta', delta: 'hi' });
  });

  it('emits system event for truly unknown parts', async () => {
<<<<<<< HEAD
    const events = await collect(parseStream(toAsyncIterable([{ type: 'mystery', foo: 'bar' } as any])));
=======
    const events = await collect(
      parseStream(toAsyncIterable([{ type: 'mystery', foo: 'bar' } as any])),
    );
>>>>>>> tools_improvement
    expect(events[0]).toMatchObject({ type: 'system' });
    expect((events[0] as any).message).toContain('Unknown stream part');
  });

  it('yields events with async gaps (simulated streaming)', async () => {
    async function* delayedStream() {
      yield { type: 'text-delta', text: 'A' };
      await new Promise<void>((r) => setTimeout(r, 10));
      yield { type: 'text-delta', text: 'B' };
      await new Promise<void>((r) => setTimeout(r, 10));
      yield { type: 'finish', usage: {} };
    }

    const events = await collect(parseStream(delayedStream()));
    expect(events.filter((e) => e.type === 'text-delta')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'finish')).toHaveLength(1);
  });
});
