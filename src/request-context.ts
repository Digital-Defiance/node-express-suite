/**
 * @fileoverview Request-scoped state backed by AsyncLocalStorage.
 *
 * Controllers and the localization middleware used to keep the active request,
 * response, transaction session and language in shared mutable fields. Because
 * Node interleaves requests at every `await`, one request could read another's
 * state. Everything that is per-request now lives in a RequestContext that is
 * bound to the async call chain of exactly one request.
 *
 * @module request-context
 */

import { AsyncLocalStorage } from 'async_hooks';
import {
  setLanguageOverrideProvider,
  setTimezoneOverrideProvider,
} from '@digitaldefiance/i18n-lib';
import type { Timezone } from '@digitaldefiance/i18n-lib';
import type { IClientSession } from '@digitaldefiance/suite-core-lib';
import type { Request, Response } from 'express';

/**
 * State owned by a single in-flight request.
 */
export interface RequestContext {
  /** The Express request. */
  req?: Request;
  /** The Express response. */
  res?: Response;
  /** The database session of the transaction wrapping the handler, if any. */
  session?: IClientSession;
  /** Language code resolved once for this request. */
  language?: string;
  /** The authenticated user's timezone for this request. */
  timezone?: Timezone;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs `fn` (and everything it awaits) with `context` as the current request context.
 * @param context - The request's state. The object is kept by reference, so
 *   fields assigned later (e.g. `session`) are visible to the whole request.
 * @param fn - Work to run inside the context.
 */
export function runWithRequestContext<R>(
  context: RequestContext,
  fn: () => R,
): R {
  return storage.run(context, fn);
}

/**
 * The context of the request currently executing, or undefined outside a request.
 */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * The language resolved for the request currently executing, if any.
 */
export function getRequestLanguage(): string | undefined {
  return storage.getStore()?.language;
}

// Let i18n-lib engines and GlobalActiveContext translate in the executing
// request's language instead of one process-wide language.
setLanguageOverrideProvider(getRequestLanguage);
setTimezoneOverrideProvider(() => storage.getStore()?.timezone);
