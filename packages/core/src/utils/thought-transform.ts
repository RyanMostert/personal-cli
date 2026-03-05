/**
 * Transforms a stream to parse <thought>...</thought> tags and emit them as
 * separate reasoning-delta events, similar to how native reasoning models work.
 */
export function createThoughtParsingTransform() {
  let buffer = '';
  let inThought = false;

  return new TransformStream<
    {
      type: string;
      text?: string;
      [key: string]: any;
    },
    {
      type: string;
      text?: string;
      [key: string]: any;
    }
  >({
    transform(chunk, controller) {
      // Only process text-delta chunks
      if (chunk.type !== 'text-delta' || !chunk.text) {
        controller.enqueue(chunk);
        return;
      }

      buffer += chunk.text;

      // Process complete thoughts from buffer
      while (true) {
        if (!inThought) {
          // Look for opening tag
          const openIdx = buffer.indexOf('<thought>');
          if (openIdx === -1) {
            // No thought tag, emit all as text
            if (buffer) {
              controller.enqueue({ type: 'text-delta', text: buffer });
              buffer = '';
            }
            break;
          }

          // Emit text before thought
          if (openIdx > 0) {
            controller.enqueue({
              type: 'text-delta',
              text: buffer.slice(0, openIdx),
            });
          }

          // Enter thought mode
          buffer = buffer.slice(openIdx + 9); // Remove '<thought>'
          inThought = true;

          // Emit reasoning-start
          controller.enqueue({ type: 'reasoning-start', id: 'parsed-thought' });
        } else {
          // We're in a thought, look for closing tag
          const closeIdx = buffer.indexOf('</thought>');
          if (closeIdx === -1) {
            // Thought continues, emit as reasoning-delta
            if (buffer) {
              controller.enqueue({
                type: 'reasoning-delta',
                text: buffer,
                id: 'parsed-thought',
              });
              buffer = '';
            }
            break;
          }

          // Emit thought content
          if (closeIdx > 0) {
            controller.enqueue({
              type: 'reasoning-delta',
              text: buffer.slice(0, closeIdx),
              id: 'parsed-thought',
            });
          }

          // Emit reasoning-end
          controller.enqueue({ type: 'reasoning-end', id: 'parsed-thought' });

          // Exit thought mode
          buffer = buffer.slice(closeIdx + 10); // Remove '</thought>'
          inThought = false;
        }
      }
    },

    flush(controller) {
      // Flush remaining buffer
      if (buffer) {
        if (inThought) {
          // Unclosed thought - emit as reasoning
          controller.enqueue({
            type: 'reasoning-delta',
            text: buffer,
            id: 'parsed-thought',
          });
          controller.enqueue({ type: 'reasoning-end', id: 'parsed-thought' });
        } else if (buffer.includes('<thought>')) {
          const openIdx = buffer.indexOf('<thought>');
          if (openIdx > 0) {
            controller.enqueue({
              type: 'text-delta',
              text: buffer.slice(0, openIdx),
            });
          }
          controller.enqueue({ type: 'reasoning-start', id: 'parsed-thought' });
          const content = buffer.slice(openIdx + 9);
          if (content) {
            controller.enqueue({
              type: 'reasoning-delta',
              text: content,
              id: 'parsed-thought',
            });
          }
          controller.enqueue({ type: 'reasoning-end', id: 'parsed-thought' });
        } else {
          // Regular text
          controller.enqueue({ type: 'text-delta', text: buffer });
        }
        buffer = '';
      } else if (inThought) {
        controller.enqueue({ type: 'reasoning-end', id: 'parsed-thought' });
      }
    },
  });
}
