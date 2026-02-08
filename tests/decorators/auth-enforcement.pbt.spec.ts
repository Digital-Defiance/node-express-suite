/**
 * @fileoverview Property-based tests for authentication enforcement.
 * Tests that auth decorators correctly enforce authentication requirements.
 *
 * **Validates: Requirements 3.1-3.8**
 * - @RequireAuth sets useAuthentication: true
 * - @RequireCryptoAuth sets useCryptoAuthentication: true
 * - @Public explicitly marks route as not requiring authentication
 * - Authentication decorators automatically add 401 response
 * - Class-level auth decorators apply to all methods unless overridden
 * - @AuthFailureStatus sets custom auth failure status code
 * - OpenAPI security requirement is automatically added
 */

import * as fc from 'fast-check';
import 'reflect-metadata';

// Auth decorators
import {
  RequireAuth,
  RequireCryptoAuth,
  Public,
  AuthFailureStatus,
  getEffectiveAuthMetadata,
  requiresAuthentication,
} from '../../src/decorators/auth';

// Response decorators for checking 401 response
import { getEffectiveResponseMetadata } from '../../src/decorators/response';

// Metadata keys
import {
  AUTH_METADATA,
  RESPONSE_METADATA,
} from '../../src/decorators/metadata-keys';

/**
 * Arbitrary for generating valid method names.
 */
