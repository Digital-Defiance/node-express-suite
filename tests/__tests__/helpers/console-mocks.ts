export function withConsoleMocks<T>(fn: () => T): T {
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();

  try {
    return fn();
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
    console.log = originalLog;
  }
}
