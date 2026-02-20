import { AccountStatus } from '@digitaldefiance/suite-core-lib';
import { Types } from '@digitaldefiance/mongoose-types';
import { registerNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import express from 'express';
import request from 'supertest';
import { TokenExpiredError } from '../../src/errors/token-expired';
import { authenticateToken } from '../../src/middlewares/authenticate-token';
import { IAuthenticationProvider } from '../../src/interfaces/authentication-provider';
import { createApplicationMock } from '../__tests__/helpers/application.mock';

describe('authenticateToken success paths', () => {
  let mockAuthProvider: jest.Mocked<IAuthenticationProvider>;

  beforeAll(() => {
    registerNodeRuntimeConfiguration('default-config', {});
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthProvider = {
      verifyToken: jest.fn(),
      findUserById: jest.fn(),
      buildRequestUserDTO: jest.fn(),
    };
  });

  function makeApp() {
    const app = express();
    app.use(express.json());
    const application = createApplicationMock(
      {
        getModel: () => ({}) as unknown,
        authProvider: mockAuthProvider,
      } as Partial<any>,
      {
        mongo: {
          uri: 'mongodb://localhost:27017',
          transactionTimeout: 60000,
          useTransactions: false,
        },
      },
    );
    app.get(
      '/protected',
      (req, res, next) => authenticateToken(application, req, res, next),
      (req, res) => res.status(200).json({ user: req.user }),
    );
    return app;
  }

  it('403 when verifyToken returns null', async () => {
    mockAuthProvider.verifyToken.mockResolvedValue(null);

    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });

  it('403 when user document not found', async () => {
    mockAuthProvider.verifyToken.mockResolvedValue({ userId: 'user-123' });
    mockAuthProvider.findUserById.mockResolvedValue(null);

    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });

  it('403 when user account is not Active', async () => {
    mockAuthProvider.verifyToken.mockResolvedValue({ userId: 'user-123' });
    mockAuthProvider.findUserById.mockResolvedValue({
      id: 'user-123',
      accountStatus: AccountStatus.Locked,
      email: 'test@example.com',
      siteLanguage: 'en',
      timezone: 'America/New_York',
    });

    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });

  it('allows access when user is valid and Active', async () => {
    const userId = new Types.ObjectId();
    mockAuthProvider.verifyToken.mockResolvedValue({
      userId: userId.toString(),
    });
    mockAuthProvider.findUserById.mockResolvedValue({
      id: userId.toString(),
      accountStatus: AccountStatus.Active,
      email: 'test@example.com',
      siteLanguage: 'en',
      timezone: 'America/New_York',
    });
    mockAuthProvider.buildRequestUserDTO.mockResolvedValue({
      id: userId.toString(),
      email: 'test@example.com',
      username: 'testuser',
      roles: [],
    } as any);

    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(mockAuthProvider.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockAuthProvider.findUserById).toHaveBeenCalledWith(
      userId.toString(),
    );
  });

  it('handles generic errors with 500', async () => {
    mockAuthProvider.verifyToken.mockRejectedValue(
      new Error('Unexpected error'),
    );

    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
    expect(res.body.message).toBeTruthy();
  });

  it('sets user language and timezone context when available', async () => {
    const userId = new Types.ObjectId();
    mockAuthProvider.verifyToken.mockResolvedValue({
      userId: userId.toString(),
    });
    mockAuthProvider.findUserById.mockResolvedValue({
      id: userId.toString(),
      accountStatus: AccountStatus.Active,
      email: 'spain@example.com',
      siteLanguage: 'es',
      timezone: 'Europe/Madrid',
    });
    mockAuthProvider.buildRequestUserDTO.mockResolvedValue({
      id: userId.toString(),
      email: 'spain@example.com',
      username: 'spainuser',
      roles: [],
    } as any);

    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer spanish-token');

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });
});
