import { Connection } from '@digitaldefiance/mongoose-types';
import { Application } from '../src/application';
import { BaseApplication } from '../src/application-base';
import { LocalhostConstants } from '../src/constants';
import { Environment } from '../src/environment';
import { IConstants, IServerInitResult } from '../src/interfaces';
import { AppRouter } from '../src/routers/app';
import { BaseRouter } from '../src/routers/base';
import { DatabaseInitializationService } from '../src/services/database-initialization';
import { SchemaMap } from '../src/types';

// Mock dependencies
jest.mock('../src/services/database-initialization');

describe('Application', () => {
  let application: Application<
    IServerInitResult,
    any,
    Environment,
    IConstants,
    AppRouter
  >;
  let env: Environment;
  let mockApiRouter: BaseRouter;
  let mockSchemaMap: SchemaMap<any>;

  beforeEach(() => {
    // Set up required environment variables
    const fs = require('fs');
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.MNEMONIC_HMAC_SECRET = 'a'.repeat(64);
    process.env.MNEMONIC_ENCRYPTION_KEY = 'b'.repeat(64);
    process.env.API_DIST_DIR = '/tmp/test-api-dist';
    process.env.REACT_DIST_DIR = '/tmp/test-react-dist';
    if (!fs.existsSync('/tmp/test-api-dist')) {
      fs.mkdirSync('/tmp/test-api-dist', { recursive: true });
    }
    if (!fs.existsSync('/tmp/test-react-dist')) {
      fs.mkdirSync('/tmp/test-react-dist', { recursive: true });
    }

    // Create environment without devDatabase
    env = new Environment(undefined, true);

    // Mock schema map
    mockSchemaMap = {} as SchemaMap<any>;

    // Mock API router factory - just return a BaseRouter instance
    const apiRouterFactory = jest.fn((app) => {
      mockApiRouter = new BaseRouter(app);
      return mockApiRouter;
    });

    // Create application instance with appRouterFactory that mocks init
    const appRouterFactory = (apiRouter: BaseRouter) => {
      const router = new AppRouter(apiRouter);
      jest.spyOn(router, 'init').mockImplementation(() => {});
      return router;
    };

    application = new Application(
      env,
      apiRouterFactory,
      (connection: Connection) => mockSchemaMap,
      async (app: BaseApplication<any, IServerInitResult>) => ({
        success: true,
        data: {
          systemUser: {
            _id: 'system-id',
            username: 'system',
            email: 'system@example.com',
            password: 'password123',
          },
          adminUser: {
            _id: 'admin-id',
            username: 'admin',
            email: 'admin@example.com',
            password: 'password123',
          },
          memberUser: {
            _id: 'member-id',
            username: 'member',
            email: 'member@example.com',
            password: 'password123',
            mnemonic: 'test mnemonic phrase',
            publicKey: 'public-key-123',
            backupCodes: ['code1', 'code2'],
          },
        },
      }),
      (initResults: IServerInitResult) => 'test-hash',
      {
        corsWhitelist: [],
        csp: {
          defaultSrc: [],
          imgSrc: [],
          connectSrc: [],
          scriptSrc: [],
          styleSrc: [],
          fontSrc: [],
          frameSrc: [],
        },
      },
      LocalhostConstants,
      appRouterFactory,
    );

    // Mock the DatabaseInitializationService.printServerInitResults
    jest.clearAllMocks();
    jest
      .spyOn(DatabaseInitializationService, 'printServerInitResults')
      .mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up - mock stop to avoid hanging
    jest.spyOn(BaseApplication.prototype, 'stop').mockResolvedValue(undefined);
    jest.clearAllMocks();
    if (application && application.ready) {
      try {
        // Set server to null to skip close logic
        (application as any).server = null;
        (application as any)._ready = false;
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('constructor', () => {
    it('should create application instance', () => {
      expect(application).toBeDefined();
      expect(application).toBeInstanceOf(Application);
      expect(application).toBeInstanceOf(BaseApplication);
    });

    it('should initialize with Express app', () => {
      expect(application.expressApp).toBeDefined();
    });

    it('should have environment', () => {
      expect(application.environment).toBe(env);
    });

    it('should not be ready initially', () => {
      expect(application.ready).toBe(false);
    });
  });

  describe('start() without devDatabase', () => {
    it('should start without calling initializeDevDatabase', async () => {
      // Clear previous mock calls
      jest.clearAllMocks();

      // Spy on the protected method
      const initDevDbSpy = jest.spyOn(
        application as any,
        'initializeDevDatabase',
      );

      // Mock the base start method to avoid actual database connection
      jest
        .spyOn(BaseApplication.prototype as any, 'start')
        .mockResolvedValue(undefined);

      // Mock express app listen
      const listenSpy = jest
        .spyOn(application.expressApp, 'listen')
        .mockImplementation(((port: any, host: any, callback: any) => {
          callback();
          return {
            close: jest.fn(),
            closeAllConnections: jest.fn(),
          };
        }) as any);

      await application.start();

      expect(initDevDbSpy).not.toHaveBeenCalled();
      expect(
        DatabaseInitializationService.printServerInitResults,
      ).not.toHaveBeenCalled();
      expect(application.ready).toBe(true);

      listenSpy.mockRestore();
    }, 10000); // Increase timeout
  });

  describe('start() with devDatabase', () => {
    beforeEach(() => {
      // Set up environment with devDatabase
      process.env.DEV_DATABASE = 'test-dev-db';
      env = new Environment(undefined, true);

      // Recreate application with devDatabase environment
      const apiRouterFactory = jest.fn((app) => {
        mockApiRouter = new BaseRouter(app);
        return mockApiRouter;
      });

      // Create appRouterFactory that mocks init
      const appRouterFactory2 = (apiRouter: BaseRouter) => {
        const router = new AppRouter(apiRouter);
        jest.spyOn(router, 'init').mockImplementation(() => {});
        return router;
      };

      application = new Application(
        env,
        apiRouterFactory,
        (connection: Connection) => mockSchemaMap,
        async (app: BaseApplication<any, IServerInitResult>) => ({
          success: true,
          data: {
            systemUser: {
              _id: 'system-id',
              username: 'system',
              email: 'system@example.com',
              password: 'password123',
            },
            adminUser: {
              _id: 'admin-id',
              username: 'admin',
              email: 'admin@example.com',
              password: 'password123',
            },
            memberUser: {
              _id: 'member-id',
              username: 'member',
              email: 'member@example.com',
              password: 'password123',
              mnemonic: 'test mnemonic phrase',
              publicKey: 'public-key-123',
              backupCodes: ['code1', 'code2'],
            },
          },
        }),
        (initResults: IServerInitResult) => 'test-hash',
        {
          corsWhitelist: [],
          csp: {
            defaultSrc: [],
            imgSrc: [],
            connectSrc: [],
            scriptSrc: [],
            styleSrc: [],
            fontSrc: [],
            frameSrc: [],
          },
        },
        LocalhostConstants,
        appRouterFactory2,
      );
    });

    afterEach(() => {
      delete process.env.DEV_DATABASE;
    });

    it('should call initializeDevDatabase when devDatabase is set', async () => {
      // Clear previous mock calls
      jest.clearAllMocks();

      // Mock the necessary methods
      const mockInitResults: IServerInitResult = {
        systemUser: {
          _id: 'system-id',
          username: 'system',
          email: 'system@example.com',
          password: 'password123',
        },
        adminUser: {
          _id: 'admin-id',
          username: 'admin',
          email: 'admin@example.com',
          password: 'password123',
        },
        memberUser: {
          _id: 'member-id',
          username: 'member',
          email: 'member@example.com',
          password: 'password123',
          mnemonic: 'test mnemonic phrase',
          publicKey: 'public-key-123',
          backupCodes: ['code1', 'code2'],
        },
      };

      // Spy on initializeDevDatabase
      const initDevDbSpy = jest
        .spyOn(application as any, 'initializeDevDatabase')
        .mockResolvedValue(mockInitResults);

      // Mock setupDevDatabase to provide a devDatabase instance
      jest
        .spyOn(application as any, 'setupDevDatabase')
        .mockResolvedValue('mongodb://localhost/test');

      // Mock the devDatabase getter to return a truthy value
      Object.defineProperty(application, 'devDatabase', {
        get: jest.fn(() => ({ getUri: () => 'mongodb://localhost/test' })),
        configurable: true,
      });

      // Mock the base start method
      jest
        .spyOn(BaseApplication.prototype as any, 'start')
        .mockResolvedValue(undefined);

      // Mock express app listen
      const listenSpy = jest
        .spyOn(application.expressApp, 'listen')
        .mockImplementation(((port: any, host: any, callback: any) => {
          callback();
          return {
            close: jest.fn(),
            closeAllConnections: jest.fn(),
          };
        }) as any);

      await application.start();

      expect(initDevDbSpy).toHaveBeenCalled();
      expect(
        DatabaseInitializationService.printServerInitResults,
      ).toHaveBeenCalledWith(mockInitResults, false, expect.any(Function));
      expect(application.ready).toBe(true);

      listenSpy.mockRestore();
    }, 10000); // Increase timeout

    it('should print server init results with verbose flag false', async () => {
      // Clear previous mock calls
      jest.clearAllMocks();

      const mockInitResults: IServerInitResult = {
        systemUser: {
          _id: 'system-id',
          username: 'system',
          email: 'system@example.com',
          password: 'password123',
        },
        adminUser: {
          _id: 'admin-id',
          username: 'admin',
          email: 'admin@example.com',
          password: 'password123',
        },
        memberUser: {
          _id: 'member-id',
          username: 'member',
          email: 'member@example.com',
          password: 'password123',
          mnemonic: 'test mnemonic phrase',
          publicKey: 'public-key-123',
          backupCodes: ['code1', 'code2'],
        },
      };

      jest
        .spyOn(application as any, 'initializeDevDatabase')
        .mockResolvedValue(mockInitResults);
      jest
        .spyOn(application as any, 'setupDevDatabase')
        .mockResolvedValue('mongodb://localhost/test');
      Object.defineProperty(application, 'devDatabase', {
        get: jest.fn(() => ({ getUri: () => 'mongodb://localhost/test' })),
        configurable: true,
      });
      jest
        .spyOn(BaseApplication.prototype as any, 'start')
        .mockResolvedValue(undefined);
      const listenSpy = jest
        .spyOn(application.expressApp, 'listen')
        .mockImplementation(((port: any, host: any, callback: any) => {
          callback();
          return {
            close: jest.fn(),
            closeAllConnections: jest.fn(),
          };
        }) as any);

      await application.start();

      expect(
        DatabaseInitializationService.printServerInitResults,
      ).toHaveBeenCalledTimes(1);
      expect(
        DatabaseInitializationService.printServerInitResults,
      ).toHaveBeenCalledWith(mockInitResults, false, expect.any(Function));

      listenSpy.mockRestore();
    }, 10000); // Increase timeout

    it('should handle initializeDevDatabase errors', async () => {
      // Clear previous mock calls
      jest.clearAllMocks();

      const mockError = new Error('Database initialization failed');

      jest
        .spyOn(application as any, 'initializeDevDatabase')
        .mockRejectedValue(mockError);
      jest
        .spyOn(application as any, 'setupDevDatabase')
        .mockResolvedValue('mongodb://localhost/test');
      Object.defineProperty(application, 'devDatabase', {
        get: jest.fn(() => ({ getUri: () => 'mongodb://localhost/test' })),
        configurable: true,
      });
      jest
        .spyOn(BaseApplication.prototype as any, 'start')
        .mockResolvedValue(undefined);

      // Set NODE_ENV to test to make the error throw instead of exit
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      await expect(application.start()).rejects.toThrow(
        'Database initialization failed',
      );

      expect(
        DatabaseInitializationService.printServerInitResults,
      ).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    }, 10000); // Increase timeout
  });

  describe('stop()', () => {
    it('should stop the application', async () => {
      // Mock the base stop method
      jest
        .spyOn(BaseApplication.prototype, 'stop')
        .mockResolvedValue(undefined);

      // Mock server
      const mockServer = {
        close: jest.fn((cb) => cb()),
        closeAllConnections: jest.fn(),
      };
      (application as any).server = mockServer;
      (application as any)._ready = true;

      await application.stop();

      expect(mockServer.closeAllConnections).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
      expect(application.ready).toBe(false);
    });

    it('should handle missing server gracefully', async () => {
      jest
        .spyOn(BaseApplication.prototype, 'stop')
        .mockResolvedValue(undefined);
      (application as any).server = null;
      (application as any)._ready = true;

      await expect(application.stop()).resolves.not.toThrow();
      expect(application.ready).toBe(false);
    });
  });

  describe('registerServices()', () => {
    it('should call registerServices during construction', () => {
      const registerServicesSpy = jest.spyOn(
        Application.prototype as any,
        'registerServices',
      );

      const apiRouterFactory = jest.fn((app) => new BaseRouter(app));
      const testApp = new Application(
        env,
        apiRouterFactory,
        (connection: Connection) => mockSchemaMap,
        async () => ({ success: true, data: {} as any }),
        () => 'test-hash',
        {
          corsWhitelist: [],
          csp: {
            defaultSrc: [],
            imgSrc: [],
            connectSrc: [],
            scriptSrc: [],
            styleSrc: [],
            fontSrc: [],
            frameSrc: [],
          },
        },
        LocalhostConstants,
      );

      expect(registerServicesSpy).toHaveBeenCalled();

      registerServicesSpy.mockRestore();
    });
  });
});
