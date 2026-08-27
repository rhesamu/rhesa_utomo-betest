import mongoose from 'mongoose';
import Redis from 'ioredis';
import pino from 'pino';
import { env, buildMongoUri } from './config/env';
import { ReadinessCheck } from './modules/healthCheck/IHealthCheckRepository';
import { createApp } from './app';

const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

async function connectMongo(): Promise<void> {
  await mongoose.connect(buildMongoUri(), {
    autoIndex: env.NODE_ENV !== 'production',
  });
  logger.info('Mongo connected');
}

function buildRedisReadinessCheck(): ReadinessCheck | undefined {
  if (!env.REDIS_URL) return undefined;

  // *.railway.internal resolves IPv6-only; every other host
  // (docker-compose's bridge DNS, localhost) is IPv4-only.
  const isRailwayInternal = new URL(env.REDIS_URL).hostname.endsWith('.railway.internal');

  const redis = new Redis(env.REDIS_URL, {
    ...(isRailwayInternal ? { family: 6 } : {}),
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  redis.on('error', (err) => logger.warn({ err }, 'Redis connection error'));

  return {
    name: 'redis',
    check: async () => {
      try {
        if (redis.status === 'wait') await redis.connect();
        const pong = await redis.ping();
        return pong === 'PONG';
      } catch {
        return false;
      }
    },
  };
}

async function bootstrap(): Promise<void> {
  await connectMongo();

  const readinessChecks: ReadinessCheck[] = [
    { name: 'mongo', check: async () => mongoose.connection.readyState === 1 },
  ];
  const redisCheck = buildRedisReadinessCheck();
  if (redisCheck) readinessChecks.push(redisCheck);

  const app = createApp({ logger, readinessChecks });
  const port = env.PORT;

  const server = app.listen(port, '0.0.0.0', () => {
    logger.info(`Server listening on 0.0.0.0:${port}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await mongoose.disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('Force exit after shutdown timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal error during bootstrap');
  process.exit(1);
});
