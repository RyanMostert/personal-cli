import { describe, it, expect } from 'vitest';
import { createThoughtParsingTransform } from './thought-transform.js';

describe('createThoughtParsingTransform', () => {
  async function readAll(reader: ReadableStreamDefaultReader) {
    const results = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      results.push(value);
    }
    return results;
  }

  it('should pass through non-text chunks', async () => {
    const transform = createThoughtParsingTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    const writePromise = (async () => {
      await writer.write({ type: 'tool-call', name: 'test' });
      await writer.close();
    })();

    const results = await readAll(reader);
    await writePromise;

    expect(results).toEqual([{ type: 'tool-call', name: 'test' }]);
  });

  it('should pass through normal text', async () => {
    const transform = createThoughtParsingTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    const writePromise = (async () => {
      await writer.write({ type: 'text-delta', text: 'Hello ' });
      await writer.write({ type: 'text-delta', text: 'world' });
      await writer.close();
    })();

    const results = await readAll(reader);
    await writePromise;

    expect(results).toEqual([
      { type: 'text-delta', text: 'Hello ' },
      { type: 'text-delta', text: 'world' },
    ]);
  });

  it('should parse complete thought tags into reasoning events', async () => {
    const transform = createThoughtParsingTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    const writePromise = (async () => {
      await writer.write({ type: 'text-delta', text: 'Here is my ' });
      await writer.write({
        type: 'text-delta',
        text: '<thought>internal process</thought>',
      });
      await writer.write({ type: 'text-delta', text: ' plan.' });
      await writer.close();
    })();

    const results = await readAll(reader);
    await writePromise;

    expect(results).toEqual([
      { type: 'text-delta', text: 'Here is my ' },
      { type: 'reasoning-start', id: 'parsed-thought' },
      {
        type: 'reasoning-delta',
        text: 'internal process',
        id: 'parsed-thought',
      },
      { type: 'reasoning-end', id: 'parsed-thought' },
      { type: 'text-delta', text: ' plan.' },
    ]);
  });

  it('should handle unclosed thought tags', async () => {
    const transform = createThoughtParsingTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    const writePromise = (async () => {
      await writer.write({ type: 'text-delta', text: '<thought>' });
      await writer.write({ type: 'text-delta', text: 'incomplete' });
      await writer.close();
    })();

    const results = await readAll(reader);
    await writePromise;

    expect(results).toEqual([
      { type: 'reasoning-start', id: 'parsed-thought' },
      { type: 'reasoning-delta', text: 'incomplete', id: 'parsed-thought' },
      { type: 'reasoning-end', id: 'parsed-thought' },
    ]);
  });
});
