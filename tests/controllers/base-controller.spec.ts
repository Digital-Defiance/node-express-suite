import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../src/controllers/base';
import { MissingValidatedDataError } from '../../src/errors';

describe('BaseController', () => {
  class TestController extends BaseController<any, any, string> {
    protected initRouteDefinitions(): void {
      this.routeDefinitions = [];
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

  describe('user getter', () => {
    it('should throw when no active request', () => {
      expect(() => controller.user).toThrow();
    });
  });

  describe('validatedBody getter', () => {
    it('should throw when no active request', () => {
      expect(() => controller.validatedBody).toThrow();
    });
  });

  describe('req getter', () => {
    it('should throw when no active request', () => {
      expect(() => controller.req).toThrow();
    });
  });

  describe('res getter', () => {
    it('should throw when no active response', () => {
      expect(() => controller.res).toThrow();
    });
  });

  describe('router', () => {
    it('should have router instance', () => {
      expect(controller.router).toBeDefined();
    });
  });
});
