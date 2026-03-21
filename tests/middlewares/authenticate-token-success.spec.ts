import { Types } from '@digitaldefiance/mongoose-types';
import { registerNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import express from 'express';
import request from 'supertest';
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

  it('403 when buildRequestUserDTO returns null (user not found or inactive)', async () => {
    mockAuthProvider.verifyToken.mockResolvedValue({ userId: 'user-123' });
    mockAuthProvider.buildRequestUserDTO.mockResolvedValue(null);

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
    mockAuthProvider.buildRequestUserDTO.mockResolvedValue({
      id: userId.toString(),
      email: 'test@example.com',
      username: 'testuser',
      roles: [],
      rolePrivileges: {
        admin: false,
        member: true,
        child: false,
        system: false,
      },
      emailVerified: true,
      timezone: 'America/New_York',
      siteLanguage: 'en',
      darkMode: false,
      currency: 'USD',
      directChallenge: false,
    });

    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(mockAuthProvider.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockAuthProvider.buildRequestUserDTO).toHaveBeenCalledWith(
      userId.toString(),
    );
    // findUserById should NOT be called — buildRequestUserDTO handles everything
    expect(mockAuthProvider.findUserById).not.toHaveBeenCalled();
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
    mockAuthProvider.buildRequestUserDTO.mockResolvedValue({
      id: userId.toString(),
      email: 'spain@example.com',
      username: 'spainuser',
      roles: [],
      rolePrivileges: {
        admin: false,
        member: true,
        child: false,
        system: false,
      },
      emailVerified: true,
      timezone: 'Europe/Madrid',
      siteLanguage: 'es',
      darkMode: false,
      currency: 'EUR',
      directChallenge: false,
    });

    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer spanish-token');

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it('moves member from DTO to req.member when present', async () => {
    const userId = new Types.ObjectId();
    const fakeMember = { id: 'member-obj', publicKey: new Uint8Array(33) };
    mockAuthProvider.verifyToken.mockResolvedValue({
      userId: userId.toString(),
    });
    // Simulate buildRequestUserDTO returning a DTO with an extra member property
    mockAuthProvider.buildRequestUserDTO.mockResolvedValue({
      id: userId.toString(),
      email: 'test@example.com',
      username: 'testuser',
      roles: [],
      rolePrivileges: {
        admin: false,
        member: true,
        child: false,
        system: false,
      },
      emailVerified: true,
      timezone: 'UTC',
      siteLanguage: 'en',
      darkMode: false,
      currency: 'USD',
      directChallenge: false,
      member: fakeMember,
    } as any);

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
      (req, res) => {
        const reqAny = req as any;
        res.status(200).json({
          user: req.user,
          hasMemberOnReq: !!reqAny.member,
          memberNotOnUser: !('member' in (req.user || {})),
        });
      },
    );

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.hasMemberOnReq).toBe(true);
    expect(res.body.memberNotOnUser).toBe(true);
  });
});
