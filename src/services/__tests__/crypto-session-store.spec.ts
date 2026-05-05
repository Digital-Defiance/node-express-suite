/**
 * @fileoverview Unit tests for CryptoSessionStore.
 *
 * Covers:
 *  - establish/touch/revoke happy paths
 *  - sliding TTL behaviour and absolute cap
 *  - user-id binding (touch with mismatched userId returns undefined)
 *  - per-user session cap eviction (oldest first, dispose called)
 *  - revokeAllForUser disposes every entry
 *  - sweep timer evicts expired entries
 *  - shutdown clears interval and disposes all entries
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Member, PlatformID } from '@digitaldefiance/node-ecies-lib';
import { CryptoSessionStore } from '../crypto-session-store';

type StubMember = Member<PlatformID> & { dispose: jest.Mock };

function makeMember(): StubMember {
  return { dispose: jest.fn() } as unknown as StubMember;
}

describe('CryptoSessionStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('establish returns a non-empty opaque id and stores the member', () => {
    const store = new CryptoSessionStore();
    const m = makeMember();
    const sid = store.establish('user-1', m);
    expect(typeof sid).toBe('string');
    expect(sid.length).toBeGreaterThan(20);
    expect(store.size).toBe(1);
    expect(store.touch(sid, 'user-1')).toBe(m);
    store.shutdown();
  });

  it('establish produces distinct ids for repeated calls', () => {
    const store = new CryptoSessionStore();
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(store.establish('user-1', makeMember()));
    }
    expect(ids.size).toBe(50);
    store.shutdown();
  });

  it('touch with mismatched userId returns undefined and does NOT dispose', () => {
    const store = new CryptoSessionStore();
    const m = makeMember();
    const sid = store.establish('user-1', m);
    expect(store.touch(sid, 'attacker')).toBeUndefined();
    expect(m.dispose).not.toHaveBeenCalled();
    // Original owner can still use it.
    expect(store.touch(sid, 'user-1')).toBe(m);
    store.shutdown();
  });

  it('touch slides expiry forward but never past absoluteExpiresAt', () => {
    const store = new CryptoSessionStore({
      slidingTtlMs: 60_000,
      absoluteTtlMs: 90_000,
    });
    const m = makeMember();
    const sid = store.establish('user-1', m);

    // 30s in: still valid; sliding window now ends at 30 + 60 = 90 (== absolute).
    jest.advanceTimersByTime(30_000);
    expect(store.touch(sid, 'user-1')).toBe(m);

    // 80s total: still valid (absolute is 90).
    jest.advanceTimersByTime(50_000);
    expect(store.touch(sid, 'user-1')).toBe(m);

    // 90s total: hit absolute cap → destroyed.
    jest.advanceTimersByTime(10_000);
    expect(store.touch(sid, 'user-1')).toBeUndefined();
    expect(m.dispose).toHaveBeenCalledTimes(1);
    store.shutdown();
  });

  it('touch returns undefined and disposes after sliding TTL elapses', () => {
    const store = new CryptoSessionStore({
      slidingTtlMs: 1_000,
      absoluteTtlMs: 60_000,
    });
    const m = makeMember();
    const sid = store.establish('user-1', m);

    jest.advanceTimersByTime(2_000);
    expect(store.touch(sid, 'user-1')).toBeUndefined();
    expect(m.dispose).toHaveBeenCalledTimes(1);
    expect(store.size).toBe(0);
    store.shutdown();
  });

  it('revoke removes the entry and disposes the member', () => {
    const store = new CryptoSessionStore();
    const m = makeMember();
    const sid = store.establish('user-1', m);
    store.revoke(sid);
    expect(store.size).toBe(0);
    expect(m.dispose).toHaveBeenCalledTimes(1);
    expect(store.touch(sid, 'user-1')).toBeUndefined();
    store.shutdown();
  });

  it('revoke on unknown sid is a no-op', () => {
    const store = new CryptoSessionStore();
    expect(() => store.revoke('not-a-real-sid')).not.toThrow();
    store.shutdown();
  });

  it('revokeAllForUser disposes every member for that user only', () => {
    const store = new CryptoSessionStore();
    const a1 = makeMember();
    const a2 = makeMember();
    const b1 = makeMember();
    store.establish('user-a', a1);
    store.establish('user-a', a2);
    const bSid = store.establish('user-b', b1);

    store.revokeAllForUser('user-a');

    expect(a1.dispose).toHaveBeenCalledTimes(1);
    expect(a2.dispose).toHaveBeenCalledTimes(1);
    expect(b1.dispose).not.toHaveBeenCalled();
    expect(store.touch(bSid, 'user-b')).toBe(b1);
    store.shutdown();
  });

  it('enforces maxSessionsPerUser by evicting oldest', () => {
    const store = new CryptoSessionStore({ maxSessionsPerUser: 2 });
    const m1 = makeMember();
    const m2 = makeMember();
    const m3 = makeMember();

    const s1 = store.establish('user-1', m1);
    jest.advanceTimersByTime(1);
    const s2 = store.establish('user-1', m2);
    jest.advanceTimersByTime(1);
    const s3 = store.establish('user-1', m3);

    // m1 is oldest → evicted and disposed.
    expect(m1.dispose).toHaveBeenCalledTimes(1);
    expect(m2.dispose).not.toHaveBeenCalled();
    expect(m3.dispose).not.toHaveBeenCalled();
    expect(store.touch(s1, 'user-1')).toBeUndefined();
    expect(store.touch(s2, 'user-1')).toBe(m2);
    expect(store.touch(s3, 'user-1')).toBe(m3);
    store.shutdown();
  });

  it('sweep timer evicts expired entries without an explicit touch', () => {
    const store = new CryptoSessionStore({
      slidingTtlMs: 1_000,
      absoluteTtlMs: 60_000,
      sweepIntervalMs: 500,
    });
    const m = makeMember();
    store.establish('user-1', m);

    // Advance past sliding TTL — sweep ticks fire automatically.
    jest.advanceTimersByTime(2_000);
    expect(m.dispose).toHaveBeenCalledTimes(1);
    expect(store.size).toBe(0);
    store.shutdown();
  });

  it('shutdown disposes all live entries and stops the sweep timer', () => {
    const store = new CryptoSessionStore({ sweepIntervalMs: 1_000 });
    const m1 = makeMember();
    const m2 = makeMember();
    store.establish('user-a', m1);
    store.establish('user-b', m2);

    store.shutdown();

    expect(m1.dispose).toHaveBeenCalledTimes(1);
    expect(m2.dispose).toHaveBeenCalledTimes(1);
    expect(store.size).toBe(0);

    // Subsequent timer ticks must NOT invoke any further disposal.
    jest.advanceTimersByTime(10_000);
    expect(m1.dispose).toHaveBeenCalledTimes(1);
    expect(m2.dispose).toHaveBeenCalledTimes(1);
  });

  it('swallows errors thrown from member.dispose()', () => {
    const store = new CryptoSessionStore();
    const m = makeMember();
    m.dispose.mockImplementation(() => {
      throw new Error('boom');
    });
    const sid = store.establish('user-1', m);
    expect(() => store.revoke(sid)).not.toThrow();
    store.shutdown();
  });
});
