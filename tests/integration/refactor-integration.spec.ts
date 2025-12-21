import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import { ApplicationBuilder } from '../../src/builders/application-builder';
import { ServiceContainer } from '../../src/container/service-container';
import { IConstants } from '../../src/interfaces';
import { Pipeline } from '../../src/pipeline/pipeline-builder';
import { PluginManager } from '../../src/plugins/plugin-manager';
import { ResponseBuilder } from '../../src/responses/response-builder';
import { TransactionManager } from '../../src/transactions/transaction-manager';
import { ValidationBuilder } from '../../src/validation/validation-builder';

describe('Refactor Integration Tests', () => {
  describe('ServiceContainer + ValidationBuilder', () => {
    it('should inject constants into validation builder', () => {
      const container = new ServiceContainer();
      const constants: IConstants = {
        usernameRegex: /^[a-z0-9_]{3,20}$/,
        passwordRegex: /^.{8,}$/,
        emailRegex: /^.+@.+$/,
      };

      container.register('constants', () => constants);

      const retrievedConstants = container.get<IConstants>('constants');
      const builder = ValidationBuilder.create(
        LanguageCodes.EN_US,
        retrievedConstants,
      );

      builder
        .for('username')
        .matches((c) => c.usernameRegex)
        .withMessage(SuiteCoreStringKey.Validation_InvalidUsername);

      const chains = builder.build();
      expect(chains).toHaveLength(1);
    });
  });

  describe('Pipeline + ValidationBuilder', () => {
    it('should combine validation with middleware pipeline', () => {
      const builder = ValidationBuilder.create(LanguageCodes.EN_US);

      builder
        .for('email')
        .isEmail()
        .withMessage(SuiteCoreStringKey.Validation_InvalidUsername);

      const validationChains = builder.build();

      const pipeline = Pipeline.create()
        .use((req, res, next) => next())
        .use(validationChains[0] as any)
        .use((req, res, next) => next());

      const handlers = pipeline.build();
      expect(handlers).toHaveLength(3);
    });
  });

  describe('TransactionManager + ResponseBuilder', () => {
    it('should handle transaction results with response builder', async () => {
      const mockConnection = {
        startSession: jest.fn().mockResolvedValue({
          withTransaction: jest
            .fn()
            .mockImplementation(async (cb) => await cb()),
          endSession: jest.fn(),
        }),
      } as any;

      const manager = new TransactionManager(mockConnection, true);

      const result = await manager.execute(async () => {
        return { user: { id: 1, username: 'test' } };
      });

      const response = ResponseBuilder.created()
        .message(SuiteCoreStringKey.Registration_Success)
        .data(result)
        .build();

      expect(response.statusCode).toBe(201);
      expect(response.response.user).toEqual({ id: 1, username: 'test' });
    });
  });

  describe('PluginManager + ServiceContainer', () => {
    it('should register services via plugin', async () => {
      const container = new ServiceContainer();
      const pluginManager = new PluginManager();

      const servicePlugin = {
        name: 'service-plugin',
        init: async () => {
          container.register('testService', () => ({ value: 42 }));
        },
      };

      pluginManager.register(servicePlugin);
      await pluginManager.initAll({} as any);

      expect(container.has('testService')).toBe(true);
      expect(container.get('testService').value).toBe(42);
    });
  });

  describe('ApplicationBuilder + All Components', () => {
    it('should build application with all refactored components', () => {
      const fs = require('fs');
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.MNEMONIC_HMAC_SECRET = 'a'.repeat(64);
      process.env.MNEMONIC_ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.API_DIST_DIR = '/tmp/test-api-dist';
      process.env.REACT_DIST_DIR = '/tmp/test-react-dist';
      if (!fs.existsSync('/tmp/test-api-dist'))
        fs.mkdirSync('/tmp/test-api-dist', { recursive: true });
      if (!fs.existsSync('/tmp/test-react-dist'))
        fs.mkdirSync('/tmp/test-react-dist', { recursive: true });

      const { Environment } = require('../../src/environment');
      const { BaseRouter } = require('../../src/routers/base');

      const env = new Environment(undefined, true);
      const constants: IConstants = {
        usernameRegex: /^[a-z]+$/,
        passwordRegex: /^.{8,}$/,
        emailRegex: /^.+@.+$/,
      };

      const app = new ApplicationBuilder()
        .withEnvironment(env)
        .withApiRouter((app) => new BaseRouter(app))
        .withSchemaMap(() => ({}))
        .withDatabaseInit(
          async () => ({ success: true, data: {} }),
          () => 'hash',
        )
        .withConstants(constants)
        .build();

      expect(app).toBeDefined();
      expect(app.services).toBeInstanceOf(ServiceContainer);
    });
  });

  describe('Complete Request Flow', () => {
    it('should simulate complete request with all components', async () => {
      const container = new ServiceContainer();
      const constants: IConstants = {
        usernameRegex: /^[a-z0-9_]{3,20}$/,
        passwordRegex: /^.{8,}$/,
        emailRegex: /^.+@.+$/,
      };

      container.register('constants', () => constants);

      const validator = ValidationBuilder.create(
        LanguageCodes.EN_US,
        constants,
      );
      validator
        .for('username')
        .matches((c) => c.usernameRegex)
        .withMessage(SuiteCoreStringKey.Validation_InvalidUsername);

      const pipeline = Pipeline.create().use((req, res, next) => {
        (req as any).validated = true;
        next();
      });

      const mockConnection = {
        startSession: jest.fn().mockResolvedValue({
          withTransaction: jest
            .fn()
            .mockImplementation(async (cb) => await cb({ id: 'session-1' })),
          endSession: jest.fn(),
        }),
      } as any;

      const txManager = new TransactionManager(mockConnection, true);

      const userData = await txManager.execute(async () => {
        return { id: 1, username: 'testuser' };
      });

      const response = ResponseBuilder.created()
        .message(SuiteCoreStringKey.Registration_Success)
        .data({ user: userData })
        .build();

      expect(response.statusCode).toBe(201);
      expect(response.response.user.username).toBe('testuser');
    });
  });

  describe('Complex Multi-Component Scenario', () => {
    it('should handle complex workflow with all components', async () => {
      const container = new ServiceContainer();
      const constants: IConstants = {
        usernameRegex: /^[a-z0-9_]{3,20}$/,
        passwordRegex: /^.{8,}$/,
        emailRegex: /^.+@.+$/,
      };
      container.register('constants', () => constants);

      const pluginManager = new PluginManager();
      pluginManager.register({
        name: 'logger',
        init: async () => {
          container.register('logger', () => ({
            log: (msg: string) => console.log(msg),
          }));
        },
      });
      await pluginManager.initAll({} as any);

      const validator = ValidationBuilder.create(
        LanguageCodes.EN_US,
        container.get('constants'),
      );
      validator
        .for('username')
        .matches((c) => c.usernameRegex)
        .withMessage(SuiteCoreStringKey.Validation_InvalidUsername);

      const pipeline = Pipeline.create()
        .use((req, res, next) => {
          (req as any).timestamp = Date.now();
          next();
        })
        .use((req, res, next) => {
          (req as any).validated = true;
          next();
        });

      const mockConnection = {
        startSession: jest.fn().mockResolvedValue({
          withTransaction: jest
            .fn()
            .mockImplementation(async (cb) => await cb({ id: 'tx-1' })),
          endSession: jest.fn(),
        }),
      } as any;

      const txManager = new TransactionManager(mockConnection, true);
      const userData = await txManager.execute(async () => ({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      }));

      const response = ResponseBuilder.created()
        .message(SuiteCoreStringKey.Registration_Success)
        .data({ user: userData })
        .headers({ 'X-Request-Id': 'req-123' })
        .build();

      expect(container.has('constants')).toBe(true);
      expect(container.has('logger')).toBe(true);
      expect(validator.build()).toHaveLength(1);
      expect(pipeline.build()).toHaveLength(2);
      expect(response.statusCode).toBe(201);
      expect(response.response.user.username).toBe('testuser');
      expect(response.headers).toEqual({ 'X-Request-Id': 'req-123' });
    });
  });
});
