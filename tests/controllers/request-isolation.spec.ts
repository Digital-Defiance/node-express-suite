/**
 * Regression tests for request isolation in BaseController.
 *
 * Two requests overlap with a controlled pause inside the handler. Each must
 * still see its own body, language and transaction session after the await,
 * even though the other request started (and changed "last writer" state) in
 * the meantime. The tests drive the router directly with fake req/res objects,
 * so they do not need to open a listening socket.
 */
import {
  getSuiteCoreTranslation,
  IClientSession,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
import { BaseController } from '../../src/controllers/base';
import { BaseService } from '../../src/services/base';
import { getRequestContext } from '../../src/request-context';

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}
function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

interface Snapshot {
  body: unknown;
  language: string | undefined;
  translated: string;
  session: string | undefined;
  reqId: unknown;
  resId: unknown;
}

/** Fake database whose transactions each get a distinct, identifiable session. */
function makeDatabase() {
  let counter = 0;
  const sessions: string[] = [];
  const withTransaction = jest.fn(
    async <R>(fn: (session: IClientSession) => Promise<R>): Promise<R> => {
      const id = `session-${++counter}`;
      sessions.push(id);
      return fn({ id } as unknown as IClientSession);
    },
  );
  return { withTransaction, sessions };
}

function makeApplication(database: ReturnType<typeof makeDatabase>) {
  return {
    database,
    constants: {},
    environment: { mongo: { useTransactions: false }, debug: false },
  };
}

class IsolationController extends BaseController<
  never,
  Record<string, never>,
  string
> {
  /** Per request id: resolves when the handler reached its pause point. */
  public reached = new Map<string, Deferred>();
  /** Per request id: the test releases the handler by resolving this. */
  public release = new Map<string, Deferred>();

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      {
        method: 'post',
        path: '/echo',
        handlerKey: 'echo',
        useAuthentication: false,
        useTransaction: true,
        validation: [body('id').isString(), body('name').isString()],
      },
    ] as never;
    this.handlers = {
      echo: async (req: Request) => {
        const id = (req.body as { id: string }).id;
        const snapshot = (): Snapshot => ({
          body: this.validatedBody,
          language: getRequestContext()?.language,
          translated: getSuiteCoreTranslation(
            SuiteCoreStringKey.Common_Unauthorized,
          ),
          session: (this.session as unknown as { id?: string } | undefined)?.id,
          reqId: (this.req.body as { id: string }).id,
          resId: (this.res.locals as { id?: string }).id,
        });

        this.reached.get(id)?.resolve();
        const before = snapshot();
        await this.release.get(id)?.promise;
        // a different request has run in the meantime
        await new Promise((r) => setImmediate(r));
        const after = snapshot();
        return { statusCode: 200, response: { before, after } as never };
      },
    } as never;
  }

  public expose = {
    withTransaction: this.withTransaction.bind(this),
  };
}

interface Dispatched {
  status: number;
  json: { before: Snapshot; after: Snapshot };
}

function dispatch(
  controller: IsolationController,
  id: string,
  acceptLanguage: string,
): Promise<Dispatched> {
  return new Promise<Dispatched>((resolve, reject) => {
    const req = {
      method: 'POST',
      url: '/echo',
      originalUrl: '/echo',
      headers: { 'accept-language': acceptLanguage },
      body: { id, name: `name-${id}` },
      params: {},
      query: {},
    } as unknown as Request;
    const res = {
      locals: { id },
      headersSent: false,
      status(code: number) {
        return {
          json: (json: Dispatched['json']) => resolve({ status: code, json }),
        };
      },
      set() {
        return res;
      },
    } as unknown as Response;
    const next: NextFunction = (err?: unknown) =>
      reject(err instanceof Error ? err : new Error(`next(${String(err)})`));
    controller.router.handle(req, res, next);
  });
}

