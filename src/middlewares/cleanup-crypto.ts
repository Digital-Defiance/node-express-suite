import { NextFunction, Request, Response } from 'express';

/**
 * Middleware to clean up crypto resources after request completion
 * Should be used after crypto operations to ensure private keys are disposed
 */
export function cleanupCrypto(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Store original end function
  const originalEnd = res.end;

  // Override end function to cleanup before response
  const wrappedEnd = function (this: Response, ...args: unknown[]) {
    // Cleanup eciesUser if it exists
    if (req.eciesUser) {
      try {
        // Dispose of sensitive cryptographic material
        req.eciesUser.dispose();
        req.eciesUser = undefined;
      } catch (error) {
        console.error('Error cleaning up crypto resources:', error);
      }
    }
    // Do not dispose system user here; it may be a process-wide singleton

    // Call original end function
    // Type assertion needed because we're wrapping the end function
    return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
  } as typeof res.end;

  res.end = wrappedEnd;

  next();
}
