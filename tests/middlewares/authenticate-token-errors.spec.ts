import express from 'express';
import request from 'supertest';
import { createApplicationMock } from '../__tests__/helpers/application.mock';
import { TokenExpiredError } from '../../src/errors/token-expired';

// Mock JwtService to control verifyToken behavior
jest.mock('../../src/services/jwt', () => {
  const crypto = require('crypto');
  return {
    JwtService: jest.fn().mockImplementation(() => ({
      verifyToken: jest.fn((token: string) => {
        // Use constant-time comparison to prevent timing attacks
        const expiredToken = 'expired';
        const isExpired = token.length === expiredToken.length && 
          crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expiredToken));
        if (isExpired) {
          throw new TokenExpiredError();
        }
        const err = new Error('bad token');
        err.name = 'JsonWebTokenError';
        throw err;
      }),
    })),
  };
});

import { authenticateToken } from '../../src/middlewares/authenticate-token';

function makeApp() {
  const app = express();
  app.use(express.json());
  const application = createApplicationMock(
    {
      getModel: () => ({} as unknown),
    },
    { mongo: { uri: 'mongodb://localhost:27017', transactionTimeout: 60000 } },
  );
  app.get(
    '/protected',
    (req, res, next) => authenticateToken(application, req, res, next),
    (_req, res) => res.status(200).send('ok'),
  );
  return app;
}

describe('authenticateToken error paths', () => {
  it('returns 400 when JwtService throws JsonWebTokenError', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(400);
    expect(res.body?.message || res.text).toBeTruthy();
  });

  it('returns 401 when JwtService throws TokenExpiredError', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer expired');
    expect(res.status).toBe(401);
    expect(res.body?.message || res.text).toBeTruthy();
  });
});
