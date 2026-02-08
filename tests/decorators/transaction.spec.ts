import 'reflect-metadata';
import {
  Transactional,
  getTransactionMetadata,
  isTransactional,
  getTransactionTimeout,
  TransactionMetadata,
} from '../../src/decorators/transaction';
import { TRANSACTION_METADATA } from '../../src/decorators/metadata-keys';

describe('Transaction Decorators', () => {
  describe('@Transactional', () => {
    it('should set transaction metadata on method', () => {
      class TestController {
        @Transactional()
        transactionalMethod() {}
      }

      const metadata = Reflect.getMetadata(
        TRANSACTION_METADATA,
        TestController,
        'transactionalMethod',
      ) as TransactionMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.useTransaction).toBe(true);
      expect(metadata.timeout).toBeUndefined();
    });

    it('should set transaction metadata with timeout option', () => {
      class TestController {
        @Transactional({ timeout: 30000 })
        transactionalMethod() {}
      }

      const metadata = Reflect.getMetadata(
        TRANSACTION_METADATA,
        TestController,
        'transactionalMethod',
      ) as TransactionMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.useTransaction).toBe(true);
      expect(metadata.timeout).toBe(30000);
    });

    it('should allow different timeout values on different methods', () => {
      class TestController {
        @Transactional({ timeout: 5000 })
        quickMethod() {}

        @Transactional({ timeout: 60000 })
        slowMethod() {}
      }

      const quickMetadata = Reflect.getMetadata(
        TRANSACTION_METADATA,
        TestController,
        'quickMethod',
      ) as TransactionMetadata;

      const slowMetadata = Reflect.getMetadata(
        TRANSACTION_METADATA,
        TestController,
        'slowMethod',
      ) as TransactionMetadata;

      expect(quickMetadata.timeout).toBe(5000);
      expect(slowMetadata.timeout).toBe(60000);
    });

    it('should not affect methods without the decorator', () => {
      class TestController {
        @Transactional()
        transactionalMethod() {}

        regularMethod() {}
      }

      const transactionalMetadata = Reflect.getMetadata(
        TRANSACTION_METADATA,
        TestController,
        'transactionalMethod',
      );

      const regularMetadata = Reflect.getMetadata(
        TRANSACTION_METADATA,
        TestController,
        'regularMethod',
      );

      expect(transactionalMetadata).toBeDefined();
      expect(regularMetadata).toBeUndefined();
    });
  });

  describe('getTransactionMetadata', () => {
    it('should return transaction metadata for a transactional method', () => {
      class TestController {
        @Transactional({ timeout: 10000 })
        transactionalMethod() {}
      }

      const metadata = getTransactionMetadata(
        TestController,
        'transactionalMethod',
      );

      expect(metadata).toBeDefined();
      expect(metadata?.useTransaction).toBe(true);
      expect(metadata?.timeout).toBe(10000);
    });

    it('should return undefined for non-transactional method', () => {
      class TestController {
        regularMethod() {}
      }

      const metadata = getTransactionMetadata(TestController, 'regularMethod');

      expect(metadata).toBeUndefined();
    });
  });

  describe('isTransactional', () => {
    it('should return true for transactional method', () => {
      class TestController {
        @Transactional()
        transactionalMethod() {}
      }

      expect(isTransactional(TestController, 'transactionalMethod')).toBe(true);
    });

    it('should return true for transactional method with timeout', () => {
      class TestController {
        @Transactional({ timeout: 5000 })
        transactionalMethod() {}
      }

      expect(isTransactional(TestController, 'transactionalMethod')).toBe(true);
    });

    it('should return false for non-transactional method', () => {
      class TestController {
        regularMethod() {}
      }

      expect(isTransactional(TestController, 'regularMethod')).toBe(false);
    });
  });

  describe('getTransactionTimeout', () => {
    it('should return timeout for transactional method with timeout', () => {
      class TestController {
        @Transactional({ timeout: 15000 })
        transactionalMethod() {}
      }

      expect(getTransactionTimeout(TestController, 'transactionalMethod')).toBe(
        15000,
      );
    });

    it('should return undefined for transactional method without timeout', () => {
      class TestController {
        @Transactional()
        transactionalMethod() {}
      }

      expect(
        getTransactionTimeout(TestController, 'transactionalMethod'),
      ).toBeUndefined();
    });

    it('should return undefined for non-transactional method', () => {
      class TestController {
        regularMethod() {}
      }

      expect(
        getTransactionTimeout(TestController, 'regularMethod'),
      ).toBeUndefined();
    });
  });

  describe('Integration with HTTP method decorators', () => {
    const {
      Get,
      Post,
      Put,
      Delete,
    } = require('../../src/decorators/http-methods');
    const { ApiController } = require('../../src/decorators/controller');
    const { ROUTES_METADATA } = require('../../src/decorators/metadata-keys');

    it('should work with @Post decorator', () => {
      class TestController {
        @Transactional()
        @Post('/create')
        createItem() {}
      }

      expect(isTransactional(TestController, 'createItem')).toBe(true);

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('post');
    });

    it('should work with @Put decorator', () => {
      class TestController {
        @Transactional({ timeout: 20000 })
        @Put('/:id')
        updateItem() {}
      }

      expect(isTransactional(TestController, 'updateItem')).toBe(true);
      expect(getTransactionTimeout(TestController, 'updateItem')).toBe(20000);
    });

    it('should work with @Delete decorator', () => {
      class TestController {
        @Transactional()
        @Delete('/:id')
        deleteItem() {}
      }

      expect(isTransactional(TestController, 'deleteItem')).toBe(true);
    });

    it('should work with @ApiController', () => {
      @ApiController('/api/orders')
      class OrderController {
        @Transactional()
        @Post('/')
        createOrder() {}

        @Get('/')
        listOrders() {}
      }

      expect(isTransactional(OrderController, 'createOrder')).toBe(true);
      expect(isTransactional(OrderController, 'listOrders')).toBe(false);
    });

    it('should work regardless of decorator order', () => {
      class TestController {
        @Post('/route1')
        @Transactional()
        route1() {}

        @Transactional()
        @Post('/route2')
        route2() {}
      }

      expect(isTransactional(TestController, 'route1')).toBe(true);
      expect(isTransactional(TestController, 'route2')).toBe(true);
    });
  });

  describe('Full controller example', () => {
    const {
      Get,
      Post,
      Put,
      Delete,
    } = require('../../src/decorators/http-methods');
    const { ApiController } = require('../../src/decorators/controller');

    it('should handle a realistic controller with mixed transactional methods', () => {
      @ApiController('/api/accounts')
      class AccountController {
        @Get('/')
        listAccounts() {}

        @Get('/:id')
        getAccount() {}

        @Transactional()
        @Post('/')
        createAccount() {}

        @Transactional({ timeout: 30000 })
        @Put('/:id')
        updateAccount() {}

        @Transactional({ timeout: 10000 })
        @Delete('/:id')
        deleteAccount() {}

        @Transactional({ timeout: 60000 })
        @Post('/transfer')
        transferFunds() {}
      }

      // Read operations should not be transactional
      expect(isTransactional(AccountController, 'listAccounts')).toBe(false);
      expect(isTransactional(AccountController, 'getAccount')).toBe(false);

      // Write operations should be transactional
      expect(isTransactional(AccountController, 'createAccount')).toBe(true);
      expect(isTransactional(AccountController, 'updateAccount')).toBe(true);
      expect(isTransactional(AccountController, 'deleteAccount')).toBe(true);
      expect(isTransactional(AccountController, 'transferFunds')).toBe(true);

      // Check timeouts
      expect(
        getTransactionTimeout(AccountController, 'createAccount'),
      ).toBeUndefined();
      expect(getTransactionTimeout(AccountController, 'updateAccount')).toBe(
        30000,
      );
      expect(getTransactionTimeout(AccountController, 'deleteAccount')).toBe(
        10000,
      );
      expect(getTransactionTimeout(AccountController, 'transferFunds')).toBe(
        60000,
      );
    });
  });
});
