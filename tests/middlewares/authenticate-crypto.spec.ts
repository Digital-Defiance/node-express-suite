import { AccountStatus } from '@digitaldefiance/suite-core-lib';
import express from 'express';
import request from 'supertest';
import { IAuthenticationProvider } from '../../src/interfaces/authentication-provider';
import { createApplicationMock } from '../__tests__/helpers/application.mock';

// Import after mocks are set up
import { authenticateCrypto } from '../../src/middlewares/authenticate-crypto';

const VALID_USER_ID = 'USER_ID';

function makeApp(
  overrides: {
    authProviderOverrides?: Partial<IAuthenticationProvider>;
    setUser?: boolean | { id: string };
  } = {},
) {
  const app = express();
  app.use(express.json());

  const mockAuthProvider: Partial<IAuthenticationProvider> = {
    verifyToken: jest.fn().mockResolvedValue(null),
    findUserById: jest.fn().mockResolvedValue(null),
    buildRequestUserDTO: jest.fn().mockResolvedValue(null),
    ...overrides.authProviderOverrides,
  };

  const application = createApplicationMock(
    {
      getModel: () => ({}) as unknown,
      authProvider: mockAuthProvider,
    } as Partial<any>,
    { mongo: { uri: 'mongodb://localhost:27017', transactionTimeout: 60000 } },
  );

  // Optional middleware to set req.user
  if (overrides.setUser) {
    app.use((req, _res, next) => {
      (req as any).user =
        typeof overrides.setUser === 'object'
          ? overrides.setUser
          : { id: VALID_USER_ID };
      next();
    });
  }

  // Endpoint under test
  app.post(
    '/crypto',
    (req, res, next) => authenticateCrypto(application, req, res, next),
    (_req, res) => {
      res.status(200).json({ ok: true });
    },
  );

  return app;
}

describe('authenticateCrypto middleware', () => {
  it('returns 401 when req.user is missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/crypto').send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 when mnemonic and password are missing', async () => {
    const app = makeApp({ setUser: { id: VALID_USER_ID } });
    const res = await request(app).post('/crypto').send({});
    expect(res.status).toBe(400);
  });

  it('returns 403 when user not found', async () => {
    const app = makeApp({
      authProviderOverrides: {
        findUserById: jest.fn().mockResolvedValue(null),
      },
      setUser: { id: VALID_USER_ID },
    });
    const res = await request(app)
      .post('/crypto')
      .send({ mnemonic: 'seed phrase' });
    expect(res.status).toBe(403);
  });

  it('returns 403 when user is inactive', async () => {
    const app = makeApp({
      authProviderOverrides: {
        findUserById: jest.fn().mockResolvedValue({
          id: VALID_USER_ID,
          email: 'user@example.com',
          accountStatus: AccountStatus.AdminLock,
          timezone: 'UTC',
        }),
      },
      setUser: { id: VALID_USER_ID },
    });
    // amazonq-ignore-next-line
    const res = await request(app).post('/crypto').send({ password: 'pass' });
    expect(res.status).toBe(403);
  });

  it('returns 403 when fetched user id does not match req.user.id', async () => {
    const app = makeApp({
      authProviderOverrides: {
        findUserById: jest.fn().mockResolvedValue({
          id: '507f1f77bcf86cd799439012',
          email: 'user@example.com',
          accountStatus: AccountStatus.Active,
          timezone: 'UTC',
        }),
      },
      setUser: { id: VALID_USER_ID },
    });
    const res = await request(app)
      .post('/crypto')
      .send({ mnemonic: 'seed phrase' });
    expect(res.status).toBe(403);
  });

  it('succeeds and sets members when mnemonic is valid', async () => {
    const app = makeApp({
      authProviderOverrides: {
        findUserById: jest.fn().mockResolvedValue({
          id: VALID_USER_ID,
          email: 'user@example.com',
          accountStatus: AccountStatus.Active,
          timezone: 'UTC',
        }),
        authenticateWithMnemonic: jest.fn().mockResolvedValue({
          userId: VALID_USER_ID,
          userMember: { id: 'user-member' },
        }),
      },
      setUser: { id: VALID_USER_ID },
    });
    const res = await request(app)
      .post('/crypto')
      .send({ mnemonic: 'seed phrase' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
