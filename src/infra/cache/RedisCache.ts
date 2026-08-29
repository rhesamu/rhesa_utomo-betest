import Redis from 'ioredis';
import { Logger } from 'pino';
import { ICache } from './ICache';

/**
 * Fail-open cache: every Redis error is swallowed and logged at warn level.
 * A reachable-but-broken Redis degrades read latency, it never turns a working
 * endpoint into a 500 — reads fall through to Mongo and writes still commit.
 */
export class RedisCache implements ICache {
  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
    private readonly defaultTtlSeconds: number,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (err) {
      this.logger.warn({ err, key }, 'Cache get failed, falling through to source');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds ?? this.defaultTtlSeconds);
    } catch (err) {
      this.logger.warn({ err, key }, 'Cache set failed');
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn({ err, keys }, 'Cache delete failed');
    }
  }
}
