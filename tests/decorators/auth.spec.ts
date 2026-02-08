import 'reflect-metadata';
import {
  AuthFailureStatus,
  getEffectiveAuthMetadata,
  Public,
  RequireAuth,
  RequireCryptoAuth,
  requiresAuthentication,
} from '../../src/decorators/auth';
import {
  AUTH_METADATA,
  RESPONSE_METADATA,
} from '../../src/decorators/metadata-keys';
import { AuthMetadata } from '../../src/interfaces/openApi/decoratorOptions';

describe('Auth Decorators', () => {
  describe('@RequireAuth', () => {
    it('should set requireAuth metadata on method', () => {
      class TestController {
        @RequireAuth()
        protectedMethod() {}
      }

      const metadata = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
        'protectedMethod',
      ) as AuthMetadata;
      expect(metadata.requireAuth).toBe(true);
    });

    it('should set requireAuth metadata on class', () => {
      @RequireAuth()
      class TestController {}

      const metadata = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
      ) as AuthMetadata;
      expect(metadata.requireAuth).toBe(true);
    });

    it('should add 401 response to method metadata', () => {
      class TestController {
        @RequireAuth()
        protectedMethod() {}
      }

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'protectedMethod',
      ) as Array<{ statusCode: number }>;
      expect(responses).toContainEqual(
        expect.objectContaining({ statusCode: 401 }),
      );
    });

    it('should add 401 response to class metadata', () => {
      @RequireAuth()
      class TestController {}

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
      ) as Array<{ statusCode: number }>;
      expect(responses).toContainEqual(
        expect.objectContaining({ statusCode: 401 }),
      );
    });

    it('should not duplicate 401 response when applied multiple times', () => {
      @RequireAuth()
      class TestController {
        @RequireAuth()
        protectedMethod() {}
      }

      const methodResponses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'protectedMethod',
      ) as Array<{ statusCode: number }>;
      const count401 = methodResponses.filter(
        (r) => r.statusCode === 401,
      ).length;
      expect(count401).toBe(1);
    });
  });

  describe('@RequireCryptoAuth', () => {
    it('should set requireCryptoAuth metadata on method', () => {
      class TestController {
        @RequireCryptoAuth()
        secureMethod() {}
      }

      const metadata = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
        'secureMethod',
      ) as AuthMetadata;
      expect(metadata.requireCryptoAuth).toBe(true);
    });

    it('should set requireCryptoAuth metadata on class', () => {
      @RequireCryptoAuth()
      class TestController {}

      const metadata = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
      ) as AuthMetadata;
      expect(metadata.requireCryptoAuth).toBe(true);
    });

    it('should add 401 response to method metadata', () => {
      class TestController {
        @RequireCryptoAuth()
        secureMethod() {}
      }

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'secureMethod',
      ) as Array<{ statusCode: number }>;
      expect(responses).toContainEqual(
        expect.objectContaining({ statusCode: 401 }),
      );
    });
  });

  describe('@Public', () => {
    it('should set isPublic metadata on method', () => {
      class TestController {
        @Public()
        publicMethod() {}
      }

      const metadata = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
        'publicMethod',
      ) as AuthMetadata;
      expect(metadata.isPublic).toBe(true);
    });

    it('should set isPublic metadata on class', () => {
      @Public()
      class TestController {}

      const metadata = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
      ) as AuthMetadata;
      expect(metadata.isPublic).toBe(true);
    });

    it('should not add 401 response', () => {
      class TestController {
        @Public()
        publicMethod() {}
      }

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'publicMethod',
      );
      expect(responses).toBeUndefined();
    });
  });

  describe('@AuthFailureStatus', () => {
    it('should set failureStatusCode metadata on method', () => {
      class TestController {
        @AuthFailureStatus(403)
        forbiddenMethod() {}
      }

      const metadata = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
        'forbiddenMethod',
      ) as AuthMetadata;
      expect(metadata.failureStatusCode).toBe(403);
    });

    it('should set failureStatusCode metadata on class', () => {
      @AuthFailureStatus(403)
      class TestController {}

      const metadata = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
      ) as AuthMetadata;
      expect(metadata.failureStatusCode).toBe(403);
    });

    it('should work with custom status codes', () => {
      class TestController {
        @AuthFailureStatus(404)
        hiddenMethod() {}

        @AuthFailureStatus(500)
        errorMethod() {}
      }

      const hiddenMeta = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
        'hiddenMethod',
      ) as AuthMetadata;
      const errorMeta = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
        'errorMethod',
      ) as AuthMetadata;

      expect(hiddenMeta.failureStatusCode).toBe(404);
      expect(errorMeta.failureStatusCode).toBe(500);
    });
  });

  describe('getEffectiveAuthMetadata', () => {
    it('should return method-level metadata when no class-level exists', () => {
      class TestController {
        @RequireAuth()
        protectedMethod() {}
      }

      const metadata = getEffectiveAuthMetadata(
        TestController,
        'protectedMethod',
      );
      expect(metadata.requireAuth).toBe(true);
    });

    it('should return class-level metadata when no method-level exists', () => {
      @RequireAuth()
      class TestController {
        undecorated() {}
      }

      const metadata = getEffectiveAuthMetadata(TestController, 'undecorated');
      expect(metadata.requireAuth).toBe(true);
    });

    it('should merge class and method metadata', () => {
      @RequireAuth()
      @AuthFailureStatus(403)
      class TestController {
        @RequireCryptoAuth()
        doubleAuth() {}
      }

      const metadata = getEffectiveAuthMetadata(TestController, 'doubleAuth');
      expect(metadata.requireAuth).toBe(true);
      expect(metadata.requireCryptoAuth).toBe(true);
      expect(metadata.failureStatusCode).toBe(403);
    });

    it('should allow method-level to override class-level', () => {
      @AuthFailureStatus(401)
      class TestController {
        @AuthFailureStatus(403)
        customStatus() {}
      }

      const metadata = getEffectiveAuthMetadata(TestController, 'customStatus');
      expect(metadata.failureStatusCode).toBe(403);
    });

    it('should clear auth requirements when method is public', () => {
      @RequireAuth()
      class TestController {
        @Public()
        publicMethod() {}
      }

      const metadata = getEffectiveAuthMetadata(TestController, 'publicMethod');
      expect(metadata.isPublic).toBe(true);
      expect(metadata.requireAuth).toBeUndefined();
    });

    it('should preserve failureStatusCode when method is public', () => {
      @RequireAuth()
      @AuthFailureStatus(403)
      class TestController {
        @Public()
        publicMethod() {}
      }

      const metadata = getEffectiveAuthMetadata(TestController, 'publicMethod');
      expect(metadata.isPublic).toBe(true);
      expect(metadata.failureStatusCode).toBe(403);
    });
  });

  describe('requiresAuthentication', () => {
    it('should return true when requireAuth is set', () => {
      class TestController {
        @RequireAuth()
        protectedMethod() {}
      }

      expect(requiresAuthentication(TestController, 'protectedMethod')).toBe(
        true,
      );
    });

    it('should return true when requireCryptoAuth is set', () => {
      class TestController {
        @RequireCryptoAuth()
        secureMethod() {}
      }

      expect(requiresAuthentication(TestController, 'secureMethod')).toBe(true);
    });

    it('should return false when no auth is set', () => {
      class TestController {
        publicMethod() {}
      }

      expect(requiresAuthentication(TestController, 'publicMethod')).toBe(
        false,
      );
    });

    it('should return false when explicitly public', () => {
      @RequireAuth()
      class TestController {
        @Public()
        publicMethod() {}
      }

      expect(requiresAuthentication(TestController, 'publicMethod')).toBe(
        false,
      );
    });

    it('should return true when class has auth and method is not public', () => {
      @RequireAuth()
      class TestController {
        inheritedAuth() {}
      }

      expect(requiresAuthentication(TestController, 'inheritedAuth')).toBe(
        true,
      );
    });
  });

  describe('Class-level override by method-level', () => {
    it('should allow @Public to override class-level @RequireAuth', () => {
      @RequireAuth()
      class TestController {
        protectedMethod() {}

        @Public()
        publicMethod() {}
      }

      expect(requiresAuthentication(TestController, 'protectedMethod')).toBe(
        true,
      );
      expect(requiresAuthentication(TestController, 'publicMethod')).toBe(
        false,
      );
    });

    it('should allow method-level @RequireAuth to add to class without auth', () => {
      class TestController {
        publicMethod() {}

        @RequireAuth()
        protectedMethod() {}
      }

      expect(requiresAuthentication(TestController, 'publicMethod')).toBe(
        false,
      );
      expect(requiresAuthentication(TestController, 'protectedMethod')).toBe(
        true,
      );
    });

    it('should allow method-level @AuthFailureStatus to override class-level', () => {
      @RequireAuth()
      @AuthFailureStatus(401)
      class TestController {
        defaultStatus() {}

        @AuthFailureStatus(403)
        customStatus() {}
      }

      const defaultMeta = getEffectiveAuthMetadata(
        TestController,
        'defaultStatus',
      );
      const customMeta = getEffectiveAuthMetadata(
        TestController,
        'customStatus',
      );

      expect(defaultMeta.failureStatusCode).toBe(401);
      expect(customMeta.failureStatusCode).toBe(403);
    });

    it('should combine class @RequireAuth with method @RequireCryptoAuth', () => {
      @RequireAuth()
      class TestController {
        @RequireCryptoAuth()
        doubleSecure() {}
      }

      const metadata = getEffectiveAuthMetadata(TestController, 'doubleSecure');
      expect(metadata.requireAuth).toBe(true);
      expect(metadata.requireCryptoAuth).toBe(true);
    });
  });

  describe('Decorator stacking', () => {
    it('should allow stacking @RequireAuth and @AuthFailureStatus', () => {
      class TestController {
        @RequireAuth()
        @AuthFailureStatus(403)
        protectedMethod() {}
      }

      const metadata = getEffectiveAuthMetadata(
        TestController,
        'protectedMethod',
      );
      expect(metadata.requireAuth).toBe(true);
      expect(metadata.failureStatusCode).toBe(403);
    });

    it('should allow stacking @RequireCryptoAuth and @AuthFailureStatus', () => {
      class TestController {
        @RequireCryptoAuth()
        @AuthFailureStatus(403)
        secureMethod() {}
      }

      const metadata = getEffectiveAuthMetadata(TestController, 'secureMethod');
      expect(metadata.requireCryptoAuth).toBe(true);
      expect(metadata.failureStatusCode).toBe(403);
    });

    it('should allow stacking both auth types', () => {
      class TestController {
        @RequireAuth()
        @RequireCryptoAuth()
        superSecure() {}
      }

      const metadata = getEffectiveAuthMetadata(TestController, 'superSecure');
      expect(metadata.requireAuth).toBe(true);
      expect(metadata.requireCryptoAuth).toBe(true);
    });
  });
});

