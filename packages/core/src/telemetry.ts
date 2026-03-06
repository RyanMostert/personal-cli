import { homedir } from 'os';
import { join } from 'path';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { getTelemetryEnabled } from './config/prefs.js';

const TELEMETRY_DIR = join(homedir(), '.personal-cli');
const TELEMETRY_FILE = join(TELEMETRY_DIR, 'telemetry.log');

export interface TelemetryEvent {
  event: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: number;
}

export function trackEvent(event: string, properties?: Record<string, string | number | boolean>) {
  if (!getTelemetryEnabled()) return;

  try {
    if (!existsSync(TELEMETRY_DIR)) {
      mkdirSync(TELEMETRY_DIR, { recursive: true });
    }

    const payload: TelemetryEvent = {
      event,
      properties,
      timestamp: Date.now(),
    };

    appendFileSync(TELEMETRY_FILE, JSON.stringify(payload) + '\n', 'utf-8');
  } catch (err) {
    // Silently fail to avoid interrupting the user experience
  }
}
