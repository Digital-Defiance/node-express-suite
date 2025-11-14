import express from 'express';
import request from 'supertest';
import { AccountStatus } from '@digitaldefiance/suite-core-lib';
import { authenticateToken } from '../../src/middlewares/authenticate-token';
import { createApplicationMock } from '../__tests__/helpers/application.mock';
import { JwtService } from '../../src/services/jwt';
import { RoleService } from '../../src/services/role';

jest.mock('../../src/services/jwt');
jest.mock('../../src/services/role');

describe('authenticateToken success paths', () => {
  let mockJwtService: any;
  let mockRoleService: any;
  let mockUserModel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJwtService = {
      verifyToken: jest.fn(),
    };

    mockRoleService = {
      getUserRoles: jest.fn().mockResolvedValue([]),
      rolesToTokenRoles: jest.fn().mockReturnValue([]),
    };

    mockUserModel = {
      findById: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    (JwtService as jest.MockedClass<typeof JwtService>).mockImplementation(() => mockJwtService);
    (RoleService as jest.MockedClass<typeof RoleService>).mockImplementation(() => mockRoleService);
  });

  function makeApp() {
    const app = express();
    app.use(express.json());
    const application = createApplicationMock(
      {
        getModel: () => mockUserModel as any,
      },
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
    mockJwtService.verifyToken.mockResolvedValue(null);
    
    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');
    
    expect(res.status).toBe(403);
  });

  it('403 when user document not found', async () => {
    mockJwtService.verifyToken.mockResolvedValue({ userId: 'user-123' });
    mockUserModel.exec.mockResolvedValue(null);
    
    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');
    
    expect(res.status).toBe(403);
  });

  it('403 when user account is not Active', async () => {
    mockJwtService.verifyToken.mockResolvedValue({ userId: 'user-123' });
    mockUserModel.exec.mockResolvedValue({
      _id: 'user-123',
      accountStatus: AccountStatus.Locked,
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
    mockJwtService.verifyToken.mockResolvedValue({ userId: 'user-123' });
    mockUserModel.exec.mockResolvedValue({
      _id: 'user-123',
      accountStatus: AccountStatus.Active,
      siteLanguage: 'en',
      timezone: 'America/New_York',
      username: 'testuser',
      email: 'test@example.com',
    });
    
    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');
    
    expect(res.status).toBe(200);
    expect(mockJwtService.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockUserModel.findById).toHaveBeenCalledWith('user-123', { password: 0 });
    expect(mockRoleService.getUserRoles).toHaveBeenCalledWith('user-123', undefined);
  });

  it('handles generic errors with 500', async () => {
    mockJwtService.verifyToken.mockRejectedValue(new Error('Unexpected error'));
    
    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');
    
    expect(res.status).toBe(500);
    expect(res.body.message).toBeTruthy();
  });

  it('sets user language and timezone context when available', async () => {
    mockJwtService.verifyToken.mockResolvedValue({ userId: 'user-456' });
    mockUserModel.exec.mockResolvedValue({
      _id: 'user-456',
      accountStatus: AccountStatus.Active,
      siteLanguage: 'es',
      timezone: 'Europe/Madrid',
      username: 'spainuser',
      email: 'spain@example.com',
    });
    
    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer spanish-token');
    
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });
});
