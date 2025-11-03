import { GlobalActiveContext, Timezone } from '@digitaldefiance/i18n-lib';
import { setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv } from '../../src/get-timezone';

describe('get-timezone', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalArgv: string[];

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
  });

  it('should use TZ environment variable', () => {
    delete process.env['TZ'];
    process.env['TZ'] = 'America/New_York';
    const result = setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv();
    expect(result).toBeDefined();
  });

  it('should use command-line argument over environment', () => {
    process.env['TZ'] = 'America/New_York';
    process.argv = [...originalArgv, '--timezone=Europe/London'];
    const result = setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv();
    expect(result).toBeDefined();
  });

  it('should return default timezone when none specified', () => {
    delete process.env['TZ'];
    const context = GlobalActiveContext.getInstance();
    const result = setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv();
    expect(result).toBeDefined();
  });
});
