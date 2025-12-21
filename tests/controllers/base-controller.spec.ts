import { Request, Response } from 'express';
import { body } from 'express-validator';
import { BaseController } from '../../src/controllers/base';

describe('BaseController', () => {
  class TestController extends BaseController<any, any, string> {
    protected initRouteDefinitions(): void {
      this.routeDefinitions = [
        {
          method: 'get',
          path: '/test',
          handlerKey: 'testHandler' as any,
          useAuthentication: false,
        },
        {
          method: 'post',
          path: '/auth-test',
          handlerKey: 'authHandler' as any,
          useAuthentication: true,
        },
        {
          method: 'post',
          path: '/validated',
          handlerKey: 'validatedHandler' as any,
          useAuthentication: false,
          validation: [body('email').isEmail()],
        },
      ];
      this.handlers = {
        testHandler: jest.fn().mockResolvedValue({
          statusCode: 200,
          response: { message: 'success' },
        }),
        authHandler: jest.fn().mockResolvedValue({
          statusCode: 200,
          response: { message: 'authenticated' },
        }),
        validatedHandler: jest.fn().mockResolvedValue({
          statusCode: 200,
          response: { message: 'validated' },
        }),
      } as any;
    }
  }

  let controller: TestController;
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      environment: { mongo: { useTransactions: false }, debug: false },
      db: { connection: {} },
      constants: {},
    };
    controller = new TestController(mockApp);
  });

  describe('constructor', () => {
    it('should initialize router', () => {
      expect(controller.router).toBeDefined();
    });

    it('should initialize handlers', () => {
      expect(controller['handlers']).toBeDefined();
    });

    it('should initialize transaction manager', () => {
      expect(controller['transactionManager']).toBeDefined();
    });
  });

  describe('user getter', () => {
    it('should throw when no active request', () => {
      expect(() => controller.user).toThrow();
    });

    it('should return user when request is active', () => {
      const mockUser = { id: '123', username: 'test' };
      (controller as any).activeRequest = { user: mockUser };
      expect(controller.user).toEqual(mockUser);
    });
  });

  describe('validatedBody getter', () => {
    it('should throw when no active request', () => {
      expect(() => controller.validatedBody).toThrow();
    });

    it('should return validatedBody when request is active', () => {
      const mockBody = { email: 'test@example.com' };
      (controller as any).activeRequest = { validatedBody: mockBody };
      expect(controller.validatedBody).toEqual(mockBody);
    });
  });

  describe('req getter', () => {
    it('should throw when no active request', () => {
      expect(() => controller.req).toThrow();
    });

    it('should return request when active', () => {
      const mockRequest = {} as Request;
      (controller as any).activeRequest = mockRequest;
      expect(controller.req).toBe(mockRequest);
    });
  });

  describe('res getter', () => {
    it('should throw when no active response', () => {
      expect(() => controller.res).toThrow();
    });

    it('should return response when active', () => {
      const mockResponse = {} as Response;
      (controller as any).activeResponse = mockResponse;
      expect(controller.res).toBe(mockResponse);
    });
  });

  describe('session getter', () => {
    it('should return session when set', () => {
      const mockSession = {} as any;
      (controller as any).activeSession = mockSession;
      expect(controller['session']).toBe(mockSession);
    });
  });

  describe('constants getter', () => {
    it('should return constants from application', () => {
      expect(controller['constants']).toBe(mockApp.constants);
    });

    it('should throw when constants not initialized', () => {
      mockApp.constants = undefined;
      const newController = new TestController(mockApp);
      expect(() => newController['constants']).toThrow(
        'Constants not initialized',
      );
    });
  });

  describe('router', () => {
    it('should have router instance', () => {
      expect(controller.router).toBeDefined();
    });

    it('should initialize with routeDefinitions', () => {
      expect(controller['routeDefinitions']).toBeDefined();
      expect(Array.isArray(controller['routeDefinitions'])).toBe(true);
    });
  });

  describe('registerValidationFunctions', () => {
    it('should register validation functions from route definitions', () => {
      const validationFn = jest.fn();
      const testController = new (class extends BaseController<
        any,
        any,
        string
      > {
        protected initRouteDefinitions(): void {
          this.routeDefinitions = [
            {
              method: 'post',
              path: '/test',
              handlerKey: 'test' as any,
              validation: validationFn,
            },
          ];
        }
      })(mockApp);

      // Validation function should be registered
      expect((BaseController as any).validationRegistry.has(validationFn)).toBe(
        true,
      );
    });
  });

  describe('authentication middleware', () => {
    it('should apply authentication when useAuthentication is true', () => {
      const routes = controller['routeDefinitions'];
      const authRoute = routes.find((r) => r.path === '/auth-test');
      const middleware = (controller as any).getAuthenticationMiddleware(
        authRoute,
      );

      expect(middleware).toHaveLength(1);
      expect(typeof middleware[0]).toBe('function');
    });

    it('should not apply authentication when useAuthentication is false', () => {
      const routes = controller['routeDefinitions'];
      const publicRoute = routes.find((r) => r.path === '/test');
      const middleware = (controller as any).getAuthenticationMiddleware(
        publicRoute,
      );

      expect(middleware).toHaveLength(0);
    });
  });

  describe('validation middleware', () => {
    it('should apply validation when validation array is provided', () => {
      const routes = controller['routeDefinitions'];
      const validatedRoute = routes.find((r) => r.path === '/validated');
      const middleware = (controller as any).getValidationMiddleware(
        validatedRoute,
      );

      expect(middleware.length).toBeGreaterThan(0);
    });

    it('should not apply validation when no validation is provided', () => {
      const routes = controller['routeDefinitions'];
      const publicRoute = routes.find((r) => r.path === '/test');
      const middleware = (controller as any).getValidationMiddleware(
        publicRoute,
      );

      expect(middleware).toHaveLength(0);
    });
  });

  describe('handler execution', () => {
    it('should execute handler and return result', async () => {
      const mockReq = {} as Request;
      const mockRes = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockNext = jest.fn();

      const config = {
        handlerKey: 'testHandler' as any,
        useAuthentication: false,
        useTransaction: false,
      };

      const requestHandler = (controller as any).createRequestHandler(config);
      await requestHandler(mockReq, mockRes, mockNext);

      expect(controller['handlers'].testHandler).toHaveBeenCalled();
    });
  });
});
