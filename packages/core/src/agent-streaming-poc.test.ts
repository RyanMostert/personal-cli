import { describe, it, expect, vi } from 'vitest';

// Mock the 'ai' streamText to produce incremental text-delta parts
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    streamText: (opts: any) => {
      const fullStream = (async function* () {
        yield { type: 'text-delta', text: 'Hello' };
        // small async gap to simulate streaming
        await new Promise((r) => setTimeout(r, 5));
        yield { type: 'text-delta', text: ' world' };
        await new Promise((r) => setTimeout(r, 5));
        yield { type: 'finish', usage: { promptTokens: 1, completionTokens: 2 } };
      })();
      return {
        fullStream,
        response: Promise.resolve({ messages: [{ role: 'assistant', content: 'Hello world' }] }),
        usage: Promise.resolve({}),
      };
    },
  };
});

import { Agent } from './agent';

class FakeProviderManager {
  async getModel() {
    return { provider: 'fake', modelId: 'm1' } as any;
  }
  getActiveModel() {
    return { provider: 'fake', modelId: 'm1' } as any;
  }
  switchModel() {}
}

describe('Agent streaming POC integration', () => {
  it('yields incremental text-deltas and completes with finish', async () => {
    const pm = new FakeProviderManager();
    const agent = new Agent({ providerManager: pm, maxSteps: 1, tokenBudget: 1000 } as any);

    const events: any[] = [];
    for await (const e of agent.sendMessage('test streaming')) {
      events.push(e);
    }

    const textEvents = events.filter((ev) => ev.type === 'text-delta');
    const finishEvents = events.filter((ev) => ev.type === 'finish');

    expect(textEvents.length).toBeGreaterThanOrEqual(2);
    expect(textEvents[0].delta).toContain('Hello');
    expect(textEvents[1].delta).toContain(' world');
    expect(finishEvents.length).toBeGreaterThanOrEqual(1);

    const msgs = agent.getMessages();
    expect(msgs.some((m) => m.role === 'assistant' && m.content.includes('Hello world'))).toBeTruthy();
  });
});
