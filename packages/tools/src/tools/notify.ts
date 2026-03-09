import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';

/** Emit a terminal bell character to the current process stdout. */
function terminalBell(): void {
  process.stdout.write('\x07');
}

/** Attempt an OS-level notification silently — never throws. */
function osNotify(title: string, body: string): void {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      const script = `display notification "${body.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`;
      exec(`osascript -e '${script}'`, { timeout: 3000 });
    } else if (platform === 'linux') {
      exec(`notify-send "${title.replace(/"/g, '\\"')}" "${body.replace(/"/g, '\\"')}"`, {
        timeout: 3000,
      });
    } else if (platform === 'win32') {
      // PowerShell toast notification — works without admin rights on Win10+
      const ps =
        `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null;` +
        `$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);` +
        `$template.SelectSingleNode('//text[@id=1]').InnerText = '${title.replace(/'/g, "''")}';` +
        `$template.SelectSingleNode('//text[@id=2]').InnerText = '${body.replace(/'/g, "''")}';` +
        `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('personal-cli').Show((New-Object -TypeName Windows.UI.Notifications.ToastNotification -ArgumentList $template));`;
      exec(`powershell -Command "${ps}"`, { timeout: 5000 });
    }
  } catch {
    // Silent — OS notify is best-effort
  }
}

export type NotifyCallback = (
  title: string,
  body: string,
  level: 'info' | 'success' | 'warning' | 'error',
) => void;

export function createNotifyUser(onNotify?: NotifyCallback) {
  return tool({
    description:
      'Notify the user that a long-running task has completed. Emits a terminal bell, flashes the status bar, and optionally shows an OS-level desktop notification.',
    inputSchema: z.object({
      title: z.string().describe('Short title, e.g. "Build complete" or "Tests passed"'),
      body: z.string().optional().describe('Optional detail message'),
      level: z
        .enum(['info', 'success', 'warning', 'error'])
        .optional()
        .default('info')
        .describe('Severity — affects status bar flash color'),
      osNotify: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, also shows a desktop OS notification (requires notify-send / osascript / PowerShell)',
        ),
    }),
    execute: async ({ title, body, level, osNotify: doOsNotify }) => {
      // Always ring the terminal bell
      terminalBell();

      // OS notification (opt-in)
      if (doOsNotify) {
        osNotify(title, body ?? title);
      }

      // Notify TUI via callback (StatusBar can intercept this to flash)
      if (onNotify) {
        onNotify(title, body ?? '', level ?? 'info');
      }

      return {
        output: `Notification sent: [${(level ?? 'info').toUpperCase()}] ${title}${body ? ` — ${body}` : ''}`,
        level,
      };
    },
  });
}
