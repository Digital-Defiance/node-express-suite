/**
 * @fileoverview Cleanup middleware for disposing cryptographic resources.
 * Ensures private keys and sensitive material are properly disposed after request completion.
 * @module middlewares/cleanup-crypto
 */

import { NextFunction, Request, Response } from 'express';

/**
 * Express middleware to cleanup cryptographic resources after request completion.
 * Wraps response.end() to dispose of req.eciesUser before sending response.
 * Should be registered early in middleware chain to ensure cleanup on all responses.
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
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
