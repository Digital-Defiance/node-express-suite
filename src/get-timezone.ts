import {
  GlobalActiveContext,
  IActiveContext,
  isValidTimezone,
  Timezone,
} from '@digitaldefiance/i18n-lib';
import { existsSync, readFileSync } from 'fs';

export function setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv(): Timezone {
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
    systemTz && isValidTimezone(systemTz) ? new Timezone(systemTz) : undefined;
  const validConsoleTimezoneEnv =
    consoleTimezoneEnv && isValidTimezone(consoleTimezoneEnv)
      ? new Timezone(consoleTimezoneEnv)
      : undefined;
  const argValue = consoleTimezoneArgv?.split('=')[1];
  const validConsoleTimezoneArgv =
    argValue && isValidTimezone(argValue) ? new Timezone(argValue) : undefined;

  const context = GlobalActiveContext.getInstance<
    string,
    IActiveContext<string>
  >();

  const timezone =
    validConsoleTimezoneArgv ??
    validConsoleTimezoneEnv ??
    validSystemTz ??
    context.adminTimezone;

  context.adminTimezone = timezone;
  return timezone;
}
