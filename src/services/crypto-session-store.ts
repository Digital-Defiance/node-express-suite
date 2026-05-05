/**
 * @fileoverview In-process server-side crypto session store.
 *
 * Holds unlocked `Member` instances (with private keys loaded) keyed
 * by an opaque session id. The session id is delivered to the client as a
 * cookie or bearer header; the unlocked private key never leaves the server.
 *
 * Design goals:
 *  - Single-node, in-process (Map). Multi-node deployments must front the
 *    server with sticky sessions or replace this with a Redis-backed store
 *    that wraps each entry in a sealed-box.
 *  - Sliding TTL with a hard absolute cap so a stolen session id can only
 *    be used while the user is actively interacting.
 *  - Constant-time eviction sweep — no setTimeout per session (DoS-safe).
 *  - Explicit dispose on revoke / expiry so private key material is zeroed.
 *
 * @module services/crypto-session-store
 */

import { randomBytes } from 'crypto';
import type { Member } from '@digitaldefiance/node-ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Configuration for {@link CryptoSessionStore}.
 */
export interface CryptoSessionStoreOptions {
  /**
   * Sliding TTL in milliseconds. Each successful access refreshes the
   * expiry to `now + slidingTtlMs`. Defaults to 15 minutes.
   */
  slidingTtlMs?: number;
  /**
   * Absolute cap in milliseconds from session creation. The session is
   * destroyed at this point regardless of activity. Defaults to 8 hours.
   */
  absoluteTtlMs?: number;
  /**
   * Sweep interval in milliseconds for evicting expired sessions.
   * Defaults to 60 seconds.
   */
  sweepIntervalMs?: number;
  /**
   * Maximum simultaneous sessions per user id. Older sessions are evicted
   * first. Defaults to 10.
   */
  maxSessionsPerUser?: number;
}

interface CryptoSessionEntry<TID extends PlatformID> {
  sessionId: string;
  userId: string;
  member: Member<TID>;
  createdAt: number;
  expiresAt: number;
  absoluteExpiresAt: number;
}

/**
 * In-process crypto session store. **Not** safe across processes — single
 * node, single worker. For multi-node deployments use sticky sessions.
 */
export class CryptoSessionStore<TID extends PlatformID = Buffer> {
  private readonly sessions = new Map<string, CryptoSessionEntry<TID>>();
  private readonly userIndex = new Map<string, Set<string>>();
  private readonly slidingTtlMs: number;
  private readonly absoluteTtlMs: number;
  private readonly maxSessionsPerUser: number;
  private readonly sweepHandle: NodeJS.Timeout;

  constructor(options: CryptoSessionStoreOptions = {}) {
    this.slidingTtlMs = options.slidingTtlMs ?? 15 * 60 * 1000;
    this.absoluteTtlMs = options.absoluteTtlMs ?? 8 * 60 * 60 * 1000;
    this.maxSessionsPerUser = options.maxSessionsPerUser ?? 10;
    const sweepIntervalMs = options.sweepIntervalMs ?? 60 * 1000;
    this.sweepHandle = setInterval(() => this.sweep(), sweepIntervalMs);
    // Don't keep the event loop alive solely for the sweeper.
    if (typeof this.sweepHandle.unref === 'function') {
      this.sweepHandle.unref();
    }
  }

  /**
   * Establish a new session for a user with their unlocked member.
   * The store takes ownership of `member` — callers must not dispose it.
   *
   * @returns the opaque session id to deliver to the client.
   */
  public establish(userId: string, member: Member<TID>): string {
    const now = Date.now();
    const sessionId = randomBytes(32).toString('base64url');
    const entry: CryptoSessionEntry<TID> = {
      sessionId,
      userId,
      member,
      createdAt: now,
      expiresAt: now + this.slidingTtlMs,
      absoluteExpiresAt: now + this.absoluteTtlMs,
    };
    this.sessions.set(sessionId, entry);
    this.indexAdd(userId, sessionId);
    this.enforceUserCap(userId);
    return sessionId;
  }

  /**
   * Look up a session and slide its expiry forward.
   * Returns `undefined` if the session does not exist, has expired, or
   * does not belong to the expected user.
   */
  public touch(
    sessionId: string,
    expectedUserId: string,
  ): Member<TID> | undefined {
    const entry = this.sessions.get(sessionId);
    if (!entry) return undefined;
    if (entry.userId !== expectedUserId) return undefined;
    const now = Date.now();
    if (now >= entry.absoluteExpiresAt || now >= entry.expiresAt) {
      this.destroyEntry(entry);
      return undefined;
    }
    entry.expiresAt = Math.min(
      now + this.slidingTtlMs,
      entry.absoluteExpiresAt,
    );
    return entry.member;
  }

  /**
   * Explicitly revoke a session (logout, password change, etc.).
   */
  public revoke(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (entry) this.destroyEntry(entry);
  }

  /**
   * Revoke every session belonging to the given user (e.g. on password
   * rotation or account compromise notification).
   */
  public revokeAllForUser(userId: string): void {
    const ids = this.userIndex.get(userId);
    if (!ids) return;
    for (const id of Array.from(ids)) {
      const entry = this.sessions.get(id);
      if (entry) this.destroyEntry(entry);
    }
  }

  /**
   * Number of live sessions. Test/observability helper.
   */
  public get size(): number {
    return this.sessions.size;
  }

  /**
   * Stop the sweep timer and dispose every live session. Call at process
   * shutdown to ensure private key material is zeroed.
   */
  public shutdown(): void {
    clearInterval(this.sweepHandle);
    for (const entry of Array.from(this.sessions.values())) {
      this.destroyEntry(entry);
    }
  }

  private sweep(): void {
    const now = Date.now();
    for (const entry of Array.from(this.sessions.values())) {
      if (now >= entry.absoluteExpiresAt || now >= entry.expiresAt) {
        this.destroyEntry(entry);
      }
    }
  }

  private destroyEntry(entry: CryptoSessionEntry<TID>): void {
    this.sessions.delete(entry.sessionId);
    this.indexRemove(entry.userId, entry.sessionId);
    try {
      entry.member.dispose();
    } catch {
      // Best-effort disposal.
    }
  }

  private indexAdd(userId: string, sessionId: string): void {
    let set = this.userIndex.get(userId);
    if (!set) {
      set = new Set<string>();
      this.userIndex.set(userId, set);
    }
    set.add(sessionId);
  }

  private indexRemove(userId: string, sessionId: string): void {
    const set = this.userIndex.get(userId);
    if (!set) return;
    set.delete(sessionId);
    if (set.size === 0) this.userIndex.delete(userId);
  }

  private enforceUserCap(userId: string): void {
    const set = this.userIndex.get(userId);
    if (!set || set.size <= this.maxSessionsPerUser) return;
    // Evict oldest by createdAt until under cap.
    const entries = Array.from(set)
      .map((id) => this.sessions.get(id))
      .filter((e): e is CryptoSessionEntry<TID> => e !== undefined)
      .sort((a, b) => a.createdAt - b.createdAt);
    while (entries.length > this.maxSessionsPerUser) {
      const oldest = entries.shift();
      if (oldest) this.destroyEntry(oldest);
    }
  }
}
