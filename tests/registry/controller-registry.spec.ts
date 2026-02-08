/**
 * @fileoverview Unit tests for ControllerRegistry
 */

import {
  ControllerRegistry,
  RegisteredController,
} from '../../src/registry/controller-registry';
import { RouteConfig } from '../../src/types';

describe('ControllerRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    ControllerRegistry.clear();
  });

  describe('register', () => {
    it('should register a controller with routes', () => {
      const routes: RouteConfig<any, any>[] = [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
        },
        {
          method: 'post',
          path: '/',
          handlerKey: 'create',
          useAuthentication: true,
          useCryptoAuthentication: false,
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      expect(ControllerRegistry.size).toBe(1);
      expect(ControllerRegistry.has('UsersController')).toBe(true);
    });

    it('should register multiple controllers', () => {
      ControllerRegistry.register('/users', 'UsersController', []);
      ControllerRegistry.register('/posts', 'PostsController', []);
      ControllerRegistry.register('/comments', 'CommentsController', []);

      expect(ControllerRegistry.size).toBe(3);
    });

    it('should overwrite existing controller with same name', () => {
      const routes1: RouteConfig<any, any>[] = [
        {
          method: 'get',
          path: '/old',
          handlerKey: 'old',
          useAuthentication: false,
          useCryptoAuthentication: false,
        },
      ];
      const routes2: RouteConfig<any, any>[] = [
        {
          method: 'get',
          path: '/new',
          handlerKey: 'new',
          useAuthentication: false,
          useCryptoAuthentication: false,
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes1);
      ControllerRegistry.register('/users', 'UsersController', routes2);

      expect(ControllerRegistry.size).toBe(1);
      const controller = ControllerRegistry.get('UsersController');
      expect(controller?.routeDefinitions[0].path).toBe('/new');
    });
  });

  describe('get', () => {
    it('should return registered controller', () => {
      const routes: RouteConfig<any, any>[] = [
        {
          method: 'get',
          path: '/:id',
          handlerKey: 'getById',
          useAuthentication: false,
          useCryptoAuthentication: false,
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const controller = ControllerRegistry.get('UsersController');
      expect(controller).toBeDefined();
      expect(controller?.basePath).toBe('/users');
      expect(controller?.controllerName).toBe('UsersController');
      expect(controller?.routeDefinitions).toEqual(routes);
    });

    it('should return undefined for non-existent controller', () => {
      const controller = ControllerRegistry.get('NonExistentController');
      expect(controller).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no controllers registered', () => {
      const controllers = ControllerRegistry.getAll();
      expect(controllers).toEqual([]);
    });

    it('should return all registered controllers', () => {
      ControllerRegistry.register('/users', 'UsersController', []);
      ControllerRegistry.register('/posts', 'PostsController', []);

      const controllers = ControllerRegistry.getAll();
      expect(controllers).toHaveLength(2);
      expect(controllers.map((c) => c.controllerName)).toContain(
        'UsersController',
      );
      expect(controllers.map((c) => c.controllerName)).toContain(
        'PostsController',
      );
    });
  });

  describe('unregister', () => {
    it('should remove a registered controller', () => {
      ControllerRegistry.register('/users', 'UsersController', []);
      expect(ControllerRegistry.has('UsersController')).toBe(true);

      ControllerRegistry.unregister('UsersController');
      expect(ControllerRegistry.has('UsersController')).toBe(false);
      expect(ControllerRegistry.size).toBe(0);
    });

    it('should not throw when unregistering non-existent controller', () => {
      expect(() => {
        ControllerRegistry.unregister('NonExistentController');
      }).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all registered controllers', () => {
      ControllerRegistry.register('/users', 'UsersController', []);
      ControllerRegistry.register('/posts', 'PostsController', []);
      ControllerRegistry.register('/comments', 'CommentsController', []);

      expect(ControllerRegistry.size).toBe(3);

      ControllerRegistry.clear();

      expect(ControllerRegistry.size).toBe(0);
      expect(ControllerRegistry.getAll()).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return true for registered controller', () => {
      ControllerRegistry.register('/users', 'UsersController', []);
      expect(ControllerRegistry.has('UsersController')).toBe(true);
    });

    it('should return false for non-registered controller', () => {
      expect(ControllerRegistry.has('UsersController')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return 0 for empty registry', () => {
      expect(ControllerRegistry.size).toBe(0);
    });

    it('should return correct count', () => {
      ControllerRegistry.register('/a', 'A', []);
      expect(ControllerRegistry.size).toBe(1);

      ControllerRegistry.register('/b', 'B', []);
      expect(ControllerRegistry.size).toBe(2);

      ControllerRegistry.unregister('A');
      expect(ControllerRegistry.size).toBe(1);
    });
  });
});
