export function withConsoleMocks(fn: () => void): void {
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();

  try {
    fn();
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
    console.log = originalLog;
  }
}
