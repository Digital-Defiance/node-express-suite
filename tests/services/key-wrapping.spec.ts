import { SecureBuffer, SecureString } from '@digitaldefiance/ecies-lib';
import {
  InvalidNewPasswordError,
  InvalidPasswordError,
} from '../../src/errors';
import { KeyWrappingService } from '../../src/services/key-wrapping';

describe('KeyWrappingService', () => {
  // test fixture values - not real credentials
  // amazonq-ignore-next-line
  const validPwd1 = 'A1!aaaaa';
  // test fixture values - not real credentials
  // amazonq-ignore-next-line
  const validPwd2 = 'B2@bbbbb';
  // test fixture values - not real credentials
  // amazonq-ignore-next-line
  const invalidPwd = 'short';

  it('wraps and unwraps a new master key (sync)', () => {
    const svc = new KeyWrappingService();
    const pwd = new SecureString(validPwd1);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(pwd);

    const unwrapped = svc.unwrapMasterKey(wrappedKey, pwd);
    expect(Buffer.compare(unwrapped.value, masterKey.value)).toBe(0);

    // cleanup
    unwrapped.dispose();
    masterKey.dispose();
  });

  it('throws InvalidPasswordError when unwrapping with wrong password (sync)', () => {
    const svc = new KeyWrappingService();
    const correct = new SecureString(validPwd1);
    const wrong = new SecureString(validPwd2);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(correct);
    expect(() => svc.unwrapMasterKey(wrappedKey, wrong)).toThrow(
      InvalidPasswordError,
    );
    masterKey.dispose();
  });

  it('wrapMasterKey enforces password regex and throws InvalidNewPasswordError', () => {
    const svc = new KeyWrappingService();
    const master = new SecureBuffer(Buffer.alloc(32, 7));
    const badPwd = new SecureString(invalidPwd);
    expect(() => svc.wrapMasterKey(master, badPwd)).toThrow(
      InvalidNewPasswordError,
    );
    master.dispose();
  });

  it('changePassword re-wraps and validates old vs new password', () => {
    const svc = new KeyWrappingService();
    const oldPwd = new SecureString(validPwd1);
    const newPwd = new SecureString(validPwd2);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(oldPwd);

    const rewrapped = svc.changePassword(wrappedKey, oldPwd, newPwd);

    // New password unwraps
    const mkNew = svc.unwrapMasterKey(rewrapped, newPwd);
    expect(Buffer.compare(mkNew.value, masterKey.value)).toBe(0);
    mkNew.dispose();

    // Old password fails
    expect(() => svc.unwrapMasterKey(rewrapped, oldPwd)).toThrow(
      InvalidPasswordError,
    );
    masterKey.dispose();
  });

  it('unwrapMasterKeyAsync matches sync unwrap', async () => {
    const svc = new KeyWrappingService();
    const pwd = new SecureString(validPwd1);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(pwd);

    const mkSync = svc.unwrapMasterKey(wrappedKey, pwd);
    const mkAsync = await svc.unwrapMasterKeyAsync(wrappedKey, pwd);

    expect(Buffer.compare(mkAsync.value, mkSync.value)).toBe(0);
    mkSync.dispose();
    mkAsync.dispose();
    masterKey.dispose();
  });

  it('unwrapMasterKeyAsyncDedup coalesces concurrent identical unwraps', async () => {
    const svc = new KeyWrappingService();
    const pwd = validPwd1; // accept string path to avoid SecureString overhead
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(
      new SecureString(pwd),
    );

    const spy = jest.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      svc as any,
      'unwrapMasterKeyAsync',
    );

    const N = 8;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        svc.unwrapMasterKeyAsyncDedup(wrappedKey, pwd),
      ),
    );
    // All results equal original master key
    for (const mk of results) {
      expect(Buffer.compare(mk.value, masterKey.value)).toBe(0);
      mk.dispose();
    }
    // Only one underlying unwrap call should have occurred due to deduplication
    expect(spy).toHaveBeenCalledTimes(1);

    masterKey.dispose();
    spy.mockRestore();
  });

  it('wrapSecret and unwrapSecret work with arbitrary data (sync)', () => {
    const svc = new KeyWrappingService();
    const pwd = new SecureString(validPwd1);
    const secret = new SecureBuffer(Buffer.from('my-secret-data', 'utf8'));

    const wrapped = svc.wrapSecret(secret, pwd);
    const unwrapped = svc.unwrapSecret(wrapped, pwd);

    expect(Buffer.from(unwrapped.value).toString('utf8')).toBe('my-secret-data');

    unwrapped.dispose();
    secret.dispose();
  });

  it('unwrapSecret throws InvalidPasswordError with wrong password', () => {
    const svc = new KeyWrappingService();
    const correct = new SecureString(validPwd1);
    const wrong = new SecureString(validPwd2);
    const secret = new SecureBuffer(Buffer.from('data', 'utf8'));

    const wrapped = svc.wrapSecret(secret, correct);

    expect(() => svc.unwrapSecret(wrapped, wrong)).toThrow(
      InvalidPasswordError,
    );

    secret.dispose();
  });

  it('wrapSecret enforces password regex', () => {
    const svc = new KeyWrappingService();
    const secret = new SecureBuffer(Buffer.from('data', 'utf8'));
    const badPwd = new SecureString(invalidPwd);

    expect(() => svc.wrapSecret(secret, badPwd)).toThrow(
      InvalidNewPasswordError,
    );

    secret.dispose();
  });

  it('unwrapSecretAsync matches sync unwrap', async () => {
    const svc = new KeyWrappingService();
    const pwd = new SecureString(validPwd1);
    const secret = new SecureBuffer(Buffer.from('test-data', 'utf8'));

    const wrapped = svc.wrapSecret(secret, pwd);
    const unwrappedSync = svc.unwrapSecret(wrapped, pwd);
    const unwrappedAsync = await svc.unwrapSecretAsync(wrapped, pwd);

    expect(Buffer.compare(unwrappedAsync.value, unwrappedSync.value)).toBe(0);

    unwrappedSync.dispose();
    unwrappedAsync.dispose();
    secret.dispose();
  });

  it('unwrapSecretAsync accepts string password', async () => {
    const svc = new KeyWrappingService();
    const pwd = new SecureString(validPwd1);
    const secret = new SecureBuffer(Buffer.from('data', 'utf8'));

    const wrapped = svc.wrapSecret(secret, pwd);
    const unwrapped = await svc.unwrapSecretAsync(wrapped, validPwd1);

    expect(Buffer.from(unwrapped.value).toString('utf8')).toBe('data');

    unwrapped.dispose();
    secret.dispose();
  });

  it('unwrapSecretAsync throws InvalidPasswordError with wrong password', async () => {
    const svc = new KeyWrappingService();
    const correct = new SecureString(validPwd1);
    const secret = new SecureBuffer(Buffer.from('data', 'utf8'));

    const wrapped = svc.wrapSecret(secret, correct);

    await expect(svc.unwrapSecretAsync(wrapped, validPwd2)).rejects.toThrow(
      InvalidPasswordError,
    );

    secret.dispose();
  });

  it('unwrapSecretAsync throws error for null password', async () => {
    const svc = new KeyWrappingService();
    const pwd = new SecureString(validPwd1);
    const secret = new SecureBuffer(Buffer.from('data', 'utf8'));

    const wrapped = svc.wrapSecret(secret, pwd);

    await expect(
      svc.unwrapSecretAsync(wrapped, null as any),
    ).rejects.toThrow();

    secret.dispose();
  });

  it('unwrapSecretAsync throws error for undefined password', async () => {
    const svc = new KeyWrappingService();
    const pwd = new SecureString(validPwd1);
    const secret = new SecureBuffer(Buffer.from('data', 'utf8'));

    const wrapped = svc.wrapSecret(secret, pwd);

    await expect(
      svc.unwrapSecretAsync(wrapped, undefined as any),
    ).rejects.toThrow();

    secret.dispose();
  });

  it('unwrapMasterKeyAsync accepts string password', async () => {
    const svc = new KeyWrappingService();
    const pwd = new SecureString(validPwd1);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(pwd);

    const unwrapped = await svc.unwrapMasterKeyAsync(wrappedKey, validPwd1);

    expect(Buffer.compare(unwrapped.value, masterKey.value)).toBe(0);

    unwrapped.dispose();
    masterKey.dispose();
  });

  it('unwrapMasterKeyAsync throws InvalidPasswordError with wrong password', async () => {
    const svc = new KeyWrappingService();
    const correct = new SecureString(validPwd1);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(correct);

    await expect(
      svc.unwrapMasterKeyAsync(wrappedKey, validPwd2),
    ).rejects.toThrow(InvalidPasswordError);

    masterKey.dispose();
  });

  it('unwrapMasterKeyAsyncDedup throws InvalidPasswordError with wrong password', async () => {
    const svc = new KeyWrappingService();
    const correct = new SecureString(validPwd1);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(correct);

    await expect(
      svc.unwrapMasterKeyAsyncDedup(wrappedKey, validPwd2),
    ).rejects.toThrow(InvalidPasswordError);

    masterKey.dispose();
  });

  it('changePassword throws InvalidPasswordError with wrong old password', () => {
    const svc = new KeyWrappingService();
    const correctOld = new SecureString(validPwd1);
    const wrongOld = new SecureString(validPwd2);
    const newPwd = new SecureString(validPwd2);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(correctOld);

    expect(() => svc.changePassword(wrappedKey, wrongOld, newPwd)).toThrow(
      InvalidPasswordError,
    );

    masterKey.dispose();
  });

  it('changePassword throws InvalidNewPasswordError with invalid new password', () => {
    const svc = new KeyWrappingService();
    const oldPwd = new SecureString(validPwd1);
    const badNewPwd = new SecureString(invalidPwd);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(oldPwd);

    expect(() => svc.changePassword(wrappedKey, oldPwd, badNewPwd)).toThrow(
      InvalidNewPasswordError,
    );

    masterKey.dispose();
  });

  it('unwrapMasterKeyAsyncDedup returns unique SecureBuffer instances per caller', async () => {
    const svc = new KeyWrappingService();
    const pwd = validPwd1;
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(
      new SecureString(pwd),
    );

    const [mk1, mk2] = await Promise.all([
      svc.unwrapMasterKeyAsyncDedup(wrappedKey, pwd),
      svc.unwrapMasterKeyAsyncDedup(wrappedKey, pwd),
    ]);

    // Both should have same content
    expect(Buffer.compare(mk1.value, mk2.value)).toBe(0);
    expect(Buffer.compare(mk1.value, masterKey.value)).toBe(0);

    // But should be different buffer instances
    expect(mk1.value).not.toBe(mk2.value);

    mk1.dispose();
    mk2.dispose();
    masterKey.dispose();
  });
});