const methodNameArb = fc
  .string({ minLength: 3, maxLength: 15 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * Arbitrary for generating auth failure status codes.
 */
const authStatusCodeArb = fc.constantFrom(401, 403, 404, 500);

describe('Property-Based Tests: Authentication Enforcement', () => {
  describe('P7.1: @RequireAuth Decorator', () => {
    it('should set requireAuth to true', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = RequireAuth();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const authMeta = getEffectiveAuthMetadata(
            TestController,
            handlerName,
          );

          expect(authMeta.requireAuth).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('should add 401 response to OpenAPI metadata', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = RequireAuth();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const responses = getEffectiveResponseMetadata(
            TestController,
            handlerName,
          );

          expect(responses.some((r) => r.statusCode === 401)).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('should work as class decorator', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          @RequireAuth()
          class TestController {}

          // Method without its own auth decorator should inherit class-level
          const authMeta = getEffectiveAuthMetadata(
            TestController,
            handlerName,
          );

          expect(authMeta.requireAuth).toBe(true);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('P7.2: @RequireCryptoAuth Decorator', () => {
    it('should set requireCryptoAuth to true', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = RequireCryptoAuth();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const authMeta = getEffectiveAuthMetadata(
            TestController,
            handlerName,
          );

          expect(authMeta.requireCryptoAuth).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('should add 401 response to OpenAPI metadata', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = RequireCryptoAuth();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const responses = getEffectiveResponseMetadata(
            TestController,
            handlerName,
          );

          expect(responses.some((r) => r.statusCode === 401)).toBe(true);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('P7.3: @Public Decorator', () => {
    it('should set isPublic to true', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = Public();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const authMeta = getEffectiveAuthMetadata(
            TestController,
            handlerName,
          );

          expect(authMeta.isPublic).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('should override class-level @RequireAuth', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          @RequireAuth()
          class TestController {}

          const decorator = Public();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          // Method should be public despite class-level @RequireAuth
          expect(requiresAuthentication(TestController, handlerName)).toBe(
            false,
          );
        }),
        { numRuns: 30 },
      );
    });

    it('should override class-level @RequireCryptoAuth', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          @RequireCryptoAuth()
          class TestController {}

          const decorator = Public();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          // Method should be public despite class-level @RequireCryptoAuth
          expect(requiresAuthentication(TestController, handlerName)).toBe(
            false,
          );
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('P7.4: @AuthFailureStatus Decorator', () => {
    it('should set custom failure status code', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            statusCode: authStatusCodeArb,
          }),
          ({ handlerName, statusCode }) => {
            class TestController {}

            const decorator = AuthFailureStatus(statusCode);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const authMeta = getEffectiveAuthMetadata(
              TestController,
              handlerName,
            );

            expect(authMeta.failureStatusCode).toBe(statusCode);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should work as class decorator', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            statusCode: authStatusCodeArb,
          }),
          ({ handlerName, statusCode }) => {
            @AuthFailureStatus(statusCode)
            class TestController {}

            const authMeta = getEffectiveAuthMetadata(
              TestController,
              handlerName,
            );

            expect(authMeta.failureStatusCode).toBe(statusCode);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should allow method-level to override class-level', () => {
      fc.assert(
        fc.property(
          fc
            .record({
              handlerName: methodNameArb,
              classStatusCode: authStatusCodeArb,
              methodStatusCode: authStatusCodeArb,
            })
            .filter(
              ({ classStatusCode, methodStatusCode }) =>
                classStatusCode !== methodStatusCode,
            ),
          ({ handlerName, classStatusCode, methodStatusCode }) => {
            @AuthFailureStatus(classStatusCode)
            class TestController {}

            const decorator = AuthFailureStatus(methodStatusCode);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const authMeta = getEffectiveAuthMetadata(
              TestController,
              handlerName,
            );

            expect(authMeta.failureStatusCode).toBe(methodStatusCode);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P7.5: Combined Auth Decorators', () => {
    it('should support both @RequireAuth and @RequireCryptoAuth on same method', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };

          RequireAuth()(TestController.prototype, handlerName, descriptor);
          RequireCryptoAuth()(
            TestController.prototype,
            handlerName,
            descriptor,
          );

          const authMeta = getEffectiveAuthMetadata(
            TestController,
            handlerName,
          );

          expect(authMeta.requireAuth).toBe(true);
          expect(authMeta.requireCryptoAuth).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('should support @RequireAuth with @AuthFailureStatus', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            statusCode: authStatusCodeArb,
          }),
          ({ handlerName, statusCode }) => {
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            RequireAuth()(TestController.prototype, handlerName, descriptor);
            AuthFailureStatus(statusCode)(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            const authMeta = getEffectiveAuthMetadata(
              TestController,
              handlerName,
            );

            expect(authMeta.requireAuth).toBe(true);
            expect(authMeta.failureStatusCode).toBe(statusCode);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P7.6: requiresAuthentication Helper', () => {
    it('should return true for @RequireAuth decorated methods', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = RequireAuth();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          expect(requiresAuthentication(TestController, handlerName)).toBe(
            true,
          );
        }),
        { numRuns: 30 },
      );
    });

    it('should return true for @RequireCryptoAuth decorated methods', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = RequireCryptoAuth();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          expect(requiresAuthentication(TestController, handlerName)).toBe(
            true,
          );
        }),
        { numRuns: 30 },
      );
    });

    it('should return false for @Public decorated methods', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = Public();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          expect(requiresAuthentication(TestController, handlerName)).toBe(
            false,
          );
        }),
        { numRuns: 30 },
      );
    });

    it('should return false for methods without auth decorators', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          // No auth decorator applied
          expect(requiresAuthentication(TestController, handlerName)).toBe(
            false,
          );
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('P7.7: Class-Level Auth Inheritance', () => {
    it('should inherit class-level @RequireAuth for all methods', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(methodNameArb, { minLength: 2, maxLength: 4 }),
          (handlerNames) => {
            @RequireAuth()
            class TestController {}

            // All methods should require auth
            for (const handlerName of handlerNames) {
              expect(requiresAuthentication(TestController, handlerName)).toBe(
                true,
              );
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should allow individual methods to override class-level auth', () => {
      fc.assert(
        fc.property(
          fc
            .record({
              publicMethod: methodNameArb,
              authMethod: methodNameArb,
            })
            .filter(
              ({ publicMethod, authMethod }) => publicMethod !== authMethod,
            ),
          ({ publicMethod, authMethod }) => {
            @RequireAuth()
            class TestController {}

            // Make one method public
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            Public()(TestController.prototype, publicMethod, descriptor);

            // Public method should not require auth
            expect(requiresAuthentication(TestController, publicMethod)).toBe(
              false,
            );

            // Other method should still require auth
            expect(requiresAuthentication(TestController, authMethod)).toBe(
              true,
            );
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P7.8: 401 Response Deduplication', () => {
    it('should not duplicate 401 response when multiple auth decorators applied', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };

          // Apply multiple auth decorators
          RequireAuth()(TestController.prototype, handlerName, descriptor);
          RequireCryptoAuth()(
            TestController.prototype,
            handlerName,
            descriptor,
          );

          const responses = getEffectiveResponseMetadata(
            TestController,
            handlerName,
          );

          // Should only have one 401 response
          const count401 = responses.filter((r) => r.statusCode === 401).length;
          expect(count401).toBe(1);
        }),
        { numRuns: 20 },
      );
    });
  });
});
