interface IntentPattern {
  pattern: RegExp;
  cmd: string;
  getArgs?: (match: RegExpMatchArray) => string;
}

const INTENT_MAP: IntentPattern[] = [
  { pattern: /^(attach|add)\s+file\s+(.+)$/i, cmd: '/add', getArgs: (m) => m[2] },
  // Only match /open with actual file paths (with extensions or path separators), not git commands
  { pattern: /^(show|open)\s+(\S+\.\S+|\S+\/|\.\/?\S+)$/i, cmd: '/open', getArgs: (m) => m[2] },
  { pattern: /^(undo|revert)(\s+that)?$/i, cmd: '/undo' },
  { pattern: /^(redo|repeat)(\s+that)?$/i, cmd: '/redo' },
  { pattern: /^(clear|reset)\s+chat$/i, cmd: '/clear' },
  { pattern: /^(exit|quit|stop)$/i, cmd: '/exit' },
  { pattern: /^(cancel|halt|stop)\s+(it|operation|ai)$/i, cmd: '/cancel' },
  { pattern: /^(switch|change)\s+(to\s+)?mode\s+(.+)$/i, cmd: '/mode', getArgs: (m) => m[3] },
  { pattern: /^(switch|change)\s+(to\s+)?model\s+(.+)$/i, cmd: '/model', getArgs: (m) => m[3] },
];

export function tryMatchIntent(input: string): { cmd: string; args: string } | null {
  const trimmed = input.trim();
  for (const intent of INTENT_MAP) {
    const match = trimmed.match(intent.pattern);
    if (match) {
      return {
        cmd: intent.cmd,
        args: intent.getArgs ? intent.getArgs(match) : '',
      };
    }
  }
  return null;
}