describe('BaseController request isolation', () => {
  let database: ReturnType<typeof makeDatabase>;
  let controller: IsolationController;

  beforeEach(() => {
    database = makeDatabase();
    controller = new IsolationController(makeApplication(database) as never);
    for (const id of ['A', 'B']) {
      controller.reached.set(id, deferred());
      controller.release.set(id, deferred());
    }
  });

  it('keeps body, language, session, req and res per request across an await', async () => {
    const a = dispatch(controller, 'A', 'fr-CA,fr;q=0.9,en-US;q=0.8');
    await controller.reached.get('A')?.promise;

    // B starts (and finishes setup) while A is paused after an await boundary.
    const b = dispatch(controller, 'B', 'es');
    await controller.reached.get('B')?.promise;

    // Release A last, so B is the "most recent" request when A resumes.
    controller.release.get('B')?.resolve();
    const bResult = await b;
    controller.release.get('A')?.resolve();
    const aResult = await a;

    for (const [result, id, session, translated, language] of [
      [aResult, 'A', 'session-1', 'Non autorisé', 'fr'],
      [bResult, 'B', 'session-2', 'No autorizado', 'es'],
    ] as const) {
      expect(result.status).toBe(200);
      for (const snap of [result.json.before, result.json.after]) {
        expect(snap.body).toEqual({ id, name: `name-${id}` });
        expect(snap.reqId).toBe(id);
        expect(snap.resId).toBe(id);
        expect(snap.session).toBe(session);
        expect(snap.language).toBe(language);
        // Suite Core uses its own engine; it must still follow the request language.
        expect(snap.translated).toBe(translated);
      }
    }
  });

  it('does not leave request state behind once the request is done', async () => {
    const a = dispatch(controller, 'A', 'fr');
    controller.release.get('A')?.resolve();
    await a;
    expect(() => controller.req).toThrow();
    expect(controller.session).toBeUndefined();
  });

  describe('withTransaction session handling', () => {
    it('BaseController passes the adapter session to the callback', async () => {
      const callback = jest.fn(async (session: unknown) => session);
      const result = (await controller.expose.withTransaction(callback)) as {
        id: string;
      };
      expect(database.withTransaction).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('session-1');
    });

    it('BaseController reuses a caller-supplied session without opening another', async () => {
      const mine = { id: 'mine' };
      const callback = jest.fn(async (session: unknown) => session);
      const result = await controller.expose.withTransaction(callback, mine);
      expect(database.withTransaction).not.toHaveBeenCalled();
      expect(result).toBe(mine);
    });

    it('BaseController forwards extra args to the callback', async () => {
      const callback = jest.fn(async (_s: unknown, a: unknown, b: unknown) => [
        a,
        b,
      ]);
      const result = await controller.expose.withTransaction(
        callback,
        undefined,
        undefined,
        1,
        2,
      );
      expect(result).toEqual([1, 2]);
    });

    it('BaseController runs without a session when there is no database', async () => {
      const bare = new IsolationController({
        database: undefined,
        constants: {},
      } as never);
      const callback = jest.fn(async (session: unknown) => session);
      expect(await bare.expose.withTransaction(callback)).toBeUndefined();
    });

    it('a transaction opened inside a route reuses the route session', async () => {
      let seenInside: unknown;
      let seenOutside: unknown;
      const inner = new (class extends IsolationController {
        protected initRouteDefinitions(): void {
          this.routeDefinitions = [
            {
              method: 'post',
              path: '/echo',
              handlerKey: 'echo',
              useAuthentication: false,
              useTransaction: true,
            },
          ] as never;
          this.handlers = {
            echo: async () => {
              seenOutside = this.session;
              await this.withTransaction(async (s) => {
                seenInside = s;
              });
              return { statusCode: 200, response: {} as never };
            },
          } as never;
        }
      })(makeApplication(database) as never);

      await dispatch(inner, 'A', 'en');
      expect(database.withTransaction).toHaveBeenCalledTimes(1);
      expect(seenInside).toBe(seenOutside);
      expect((seenInside as { id: string }).id).toBe('session-1');
    });
  });
});

describe('BaseService.withTransaction session handling', () => {
  it('passes the adapter session to the callback (was: undefined)', async () => {
    const database = makeDatabase();
    const service = new BaseService(makeApplication(database) as never);
    const callback = jest.fn(async (session: unknown) => session);

    const result = (await service.withTransaction(callback)) as { id: string };

    expect(database.withTransaction).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('session-1');
  });

  it('reuses a caller-supplied session and opens no new transaction', async () => {
    const database = makeDatabase();
    const service = new BaseService(makeApplication(database) as never);
    const mine = { id: 'mine' };
    const callback = jest.fn(async (session: unknown) => session);

    const result = await service.withTransaction(callback, mine);

    expect(database.withTransaction).not.toHaveBeenCalled();
    expect(result).toBe(mine);
  });

  it('commits/rolls back with the callback: a thrown error propagates from the transaction', async () => {
    const database = makeDatabase();
    const service = new BaseService(makeApplication(database) as never);
    await expect(
      service.withTransaction(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('runs without a session when there is no database', async () => {
    const service = new BaseService({ database: undefined } as never);
    const callback = jest.fn(async (session: unknown) => session);
    expect(await service.withTransaction(callback)).toBeUndefined();
  });
});
