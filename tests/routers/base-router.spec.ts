import { Router } from 'express';
import { BaseRouter } from '../../src/routers/base';

describe('BaseRouter', () => {
  class TestRouter extends BaseRouter {
    constructor(application: any) {
      super(application);
    }
  }

  it('should create router instance', () => {
    const mockApp = { environment: {}, constants: {} };
    const router = new TestRouter(mockApp as any);
    expect(router.router).toBeInstanceOf(Router);
  });

  it('should store application reference', () => {
    const mockApp = { environment: {}, constants: {} };
    const router = new TestRouter(mockApp as any);
    expect(router.application).toBe(mockApp);
  });
});
