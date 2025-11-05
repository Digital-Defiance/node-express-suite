import { Pipeline } from '../../src/pipeline/pipeline-builder';
import { Request, Response, NextFunction, RequestHandler } from 'express';

describe('Pipeline', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('create', () => {
    it('should create new pipeline instance', () => {
      const pipeline = Pipeline.create();
      expect(pipeline).toBeInstanceOf(Pipeline);
    });
  });

  describe('use', () => {
    it('should add middleware to pipeline', () => {
      const middleware: RequestHandler = (req, res, next) => next();
      const pipeline = Pipeline.create().use(middleware);
      
      expect(pipeline).toBeInstanceOf(Pipeline);
    });

    it('should chain multiple middleware', () => {
      const middleware1: RequestHandler = (req, res, next) => next();
      const middleware2: RequestHandler = (req, res, next) => next();
      const middleware3: RequestHandler = (req, res, next) => next();
      
      const pipeline = Pipeline.create()
        .use(middleware1)
        .use(middleware2)
        .use(middleware3);
      
      expect(pipeline).toBeInstanceOf(Pipeline);
    });

    it('should return same instance for chaining', () => {
      const pipeline = Pipeline.create();
      const middleware: RequestHandler = (req, res, next) => next();
      
      const result = pipeline.use(middleware);
      expect(result).toBe(pipeline);
    });
  });

  describe('build', () => {
    it('should return empty array for empty pipeline', () => {
      const pipeline = Pipeline.create();
      const handlers = pipeline.build();
      
      expect(handlers).toEqual([]);
    });

    it('should return array of middleware', () => {
      const middleware1: RequestHandler = (req, res, next) => next();
      const middleware2: RequestHandler = (req, res, next) => next();
      
      const pipeline = Pipeline.create()
        .use(middleware1)
        .use(middleware2);
      
      const handlers = pipeline.build();
      
      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toBe(middleware1);
      expect(handlers[1]).toBe(middleware2);
    });

    it('should preserve middleware order', () => {
      const order: number[] = [];
      
      const middleware1: RequestHandler = (req, res, next) => {
        order.push(1);
        next();
      };
      const middleware2: RequestHandler = (req, res, next) => {
        order.push(2);
        next();
      };
      const middleware3: RequestHandler = (req, res, next) => {
        order.push(3);
        next();
      };
      
      const pipeline = Pipeline.create()
        .use(middleware1)
        .use(middleware2)
        .use(middleware3);
      
      const handlers = pipeline.build();
      
      handlers[0](mockReq as Request, mockRes as Response, mockNext);
      handlers[1](mockReq as Request, mockRes as Response, mockNext);
      handlers[2](mockReq as Request, mockRes as Response, mockNext);
      
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('integration scenarios', () => {
    it('should support authentication pipeline', () => {
      const authenticate: RequestHandler = (req, res, next) => {
        (req as any).user = { id: 1 };
        next();
      };
      
      const authorize: RequestHandler = (req, res, next) => {
        if ((req as any).user) next();
        else res.status?.(403);
      };
      
      const pipeline = Pipeline.create()
        .use(authenticate)
        .use(authorize);
      
      const handlers = pipeline.build();
      expect(handlers).toHaveLength(2);
    });

    it('should support validation pipeline', () => {
      const validateBody: RequestHandler = (req, res, next) => next();
      const validateParams: RequestHandler = (req, res, next) => next();
      const sanitize: RequestHandler = (req, res, next) => next();
      
      const pipeline = Pipeline.create()
        .use(validateBody)
        .use(validateParams)
        .use(sanitize);
      
      const handlers = pipeline.build();
      expect(handlers).toHaveLength(3);
    });

    it('should support logging pipeline', () => {
      const logRequest: RequestHandler = (req, res, next) => {
        console.log('Request received');
        next();
      };
      
      const logResponse: RequestHandler = (req, res, next) => {
        console.log('Response sent');
        next();
      };
      
      const pipeline = Pipeline.create()
        .use(logRequest)
        .use(logResponse);
      
      const handlers = pipeline.build();
      expect(handlers).toHaveLength(2);
    });

    it('should support error handling pipeline', () => {
      const errorHandler: RequestHandler = (req, res, next) => {
        try {
          next();
        } catch (error) {
          res.status?.(500);
        }
      };
      
      const pipeline = Pipeline.create().use(errorHandler);
      const handlers = pipeline.build();
      
      expect(handlers).toHaveLength(1);
    });

    it('should support complex multi-stage pipeline', () => {
      const stage1: RequestHandler = (req, res, next) => next();
      const stage2: RequestHandler = (req, res, next) => next();
      const stage3: RequestHandler = (req, res, next) => next();
      const stage4: RequestHandler = (req, res, next) => next();
      const stage5: RequestHandler = (req, res, next) => next();
      
      const pipeline = Pipeline.create()
        .use(stage1)
        .use(stage2)
        .use(stage3)
        .use(stage4)
        .use(stage5);
      
      const handlers = pipeline.build();
      expect(handlers).toHaveLength(5);
    });
  });

  describe('edge cases', () => {
    it('should handle async middleware', () => {
      const asyncMiddleware: RequestHandler = async (req, res, next) => {
        await Promise.resolve();
        next();
      };
      
      const pipeline = Pipeline.create().use(asyncMiddleware);
      const handlers = pipeline.build();
      
      expect(handlers).toHaveLength(1);
    });

    it('should handle middleware that modifies request', () => {
      const middleware: RequestHandler = (req, res, next) => {
        (req as any).custom = 'value';
        next();
      };
      
      const pipeline = Pipeline.create().use(middleware);
      const handlers = pipeline.build();
      
      handlers[0](mockReq as Request, mockRes as Response, mockNext);
      expect((mockReq as any).custom).toBe('value');
    });

    it('should handle middleware that stops chain', () => {
      const middleware: RequestHandler = (req, res, next) => {
        // Don't call next()
      };
      
      const pipeline = Pipeline.create().use(middleware);
      const handlers = pipeline.build();
      
      handlers[0](mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
