import express from 'express';
import request from 'supertest';
import { createApplicationMock } from '../__tests__/helpers/application.mock';
import { SystemUserService } from '../../src/services/system-user';
import { ApiRouter } from '../../src/routers/api';
import { emailServiceRegistry } from '../../src/registry';
import { IEmailService } from '../../src/interfaces/email-service';
import { ModelRegistry } from '../../src/model-registry';

// Mock SystemUserService to avoid needing real system user setup
jest.mock('../../src/services/system-user');

describe('ApiRouter', () => {
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
    jest.spyOn(ModelRegistry.instance, 'getTypedModel').mockReturnValue(mockModel as any);

    const app = express();
    app.use(express.json());

    const application = createApplicationMock(
      {
        // Provide a minimal getModel implementation for constructor-time lookups
        getModel: () =>
          ({
            /* minimal mock */
          } as unknown),
      },
      {
        // Provide required HMAC secret expected by services
        mnemonicHmacSecret: {
          length: 32,
          value: Buffer.alloc(32),
          dispose: () => {},
        } as unknown,
        mongo: { uri: 'mongodb://localhost:27017', transactionTimeout: 60000 },
      },
    );
    const apiRouter = new ApiRouter(application);
    app.use('/api', apiRouter.router);

    // hit an authenticated route without token, should return 401/403 rather than 404
    const res = await request(app).get('/api/user/refresh-token');
    expect([401, 403, 400]).toContain(res.status);
  });
});
