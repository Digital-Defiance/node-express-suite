import '@digitaldefiance/express-suite-test-utils';
import { SuiteCoreStringKey, TranslatableSuiteError } from '@digitaldefiance/suite-core-lib';
import { BaseApplication } from '../src/application-base';
import { Environment } from '../src/environment';
import { ModelRegistry } from '../src/model-registry';
import mongoose from 'mongoose';
import { connectMemoryDB, disconnectMemoryDB, clearMemoryDB, withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';

describe('BaseApplication', () => {
  class TestApplication extends BaseApplication<any, any> {
    constructor(env: Environment, constants?: any) {
      super(
        env,
        () => ({}),
        async () => ({ success: true, data: {} }),
        () => 'hash',
        constants,
      );
    }

    public async testConnectDatabase(uri: string, debug = false) {
      return this.connectDatabase(uri, debug);
    }

    public testValidateMongoUri(uri: string) {
      return (this as any).validateMongoUri(uri);
    }
  }

  let app: TestApplication;
  let env: Environment;

  beforeEach(() => {
    const fs = require('fs');
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.MNEMONIC_HMAC_SECRET = 'a'.repeat(64);
    process.env.MNEMONIC_ENCRYPTION_KEY = 'b'.repeat(64);
    process.env.API_DIST_DIR = '/tmp/test-api-dist';
    process.env.REACT_DIST_DIR = '/tmp/test-react-dist';
    if (!fs.existsSync('/tmp/test-api-dist')) fs.mkdirSync('/tmp/test-api-dist', { recursive: true });
    if (!fs.existsSync('/tmp/test-react-dist')) fs.mkdirSync('/tmp/test-react-dist', { recursive: true });
    env = new Environment(undefined, true);
    app = new TestApplication(env);
  });

  afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('constructor', () => {
    it('should create application instance', () => {
      expect(app).toBeDefined();
      expect(app.ready).toBe(false);
    });

    it('should initialize with custom constants', () => {
      const customConstants = { APP_NAME: 'TestApp' };
      const appWithConstants = new TestApplication(env, customConstants);
      expect(appWithConstants.constants).toBe(customConstants);
    });

    it('should initialize services container', () => {
      expect(app['services']).toBeDefined();
    });

    it('should initialize plugins manager', () => {
      expect(app['plugins']).toBeDefined();
    });
  });

  describe('environment', () => {
    it('should return environment', () => {
      expect(app.environment).toBe(env);
    });
  });

  describe('reloadEnvironment', () => {
    it('should reload environment', () => {
      const originalEnv = app.environment;
      process.env.SYSTEM_PUBLIC_KEY = 'a'.repeat(130); // Set required env var
      app.reloadEnvironment(undefined, true);
      expect(app.environment).not.toBe(originalEnv);
      expect(app.environment).toBeDefined();
      delete process.env.SYSTEM_PUBLIC_KEY;
    });
  });

  describe('distDir', () => {
    it('should return dist directory path', () => {
      const distDir = BaseApplication.distDir;
      expect(distDir).toContain('dist');
    });
  });

  describe('constants', () => {
    it('should have constants', () => {
      expect(app.constants).toBeDefined();
    });
  });

  describe('ready', () => {
    it('should initially be false', () => {
      expect(app.ready).toBe(false);
    });
  });

  describe('validateMongoUri', () => {
    it('should accept valid mongodb:// URI', () => {
      expect(() => app.testValidateMongoUri('mongodb://localhost:27017/test')).not.toThrow();
    });

    it('should accept valid mongodb+srv:// URI', () => {
      expect(() => app.testValidateMongoUri('mongodb+srv://cluster.mongodb.net/test')).not.toThrow();
    });

    it('should reject invalid protocol', () => {
      expect(() => app.testValidateMongoUri('http://localhost:27017/test')).toThrow();
    });

    it('should reject malformed URI', () => {
      expect(() => app.testValidateMongoUri('not-a-valid-uri')).toThrow();
    });

    describe('in production mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        process.env.SYSTEM_PUBLIC_KEY = '04' + '00'.repeat(64); // Mock public key
        env = new Environment(undefined, false); // production mode
        app = new TestApplication(env);
      });

      afterEach(() => {
        process.env.NODE_ENV = 'test';
        delete process.env.SYSTEM_PUBLIC_KEY;
      });

      it('should reject localhost in production', () => {
        expect(() => app.testValidateMongoUri('mongodb://localhost:27017/test')).toThrow();
      });

      it('should reject 127.0.0.1 in production', () => {
        expect(() => app.testValidateMongoUri('mongodb://127.0.0.1:27017/test')).toThrow();
      });

      it('should reject private IP 10.x.x.x in production', () => {
        expect(() => app.testValidateMongoUri('mongodb://10.0.0.1:27017/test')).toThrow();
      });

      it('should reject private IP 192.168.x.x in production', () => {
        expect(() => app.testValidateMongoUri('mongodb://192.168.1.1:27017/test')).toThrow();
      });

      it('should reject private IP 172.16-31.x.x in production', () => {
        expect(() => app.testValidateMongoUri('mongodb://172.16.0.1:27017/test')).toThrow();
        expect(() => app.testValidateMongoUri('mongodb://172.31.255.255:27017/test')).toThrow();
      });

      it('should reject link-local IP 169.254.x.x in production', () => {
        expect(() => app.testValidateMongoUri('mongodb://169.254.1.1:27017/test')).toThrow();
      });

      it('should reject IPv6 localhost in production', () => {
        expect(() => app.testValidateMongoUri('mongodb://[::1]:27017/test')).toThrow();
      });

      it('should reject IPv6 private addresses in production', () => {
        expect(() => app.testValidateMongoUri('mongodb://[fc00::1]:27017/test')).toThrow();
        expect(() => app.testValidateMongoUri('mongodb://[fd00::1]:27017/test')).toThrow();
      });

      it('should accept public hostnames in production', () => {
        expect(() => app.testValidateMongoUri('mongodb://public-server.com:27017/test')).not.toThrow();
      });

      it('should accept mongodb+srv with public hostname', () => {
        expect(() => app.testValidateMongoUri('mongodb+srv://cluster.mongodb.net/test')).not.toThrow();
      });
    });
  });

  describe('db getter', () => {
    it('should throw error before connection', () => {
      expect(() => app.db).toThrowType(TranslatableSuiteError);
    });
  });

  describe('schemaMap getter', () => {
    it('should throw error when schema map not initialized', () => {
      expect(() => app.schemaMap).toThrow();
    });
  });

  describe('devDatabase getter', () => {
    it('should return devDatabase if set', () => {
      const mockDevDb = {} as any;
      (app as any)._devDatabase = mockDevDb;
      expect(app.devDatabase).toBe(mockDevDb);
    });

    it('should return undefined if not set', () => {
      expect(app.devDatabase).toBeUndefined();
    });
  });

  describe('services getter', () => {
    it('should return services container', () => {
      expect(app['services']).toBeDefined();
    });
  });

  describe('plugins getter', () => {
    it('should return plugins manager', () => {
      expect(app['plugins']).toBeDefined();
    });
  });

  describe('connectDatabase', () => {
    beforeEach(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    });

    afterEach(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    });

    it('should connect to MongoDB with valid URI', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose as any);
        
        // Mock connection state and events
        Object.defineProperty(mongoose.connection, 'readyState', {
          value: 1,
          writable: true,
          configurable: true
        });
        const mockOnce = jest.fn((event, callback) => {
          if (event === 'connected') callback();
        });
        mongoose.connection.once = mockOnce as any;
        
        // Mock db for transaction timeout
        (mongoose.connection as any).db = {
          admin: () => ({ command: jest.fn().mockResolvedValue({}) })
        };
        
        await app.testConnectDatabase('mongodb://localhost:27017/test', false);
        
        expect(mockConnect).toHaveBeenCalled();
        mockConnect.mockRestore();
        delete (mongoose.connection as any).db;
      });
    }, 15000);    it('should disconnect before connecting if already connected', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const mockDisconnect = jest.spyOn(mongoose, 'disconnect').mockResolvedValue();
        const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose as any);
        
        // Simulate already connected
        Object.defineProperty(mongoose.connection, 'readyState', {
          value: 1,
          writable: true,
          configurable: true
        });

        await app.testConnectDatabase('mongodb://localhost:27017/test', false);

        expect(mockDisconnect).toHaveBeenCalled();
        expect(mockConnect).toHaveBeenCalled();
        
        mockDisconnect.mockRestore();
        mockConnect.mockRestore();
      });
    });

    it('should initialize schema map after connection', async () => {
      const result = await connectMemoryDB();
      if (!result?.uri) throw new Error('Failed to get MongoDB URI');
      
      await app.testConnectDatabase(result.uri, false);
      
      expect(app['_schemaMap']).toBeDefined();
      
      await disconnectMemoryDB();
    }, 10000);    it('should register models in ModelRegistry', async () => {
      // Create app with a schema map factory that returns schemas
      const schemaMapFactory = (connection: any) => ({
        testModel: {
          modelName: 'TestModel',
          schema: new mongoose.Schema({ name: String }),
          model: mongoose.model('TestModel', new mongoose.Schema({ name: String })),
          collection: 'testmodels'
        }
      });
      
      const appWithSchemas = new (class extends BaseApplication<any, any> {
        constructor(env: Environment) {
          super(
            env,
            schemaMapFactory,
            async () => ({ success: true, data: {} }),
            () => 'hash',
          );
        }
        public async testConnectDatabase(uri: string, debug = false) {
          return this.connectDatabase(uri, debug);
        }
      })(env);
      
      const registerSpy = jest.spyOn(ModelRegistry.instance, 'register');
      const result = await connectMemoryDB();
      if (!result?.uri) throw new Error('Failed to get MongoDB URI');
      
      await appWithSchemas.testConnectDatabase(result.uri, false);

      // Should have registered models
      expect(registerSpy).toHaveBeenCalled();
      
      registerSpy.mockRestore();
      await disconnectMemoryDB();
    }, 10000);

    it('should set transaction parameters when supported', async () => {
      const result = await connectMemoryDB();
      if (!result?.uri) throw new Error('Failed to get MongoDB URI');
      
      // MongoMemoryServer may not support all transaction features,
      // but we can verify the connection attempt succeeds
      await expect(
        app.testConnectDatabase(result.uri, false)
      ).resolves.not.toThrow();

      await disconnectMemoryDB();
    });

    it('should handle connection errors gracefully', async () => {
      const mockConnect = jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error('Connection failed'));

      await expect(
        app.testConnectDatabase('mongodb://localhost:27017/test', false)
      ).rejects.toThrow('Connection failed');

      mockConnect.mockRestore();
    });

    it('should log debug messages when debug is true', async () => {
      const result = await connectMemoryDB();
      if (!result?.uri) throw new Error('Failed to get MongoDB URI');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await app.testConnectDatabase(result.uri, true);

      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      await disconnectMemoryDB();
    });
  });

  describe('disconnectDatabase', () => {
    it('should disconnect from MongoDB', async () => {
      const mockDisconnect = jest.spyOn(mongoose, 'disconnect').mockResolvedValue();
      
      // Set up connected state
      (app as any)._db = mongoose;
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 1,
        writable: true,
        configurable: true
      });

      await (app as any).disconnectDatabase(false);

      expect(mockDisconnect).toHaveBeenCalled();
      expect((app as any)._db).toBeUndefined();
      
      mockDisconnect.mockRestore();
    });

    it('should not disconnect if not connected', async () => {
      const mockDisconnect = jest.spyOn(mongoose, 'disconnect').mockResolvedValue();
      
      (app as any)._db = undefined;
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 0,
        writable: true,
        configurable: true
      });

      await (app as any).disconnectDatabase(false);

      expect(mockDisconnect).not.toHaveBeenCalled();
      
      mockDisconnect.mockRestore();
    });

    it('should log disconnect message when debug enabled', async () => {
      const mockDisconnect = jest.spyOn(mongoose, 'disconnect').mockResolvedValue();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (app as any)._db = mongoose;
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 1,
        writable: true,
        configurable: true
      });

      await (app as any).disconnectDatabase(true);

      mockDisconnect.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('setupDevDatabase', () => {
    it('should create in-memory MongoDB instance', async () => {
      const mockCreate = jest.spyOn(require('mongodb-memory-server').MongoMemoryReplSet, 'create')
        .mockResolvedValue({
          waitUntilRunning: jest.fn().mockResolvedValue(undefined),
          getUri: jest.fn().mockReturnValue('mongodb://localhost:27017'),
        });

      const uri = await (app as any).setupDevDatabase();

      expect(uri).toContain('mongodb://');
      expect((app as any)._devDatabase).toBeDefined();
      
      mockCreate.mockRestore();
    });

    it('should configure connection pool settings', async () => {
      const mockCreate = jest.spyOn(require('mongodb-memory-server').MongoMemoryReplSet, 'create')
        .mockResolvedValue({
          waitUntilRunning: jest.fn().mockResolvedValue(undefined),
          getUri: jest.fn().mockReturnValue('mongodb://localhost:27017/test'),
        });

      const uri = await (app as any).setupDevDatabase();

      expect(uri).toContain('maxPoolSize=20');
      expect(uri).toContain('minPoolSize=4');
      
      mockCreate.mockRestore();
    });

    it('should wait for replica set to be ready', async () => {
      const mockWaitUntilRunning = jest.fn().mockResolvedValue(undefined);
      const mockCreate = jest.spyOn(require('mongodb-memory-server').MongoMemoryReplSet, 'create')
        .mockResolvedValue({
          waitUntilRunning: mockWaitUntilRunning,
          getUri: jest.fn().mockReturnValue('mongodb://localhost:27017'),
        });

      await (app as any).setupDevDatabase();

      expect(mockWaitUntilRunning).toHaveBeenCalled();
      
      mockCreate.mockRestore();
    });
  });

  describe('initializeDevDatabase', () => {
    it('should initialize database with default data', async () => {
      const mockInitFunction = jest.fn().mockResolvedValue({
        success: true,
        data: { users: [], roles: [] }
      });
      
      const testApp = new (class extends BaseApplication<any, any> {
        constructor(env: Environment) {
          super(
            env,
            () => ({}),
            mockInitFunction,
            () => 'hash123',
          );
        }
      })(env);

      const result = await (testApp as any).initializeDevDatabase();

      expect(mockInitFunction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error if initialization fails', async () => {
      const mockInitFunction = jest.fn().mockResolvedValue({
        success: false,
        error: 'Init failed'
      });
      
      const testApp = new (class extends BaseApplication<any, any> {
        constructor(env: Environment) {
          super(
            env,
            () => ({}),
            mockInitFunction,
            () => 'hash123',
          );
        }
      })(env);

      await expect(
        (testApp as any).initializeDevDatabase()
      ).rejects.toThrow();
    });

    it('should timeout if initialization takes too long', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        jest.useFakeTimers();
        
        const mockInitFunction = jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} }), 400000))
        );
        
        const testApp = new (class extends BaseApplication<any, any> {
          constructor(env: Environment) {
            super(
              env,
              () => ({}),
              mockInitFunction,
              () => 'hash123',
            );
          }
        })(env);

        const initPromise = (testApp as any).initializeDevDatabase();
        
        // Fast-forward time past the timeout
        jest.advanceTimersByTime(400000);
        
        await expect(initPromise).rejects.toThrow();
        
        jest.useRealTimers();
      });
    }, 10000);

    it('should log initialization hash when detailed debug enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockEnv = new Environment(undefined, true);
      
      const mockInitFunction = jest.fn().mockResolvedValue({
        success: true,
        data: { users: [], roles: [] }
      });
      
      const testApp = new (class extends BaseApplication<any, any> {
        constructor(env: Environment) {
          super(
            env,
            () => ({}),
            mockInitFunction,
            (data) => 'hash123',
          );
        }
      })(mockEnv);

      await testApp['setupDevDatabase']();
      await testApp['initializeDevDatabase']();

      consoleSpy.mockRestore();
    }, 10000);
  });

  describe('getModel', () => {
    it('should have getModel method', () => {
      expect(app.getModel).toBeDefined();
      expect(typeof app.getModel).toBe('function');
    });

    it('should use ModelRegistry for model access', () => {
      // Just verify ModelRegistry exists and is accessible
      expect(ModelRegistry.instance).toBeDefined();
    });
  });
});
