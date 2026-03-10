export const OPENCODE_BASE_URL = 'https://opencode.ai/zen/v1';

export function createPingFilterFetch(): typeof globalThis.fetch {
  const filterPingsFetch: typeof globalThis.fetch = async (url, init) => {
    const res = await globalThis.fetch(url as RequestInfo, init as RequestInit);
    if (!res.body || res.status !== 200) return res;

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/event-stream')) return res;

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const payload = trimmed.slice(5).trim();
            try {
              const parsed = JSON.parse(payload);
              if (parsed?.type === 'ping') continue;
            } catch {
              // Not JSON or partial JSON, keep it
            }
          }
          ctrl.enqueue(encoder.encode(line + '\n'));
        }
      },
      flush(ctrl) {
        if (buffer) {
          ctrl.enqueue(encoder.encode(buffer));
        }
      },
    });

    return new Response(res.body.pipeThrough(transform), {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  };

  return filterPingsFetch;
}
