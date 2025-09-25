// src/middlewares/injectMongooseContext.ts

import {
  GlobalActiveContext,
  LanguageRegistry,
} from '@digitaldefiance/i18n-lib';
import { NextFunction, Request, Response } from 'express';

export function setGlobalContextLanguageFromRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
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