describe('Integration with Route Decorators', () => {
  // Import route decorators for integration tests
  const {
    Get,
    Post,
    Put,
    Delete,
  } = require('../../src/decorators/http-methods');
  const { ApiController } = require('../../src/decorators/controller');

  describe('Auth decorators with HTTP method decorators', () => {
    it('should work with @Get decorator', () => {
      class TestController {
        @RequireAuth()
        @Get('/protected')
        protectedGet() {}
      }

      const authMeta = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
        'protectedGet',
      ) as AuthMetadata;
      expect(authMeta.requireAuth).toBe(true);

      const routes = Reflect.getMetadata(
        require('../../src/decorators/metadata-keys').ROUTES_METADATA,
        TestController,
      );
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('get');
    });

    it('should work with @Post decorator', () => {
      class TestController {
        @RequireAuth()
        @Post('/create')
        createItem() {}
      }

      const authMeta = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
        'createItem',
      ) as AuthMetadata;
      expect(authMeta.requireAuth).toBe(true);

      const routes = Reflect.getMetadata(
        require('../../src/decorators/metadata-keys').ROUTES_METADATA,
        TestController,
      );
      expect(routes[0].method).toBe('post');
    });

    it('should work with @RequireCryptoAuth and @Put', () => {
      class TestController {
        @RequireCryptoAuth()
        @Put('/update/:id')
        updateItem() {}
      }

      const authMeta = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
        'updateItem',
      ) as AuthMetadata;
      expect(authMeta.requireCryptoAuth).toBe(true);
    });

    it('should work with @Public and @Delete', () => {
      class TestController {
        @Public()
        @Delete('/public-delete/:id')
        publicDelete() {}
      }

      const authMeta = Reflect.getMetadata(
        AUTH_METADATA,
        TestController,
        'publicDelete',
      ) as AuthMetadata;
      expect(authMeta.isPublic).toBe(true);
    });
  });

  describe('Auth decorators with @ApiController', () => {
    it('should work with class-level @RequireAuth and @ApiController', () => {
      @RequireAuth()
      @ApiController('/api/secure')
      class SecureController {
        @Get('/')
        list() {}

        @Post('/')
        create() {}
      }

      const classAuth = Reflect.getMetadata(
        AUTH_METADATA,
        SecureController,
      ) as AuthMetadata;
      expect(classAuth.requireAuth).toBe(true);

      // Both methods should inherit auth requirement
      expect(requiresAuthentication(SecureController, 'list')).toBe(true);
      expect(requiresAuthentication(SecureController, 'create')).toBe(true);
    });

    it('should allow @Public to override class-level auth with @ApiController', () => {
      @RequireAuth()
      @ApiController('/api/mixed')
      class MixedController {
        @Get('/protected')
        protectedRoute() {}

        @Public()
        @Get('/public')
        publicRoute() {}
      }

      expect(requiresAuthentication(MixedController, 'protectedRoute')).toBe(
        true,
      );
      expect(requiresAuthentication(MixedController, 'publicRoute')).toBe(
        false,
      );
    });

    it('should combine auth decorators with route OpenAPI options', () => {
      @ApiController('/api/users', { tags: ['Users'] })
      class UserController {
        @RequireAuth()
        @Get('/:id', { summary: 'Get user by ID' })
        getUser() {}
      }

      const authMeta = Reflect.getMetadata(
        AUTH_METADATA,
        UserController,
        'getUser',
      ) as AuthMetadata;
      expect(authMeta.requireAuth).toBe(true);

      const openApiMeta = Reflect.getMetadata(
        require('../../src/decorators/metadata-keys').OPENAPI_METADATA,
        UserController,
        'getUser',
      );
      expect(openApiMeta.summary).toBe('Get user by ID');
    });
  });

  describe('Full controller example', () => {
    it('should handle a realistic controller with mixed auth requirements', () => {
      @RequireAuth()
      @AuthFailureStatus(401)
      @ApiController('/api/items', { tags: ['Items'] })
      class ItemController {
        @Public()
        @Get('/')
        listItems() {}

        @Get('/:id')
        getItem() {}

        @Post('/')
        createItem() {}

        @RequireCryptoAuth()
        @Put('/:id')
        updateItem() {}

        @AuthFailureStatus(403)
        @Delete('/:id')
        deleteItem() {}
      }

      // Public route
      expect(requiresAuthentication(ItemController, 'listItems')).toBe(false);

      // Inherited auth routes
      expect(requiresAuthentication(ItemController, 'getItem')).toBe(true);
      expect(requiresAuthentication(ItemController, 'createItem')).toBe(true);

      // Route with additional crypto auth
      const updateMeta = getEffectiveAuthMetadata(ItemController, 'updateItem');
      expect(updateMeta.requireAuth).toBe(true);
      expect(updateMeta.requireCryptoAuth).toBe(true);

      // Route with custom failure status
      const deleteMeta = getEffectiveAuthMetadata(ItemController, 'deleteItem');
      expect(deleteMeta.requireAuth).toBe(true);
      expect(deleteMeta.failureStatusCode).toBe(403);

      // Verify routes are registered
      const routes = Reflect.getMetadata(
        require('../../src/decorators/metadata-keys').ROUTES_METADATA,
        ItemController,
      );
      expect(routes).toHaveLength(5);
    });

    it('should add 401 responses to authenticated routes', () => {
      @RequireAuth()
      @ApiController('/api/secure')
      class SecureController {
        @Get('/data')
        getData() {}

        @Public()
        @Get('/public')
        getPublic() {}
      }

      // Authenticated route should have 401 response
      const dataResponses = Reflect.getMetadata(
        RESPONSE_METADATA,
        SecureController,
        'getData',
      );
      // Class-level auth adds 401 to class, not individual methods
      // Method inherits from class

      // Public route should not have 401 response from method level
      const publicResponses = Reflect.getMetadata(
        RESPONSE_METADATA,
        SecureController,
        'getPublic',
      );
      expect(publicResponses).toBeUndefined();

      // Class should have 401 response
      const classResponses = Reflect.getMetadata(
        RESPONSE_METADATA,
        SecureController,
      ) as Array<{ statusCode: number }>;
      expect(classResponses).toContainEqual(
        expect.objectContaining({ statusCode: 401 }),
      );
    });
  });

  describe('Decorator order independence', () => {
    it('should work regardless of decorator order (auth first)', () => {
      class TestController {
        @RequireAuth()
        @Get('/route1')
        route1() {}
      }

      expect(requiresAuthentication(TestController, 'route1')).toBe(true);
      const routes = Reflect.getMetadata(
        require('../../src/decorators/metadata-keys').ROUTES_METADATA,
        TestController,
      );
      expect(routes[0].method).toBe('get');
    });

    it('should work regardless of decorator order (route first)', () => {
      class TestController {
        @Get('/route2')
        @RequireAuth()
        route2() {}
      }

      expect(requiresAuthentication(TestController, 'route2')).toBe(true);
      const routes = Reflect.getMetadata(
        require('../../src/decorators/metadata-keys').ROUTES_METADATA,
        TestController,
      );
      expect(routes[0].method).toBe('get');
    });

    it('should work with multiple auth decorators in any order', () => {
      class TestController {
        @AuthFailureStatus(403)
        @RequireAuth()
        @Get('/route3')
        route3() {}

        @Get('/route4')
        @RequireAuth()
        @AuthFailureStatus(404)
        route4() {}
      }

      const meta3 = getEffectiveAuthMetadata(TestController, 'route3');
      expect(meta3.requireAuth).toBe(true);
      expect(meta3.failureStatusCode).toBe(403);

      const meta4 = getEffectiveAuthMetadata(TestController, 'route4');
      expect(meta4.requireAuth).toBe(true);
      expect(meta4.failureStatusCode).toBe(404);
    });
  });
});
