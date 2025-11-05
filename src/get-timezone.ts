import {
  GlobalActiveContext,
  IActiveContext,
  isValidTimezone,
} from '@digitaldefiance/i18n-lib';
import { existsSync, readFileSync } from 'fs';
import type { Timezone as TimezoneType } from '@digitaldefiance/i18n-lib';

// Helper to create Timezone from the same module instance as GlobalActiveContext
function createTimezone(tz: string): TimezoneType {
  const context = GlobalActiveContext.getInstance<string, IActiveContext<string>>();
  // Get the Timezone constructor from the existing timezone object
  const TimezoneConstructor = context.adminTimezone.constructor as any;
  return new TimezoneConstructor(tz);
}

export function setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv(): string {
  const systemTz = existsSync('/etc/timezone')
    ? readFileSync('/etc/timezone', 'utf8').trim()
    : undefined;
  const consoleTimezoneEnv = process.env['TZ'];
  const consoleTimezoneArgv = process.argv.find((arg) =>
    arg.startsWith('--timezone='),
  );

  // Prioritize command-line argument, then environment variable, then /etc/timezone
  // if command-line argument is set, and is valid (isValidTimezone), use that
  // if TZ env is set, and is valid (isValidTimezone), use that
  // if /etc/timezone has a timezone, and is valid (isValidTimezone) use that
  const validSystemTz =
    systemTz && isValidTimezone(systemTz) ? systemTz : undefined;
  const validConsoleTimezoneEnv =
    consoleTimezoneEnv && isValidTimezone(consoleTimezoneEnv)
      ? consoleTimezoneEnv
      : undefined;
  const argValue = consoleTimezoneArgv?.split('=')[1];
  const validConsoleTimezoneArgv =
    argValue && isValidTimezone(argValue) ? argValue : undefined;

  const context = GlobalActiveContext.getInstance<
    string,
    IActiveContext<string>
  >();

  const timezoneStr =
    validConsoleTimezoneArgv ??
    validConsoleTimezoneEnv ??
    validSystemTz ??
    context.adminTimezone.value;

  const finalTimezone = timezoneStr ?? 'UTC';
  context.adminTimezone = createTimezone(finalTimezone);
  return finalTimezone;
}
