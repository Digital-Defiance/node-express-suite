import { RouteBuilder } from '../../src/routing/route-builder';
import { z } from 'zod';

describe('RouteBuilder', () => {
  describe('create', () => {
    it('should create new instance', () => {
      const builder = RouteBuilder.create();
      expect(builder).toBeInstanceOf(RouteBuilder);
    });
  });

  describe('HTTP methods', () => {
    it('should set GET method', () => {
      const config = RouteBuilder.create()
        .get('/test')
        .handle(() => {});
      expect(config.method).toBe('get');
      expect(config.path).toBe('/test');
    });

    it('should set POST method', () => {
      const config = RouteBuilder.create()
        .post('/test')
        .handle(() => {});
      expect(config.method).toBe('post');
    });

    it('should set PUT method', () => {
      const config = RouteBuilder.create()
        .put('/test')
        .handle(() => {});
      expect(config.method).toBe('put');
    });

    it('should set DELETE method', () => {
      const config = RouteBuilder.create()
        .delete('/test')
        .handle(() => {});
      expect(config.method).toBe('delete');
    });

    it('should set PATCH method', () => {
      const config = RouteBuilder.create()
        .patch('/test')
        .handle(() => {});
      expect(config.method).toBe('patch');
    });
  });

  describe('auth', () => {
    it('should enable auth by default', () => {
      const config = RouteBuilder.create()
        .get('/test')
        .auth()
        .handle(() => {});
      expect(config.options.auth).toBe(true);
    });

    it('should disable auth when false', () => {
      const config = RouteBuilder.create()
        .get('/test')
        .auth(false)
        .handle(() => {});
      expect(config.options.auth).toBe(false);
    });
  });

  describe('cryptoAuth', () => {
    it('should enable cryptoAuth by default', () => {
      const config = RouteBuilder.create()
        .get('/test')
        .cryptoAuth()
        .handle(() => {});
      expect(config.options.cryptoAuth).toBe(true);
    });

    it('should disable cryptoAuth when false', () => {
      const config = RouteBuilder.create()
        .get('/test')
        .cryptoAuth(false)
        .handle(() => {});
      expect(config.options.cryptoAuth).toBe(false);
    });
  });

  describe('validate', () => {
    it('should set validation array', () => {
      const validation = [] as any[];
      const config = RouteBuilder.create()
        .get('/test')
        .validate(validation)
        .handle(() => {});
      expect(config.options.validation).toBe(validation);
    });

    it('should set validation function', () => {
      const validationFn = (lang: string) => [];
      const config = RouteBuilder.create()
        .get('/test')
        .validate(validationFn)
        .handle(() => {});
      expect(config.options.validation).toBe(validationFn);
    });
  });

  describe('schema', () => {
    it('should set zod schema', () => {
      const schema = z.object({ name: z.string() });
      const config = RouteBuilder.create()
        .get('/test')
        .schema(schema)
        .handle(() => {});
      expect(config.options.schema).toBe(schema);
    });
  });

  describe('use', () => {
    it('should add single middleware', () => {
      const middleware = jest.fn();
      const config = RouteBuilder.create()
        .get('/test')
        .use(middleware)
        .handle(() => {});
      expect(config.options.middleware).toEqual([middleware]);
    });

    it('should add multiple middleware', () => {
      const mw1 = jest.fn();
      const mw2 = jest.fn();
      const config = RouteBuilder.create()
        .get('/test')
        .use(mw1, mw2)
        .handle(() => {});
      expect(config.options.middleware).toEqual([mw1, mw2]);
    });

    it('should chain middleware calls', () => {
      const mw1 = jest.fn();
      const mw2 = jest.fn();
      const config = RouteBuilder.create()
        .get('/test')
        .use(mw1)
        .use(mw2)
        .handle(() => {});
      expect(config.options.middleware).toEqual([mw1, mw2]);
    });
  });

  describe('transaction', () => {
    it('should enable transaction by default', () => {
      const config = RouteBuilder.create()
        .get('/test')
        .transaction()
        .handle(() => {});
      expect(config.options.transaction).toBe(true);
    });

    it('should disable transaction when false', () => {
      const config = RouteBuilder.create()
        .get('/test')
        .transaction(false)
        .handle(() => {});
      expect(config.options.transaction).toBe(false);
    });

    it('should set transaction timeout', () => {
      const config = RouteBuilder.create()
        .get('/test')
        .transaction(true, 5000)
        .handle(() => {});
      expect(config.options.transaction).toBe(true);
      expect(config.options.transactionTimeout).toBe(5000);
    });
  });

  describe('rawJson', () => {
    it('should enable rawJson by default', () => {
      const config = RouteBuilder.create()
        .get('/test')
        .rawJson()
        .handle(() => {});
      expect(config.options.rawJson).toBe(true);
    });

    it('should disable rawJson when false', () => {
      const config = RouteBuilder.create()
        .get('/test')
        .rawJson(false)
        .handle(() => {});
      expect(config.options.rawJson).toBe(false);
    });
  });

  describe('handle', () => {
    it('should throw if method not set', () => {
      expect(() => {
        RouteBuilder.create().handle(() => {});
      }).toThrow('Method and path must be set before calling handle()');
    });

    it('should throw if path not set', () => {
      const builder = RouteBuilder.create();
      (builder as any).config.method = 'get';
      expect(() => {
        builder.handle(() => {});
      }).toThrow('Method and path must be set before calling handle()');
    });

    it('should return complete config', () => {
      const handler = () => {};
      const config = RouteBuilder.create()
        .get('/test')
        .handle(handler);
      
      expect(config.method).toBe('get');
      expect(config.path).toBe('/test');
      expect(config.handler).toBe(handler);
      expect(config.options).toBeDefined();
    });
  });

  describe('fluent API', () => {
    it('should support full chain', () => {
      const handler = jest.fn();
      const middleware = jest.fn();
      const schema = z.object({ id: z.number() });
      
      const config = RouteBuilder.create()
        .post('/users')
        .auth()
        .cryptoAuth()
        .schema(schema)
        .use(middleware)
        .transaction(true, 3000)
        .rawJson()
        .handle(handler);
      
      expect(config.method).toBe('post');
      expect(config.path).toBe('/users');
      expect(config.handler).toBe(handler);
      expect(config.options.auth).toBe(true);
      expect(config.options.cryptoAuth).toBe(true);
      expect(config.options.schema).toBe(schema);
      expect(config.options.middleware).toEqual([middleware]);
      expect(config.options.transaction).toBe(true);
      expect(config.options.transactionTimeout).toBe(3000);
      expect(config.options.rawJson).toBe(true);
    });

    it('should return builder for chaining', () => {
      const builder = RouteBuilder.create();
      expect(builder.get('/test')).toBe(builder);
      expect(builder.auth()).toBe(builder);
      expect(builder.cryptoAuth()).toBe(builder);
      expect(builder.use(jest.fn())).toBe(builder);
      expect(builder.transaction()).toBe(builder);
      expect(builder.rawJson()).toBe(builder);
    });
  });
});
