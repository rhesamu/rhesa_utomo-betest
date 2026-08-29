import mongoose from 'mongoose';
import { SignOptions } from 'jsonwebtoken';
import Redis from 'ioredis';
import pino from 'pino';
import { env, buildMongoUri } from './config/env';
import { ReadinessCheck } from './modules/healthCheck/IHealthCheckRepository';
import { createApp } from './app';

import { MongoUserRepository } from './modules/User/MongoUserRepository';
import { UserService } from './modules/User/user.service';
import { MongoAccountRepository } from './modules/Account/MongoAccountRepository';
import { AccountService } from './modules/Account/account.service';
import { BcryptHasher } from './infra/hash/BcryptHasher';
import { JwtService } from './infra/jwt/JwtService';
import { AuthService } from './modules/Auth/auth.service';
import { ICache } from './infra/cache/ICache';
import { RedisCache } from './infra/cache/RedisCache';
import { NoopCache } from './infra/cache/NoopCache';
import { CachedUserRepository } from './modules/User/CachedUserRepository';

const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

async function connectMongo(): Promise<void> {
  await mongoose.connect(buildMongoUri(), {
    autoIndex: env.NODE_ENV !== 'production',
  });
  logger.info('Database connected');
}

function buildRedisClient(): Redis | undefined {
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
  return redis;
}

function buildRedisReadinessCheck(redis: Redis): ReadinessCheck {
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

  // Cached User Repository setup if Redis is available, else fall back to a NoopCache.
  const redis = buildRedisClient();
  if (redis) readinessChecks.push(buildRedisReadinessCheck(redis));

  const cache: ICache = redis
    ? new RedisCache(redis, logger, env.CACHE_TTL_SECONDS)
    : new NoopCache();
  logger.info(`Cache backend: ${redis ? 'redis' : 'noop (REDIS_URL unset)'}`);

  const userRepository = new CachedUserRepository(
    new MongoUserRepository(),
    cache,
    env.CACHE_TTL_SECONDS,
  );

  const accountRepository = new MongoAccountRepository();
  const passwordHasher = new BcryptHasher();
  const tokenService = new JwtService(
    env.JWT_SECRET,
    env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  );

  const userService = new UserService(userRepository);
  const accountService = new AccountService(accountRepository, passwordHasher);
  const authService = new AuthService(
    accountRepository,
    userRepository,
    passwordHasher,
    tokenService,
  );

  const app = createApp({
    logger,
    readinessChecks,
    userService,
    accountService,
    authService,
    tokenService,
  });
  const port = env.PORT;

  const server = app.listen(port, '0.0.0.0', () => {
    logger.info(`Server listening on 0.0.0.0:${port}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await mongoose.disconnect();
      if (redis) await redis.quit();
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
