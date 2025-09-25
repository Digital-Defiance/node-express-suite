import { cleanupCrypto } from '../../src/middlewares/cleanup-crypto';

type EndFn = (
  chunk?: unknown,
  encoding?: BufferEncoding,
  cb?: () => void,
) => unknown;

function makeRes() {
  const chunks: unknown[] = [];
  const res = {
    end: ((chunk?: unknown, _encoding?: BufferEncoding, cb?: () => void) => {
      if (chunk !== undefined) chunks.push(chunk);
      if (cb) cb();
      return undefined;
    }) as EndFn,
  } as unknown as import('express').Response & { end: EndFn };
  return { res, chunks } as const;
}

describe('cleanupCrypto middleware', () => {
  it('disposes eciesUser before response ends', () => {
    const req = {
      eciesUser: { dispose: jest.fn() },
    } as unknown as import('express').Request & {
      eciesUser?: { dispose: () => void };
    };
    const { res } = makeRes();
    const next = jest.fn();

    cleanupCrypto(req, res, next);

    // call end to trigger cleanup
    (res.end as EndFn)('ok');

    // eciesUser unset and disposed
    expect(req.eciesUser).toBeUndefined();
  });

  it('handles missing users safely', () => {
    const req = {} as unknown as import('express').Request & {
      eciesUser?: { dispose: () => void };
    };
    const { res } = makeRes();
    const next = jest.fn();

    cleanupCrypto(req, res, next);
    (res.end as EndFn)();

    expect(next).toHaveBeenCalled();
  });
});
