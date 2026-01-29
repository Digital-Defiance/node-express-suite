import { resetRegistry } from '@digitaldefiance/branded-enum';
import { SecureBuffer } from '@digitaldefiance/ecies-lib';
import express from 'express';
import request from 'supertest';
import { IEmailService } from '../../src/interfaces/email-service';
import { IMongoEnvironment } from '../../src/interfaces/environment-mongo';
import { ModelRegistry } from '../../src/model-registry';
import { emailServiceRegistry } from '../../src/registry';
import { ApiRouter } from '../../src/routers/api';
import { SystemUserService } from '../../src/services/system-user';
import { createApplicationMock } from '../__tests__/helpers/application.mock';

// Mock SystemUserService to avoid needing real system user setup
jest.mock('../../src/services/system-user');

describe('ApiRouter', () => {
  beforeEach(() => {
    resetRegistry();
  });
  it('mounts user controller under /user and responds for known routes', async () => {
    // Mock SystemUserService.getSystemUser to return a minimal mock
    (SystemUserService.getSystemUser as jest.Mock).mockReturnValue({
      /* minimal system user mock */
    });

    // Set up email service before creating ApiRouter
    const mockEmailService: IEmailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };
    emailServiceRegistry.setService(mockEmailService);

    // Mock ModelRegistry to avoid model registration errors
    const mockModel = {
      findOne: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      }),
    };
    jest
      .spyOn(ModelRegistry.instance, 'getTypedModel')
      .mockReturnValue(mockModel as any);

    const app = express();
    app.use(express.json());

    const application = createApplicationMock(
      {
        // Provide a minimal getModel implementation for constructor-time lookups
        getModel: () =>
          ({
            /* minimal mock */
          }) as unknown,
      },
      {
        // Provide required HMAC secret expected by services
        mnemonicHmacSecret: new SecureBuffer(Buffer.alloc(32)),
        mongo: {
          uri: 'mongodb://localhost:27017',
          transactionTimeout: 60000,
        } as IMongoEnvironment,
      },
    );
    const apiRouter = new ApiRouter(application);
    app.use('/api', apiRouter.router);

    // hit an authenticated route without token, should return 401/403 rather than 404
    const res = await request(app).get('/api/user/refresh-token');
    expect([401, 403, 400]).toContain(res.status);
  });
});
