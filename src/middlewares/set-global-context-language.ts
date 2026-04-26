/**
 * @fileoverview Middleware to set global language context from request.
 * Determines user language from Accept-Language header and user preferences.
 * @module middlewares/set-global-context-language
 */

// src/middlewares/injectMongooseContext.ts

import {
  GlobalActiveContext,
  LanguageRegistry,
} from '@digitaldefiance/i18n-lib';
import { NextFunction, Request, Response } from 'express';

/**
 * Express middleware to set global language context for the request.
 * Uses fallback chain: Accept-Language header → user preference → site default.
 * Sets both user language and language context space in GlobalActiveContext.
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export function setGlobalContextLanguageFromRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Skip language resolution if no languages have been registered yet
  if (!LanguageRegistry.getDefaultLanguageId()) {
    next();
    return;
  }

  // Use fallback chain: accept-language -> user preference -> site default
  const language = LanguageRegistry.getMatchingLanguageCode(
    req.headers['accept-language'] as string,
    req.user?.siteLanguage as string,
  );

  const context = GlobalActiveContext.getInstance();
  context.setUserLanguage(language);
  context.setLanguageContextSpace('user');
  next();
}
