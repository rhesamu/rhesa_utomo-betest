import Redis from 'ioredis';
import { Logger } from 'pino';

export function createRedisClient(
  redisUrl: string | undefined,
  logger?: Logger,
): Redis | undefined {
  if (!redisUrl) return undefined;

  const isRailwayInternal = new URL(redisUrl).hostname.endsWith('.railway.internal');

  const redis = new Redis(redisUrl, {
    ...(isRailwayInternal ? { family: 6 } : {}),
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  redis.on('error', (err) => logger?.warn({ err }, 'Redis connection error'));
  return redis;
}
