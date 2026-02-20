import express from 'express';
import request from 'supertest';
import { TokenExpiredError } from '../../src/errors/token-expired';
import { authenticateToken } from '../../src/middlewares/authenticate-token';
import { IAuthenticationProvider } from '../../src/interfaces/authentication-provider';
import { createApplicationMock } from '../__tests__/helpers/application.mock';

function makeApp(mockAuthProvider: Partial<IAuthenticationProvider>) {
  const app = express();
  app.use(express.json());
  const application = createApplicationMock(
    {
      getModel: () => ({}) as unknown,
      authProvider: mockAuthProvider,
    } as Partial<any>,
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
  it('returns 400 when authProvider.verifyToken throws JsonWebTokenError', async () => {
    const err = new Error('bad token');
    err.name = 'JsonWebTokenError';
    const mockAuthProvider: Partial<IAuthenticationProvider> = {
      verifyToken: jest.fn().mockRejectedValue(err),
      findUserById: jest.fn(),
      buildRequestUserDTO: jest.fn(),
    };
    const app = makeApp(mockAuthProvider);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(400);
    expect(res.body?.message || res.text).toBeTruthy();
  });

  it('returns 401 when authProvider.verifyToken throws TokenExpiredError', async () => {
    const mockAuthProvider: Partial<IAuthenticationProvider> = {
      verifyToken: jest.fn().mockRejectedValue(new TokenExpiredError()),
      findUserById: jest.fn(),
      buildRequestUserDTO: jest.fn(),
    };
    const app = makeApp(mockAuthProvider);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer expired');
    expect(res.status).toBe(401);
    expect(res.body?.message || res.text).toBeTruthy();
  });
});
