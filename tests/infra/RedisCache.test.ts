import Redis from 'ioredis';
import { Logger } from 'pino';
import { mock } from 'jest-mock-extended';
import { RedisCache } from '../../src/infra/cache/RedisCache';
import { NoopCache } from '../../src/infra/cache/NoopCache';

const TTL = 300;

function build() {
  const redis = mock<Redis>();
  const logger = mock<Logger>();
  return { redis, logger, cache: new RedisCache(redis, logger, TTL) };
}

describe('RedisCache', () => {
  describe('get', () => {
    it('parses stored JSON', async () => {
      const { redis, cache } = build();
      redis.get.mockResolvedValue(JSON.stringify({ userId: 'USR-1' }));
      await expect(cache.get('k')).resolves.toEqual({ userId: 'USR-1' });
    });

    it('returns null for a miss', async () => {
      const { redis, cache } = build();
      redis.get.mockResolvedValue(null);
      await expect(cache.get('k')).resolves.toBeNull();
    });
  });

  describe('set', () => {
    it('serialises the value and applies the default TTL', async () => {
      const { redis, cache } = build();
      await cache.set('k', { a: 1 });
      expect(redis.set).toHaveBeenCalledWith('k', '{"a":1}', 'EX', TTL);
    });

    it('honours an explicit TTL override', async () => {
      const { redis, cache } = build();
      await cache.set('k', 'v', 30);
      expect(redis.set).toHaveBeenCalledWith('k', '"v"', 'EX', 30);
    });
  });

  describe('del', () => {
    it('forwards all keys', async () => {
      const { redis, cache } = build();
      await cache.del('a', 'b');
      expect(redis.del).toHaveBeenCalledWith('a', 'b');
    });

    it('short-circuits on an empty key list rather than calling DEL with no args', async () => {
      const { redis, cache } = build();
      await cache.del();
      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('fail-open', () => {
    it('returns null instead of throwing when get fails', async () => {
      const { redis, logger, cache } = build();
      redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(cache.get('k')).resolves.toBeNull();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('returns null instead of throwing when stored JSON is corrupt', async () => {
      const { redis, cache } = build();
      redis.get.mockResolvedValue('{not json');
      await expect(cache.get('k')).resolves.toBeNull();
    });

    it('resolves instead of throwing when set fails', async () => {
      const { redis, logger, cache } = build();
      redis.set.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(cache.set('k', 'v')).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('resolves instead of throwing when del fails', async () => {
      const { redis, logger, cache } = build();
      redis.del.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(cache.del('k')).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});

describe('NoopCache', () => {
  const cache = new NoopCache();

  it('always misses', async () => {
    await expect(cache.get('anything')).resolves.toBeNull();
  });

  it('accepts writes and deletes without error', async () => {
    await expect(cache.set('k', 'v')).resolves.toBeUndefined();
    await expect(cache.del('k')).resolves.toBeUndefined();
  });
});
