import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import { ServiceContainer } from '../../src/container/service-container';
import { IConstants } from '../../src/interfaces';
import { Pipeline } from '../../src/pipeline/pipeline-builder';
import { PluginManager } from '../../src/plugins/plugin-manager';
import { ResponseBuilder } from '../../src/responses/response-builder';
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

      // Simulate a data operation result (TransactionManager moved to mongo package)
      const userData = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

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
