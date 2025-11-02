export function makeRoleModel(doc?: unknown) {
  const chainable: any = {
    session: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(doc ?? null),
  };
  chainable.then = jest
    .fn()
    .mockImplementation(
      (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(doc ?? null).then(onFulfilled, onRejected),
    );
  chainable.catch = jest
    .fn()
    .mockImplementation((onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(doc ?? null).catch(onRejected),
    );
  chainable.finally = jest
    .fn()
    .mockImplementation((onFinally?: () => void) =>
      Promise.resolve(doc ?? null).finally(onFinally),
    );
  // For getUserRoles which uses find().session() and expects array
  const findChainable = {
    session: jest.fn().mockResolvedValue(doc ? [doc] : []),
  };
  return {
    find: jest.fn().mockReturnValue(findChainable),
    findOne: jest.fn().mockReturnValue(chainable),
    create: jest.fn(),
  };
}

export function makeUserModel(doc?: unknown) {
  const chainable: any = {
    session: jest.fn().mockReturnThis(),
    collation: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(doc ?? null),
  };
  chainable.then = jest
    .fn()
    .mockImplementation(
      (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(doc ?? null).then(onFulfilled, onRejected),
    );
  chainable.catch = jest
    .fn()
    .mockImplementation((onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(doc ?? null).catch(onRejected),
    );
  chainable.finally = jest
    .fn()
    .mockImplementation((onFinally?: () => void) =>
      Promise.resolve(doc ?? null).finally(onFinally),
    );
  // For loginWithMnemonic which uses .lean().session() without .exec()
  chainable.lean.mockReturnValue({
    session: jest.fn().mockResolvedValue(doc ?? null),
  });
  return {
    find: jest.fn().mockReturnValue(chainable),
    findOne: jest.fn().mockReturnValue(chainable),
    create: jest.fn(),
  };
}

export function makeUserRoleModel(docs?: unknown[] | null) {
  const chainable: any = {
    session: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(docs ?? []),
  };
  chainable.then = jest
    .fn()
    .mockImplementation(
      (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(docs ?? []).then(onFulfilled, onRejected),
    );
  chainable.catch = jest
    .fn()
    .mockImplementation((onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(docs ?? []).catch(onRejected),
    );
  chainable.finally = jest
    .fn()
    .mockImplementation((onFinally?: () => void) =>
      Promise.resolve(docs ?? []).finally(onFinally),
    );
  // For getUserRoles which uses .select().session() - should return the docs array
  chainable.select.mockImplementation(() => ({
    session: jest.fn().mockResolvedValue(docs ?? []),
  }));
  // For getUserRoles which uses .populate().lean().exec()
  chainable.populate.mockReturnValue({
    lean: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(docs ?? []),
    }),
  });
  return {
    find: jest.fn().mockReturnValue(chainable),
    findOne: jest.fn().mockReturnValue(chainable),
    create: jest.fn(),
  };
}
