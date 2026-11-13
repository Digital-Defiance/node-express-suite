/**
 * @fileoverview Middleware to resolve the language of a request.
 * Determines the language from the Accept-Language header and user preferences,
 * once per request, and carries it through the rest of the request.
 * @module middlewares/set-global-context-language
 */

import {
  GlobalActiveContext,
  LanguageRegistry,
} from '@digitaldefiance/i18n-lib';
import type { Timezone } from '@digitaldefiance/i18n-lib';
import { NextFunction, Request, Response } from 'express';
import { getRequestContext, runWithRequestContext } from '../request-context';

/**
 * Resolves the language for a request using the fallback chain:
 * Accept-Language header (weighted language ranges matched against the
 * registered languages) → user preference → site default.
 *
 * @param req - Express request
 * @returns The registered language code, or undefined when no languages have been registered yet.
 */
export function resolveRequestLanguage(req: Request): string | undefined {
  if (!LanguageRegistry.getDefaultLanguageId()) {
    return undefined;
  }
  const acceptLanguage = req.headers?.['accept-language'];
  return LanguageRegistry.getMatchingLanguageCode(
    Array.isArray(acceptLanguage) ? acceptLanguage.join(',') : acceptLanguage,
    req.user?.siteLanguage,
  );
}

/**
 * Runs `next` so that the remainder of the request (authentication, validation,
 * the handler and response formatting, including everything they await) uses
 * `language`. The language is scoped to this request's async call chain, so an
 * overlapping request can never change it.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 * @param language - The language resolved for this request
 */
export function continueWithRequestLanguage(
  req: Request,
  res: Response,
  next: NextFunction,
  language: string | undefined,
  timezone?: Timezone,
): void {
  if (language && res.locals) {
    res.locals['language'] = language;
  }
  const parent = getRequestContext();
  runWithRequestContext(
    {
      ...parent,
      req,
      res,
      language: language ?? parent?.language,
      timezone: timezone ?? parent?.timezone,
    },
    () => next(),
  );
}

/**
 * Express middleware that resolves the request's language once and carries it
 * through the rest of the request (see {@link continueWithRequestLanguage}).
 * Unlike earlier versions it does not write the language into the shared
 * GlobalActiveContext, which concurrent requests would overwrite.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export function setGlobalContextLanguageFromRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const language = resolveRequestLanguage(req);
  if (!language) {
    // No languages registered yet: nothing to resolve.
    next();
    return;
  }

  // The context space is a constant ('user') rather than request data, so
  // setting it is safe to repeat for every request.
  GlobalActiveContext.getInstance().setLanguageContextSpace('user');
  continueWithRequestLanguage(req, res, next, language);
}
