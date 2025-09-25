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

  // Prioritize /etc/timezone, environment variable, then command-line argument
  // if /etc/timezone has a timezone, and is valid (isValidTimezone) start with that
  // if TZ env is set, and is valid (isValidTimezone), override with that
  // if command-line argument is set, and is valid (isValidTimezone), override with that
  const validSystemTz =
    systemTz && isValidTimezone(systemTz) ? new Timezone(systemTz) : undefined;
  const validConsoleTimezoneEnv =
    consoleTimezoneEnv && isValidTimezone(consoleTimezoneEnv)
      ? new Timezone(consoleTimezoneEnv)
      : undefined;
  const validConsoleTimezoneArgv = consoleTimezoneArgv
    ? new Timezone(consoleTimezoneArgv.split('=')[1])
    : undefined;

  const context = GlobalActiveContext.getInstance<
    string,
    IActiveContext<string>
  >();

  const timezone =
    validSystemTz ??
    validConsoleTimezoneEnv ??
    validConsoleTimezoneArgv ??
    context.adminTimezone;

  context.adminTimezone = timezone;
  return timezone;
}
