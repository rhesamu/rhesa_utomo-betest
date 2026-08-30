import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  MONGO_URL: z.string().min(1, 'MONGO_URL is required'),
  MONGO_DB_NAME: z.string().min(1, 'MONGO_DB_NAME is required'),

  REDIS_URL: z.string().min(1).optional(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(
      /^\d+(\.\d+)?\s*(ms|s|m|h|d|w|y|msecs?|secs?|mins?|hrs?|days?|weeks?|years?)?$/i,
      'JWT_EXPIRES_IN must be a duration like "1h", "30m", "7d", or a number of seconds',
    )
    .default('1h'),

  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export function buildMongoUri(base: Env = env): string {
  const trimmed = base.MONGO_URL.replace(/\/$/, '');
  return `${trimmed}/${base.MONGO_DB_NAME}?authSource=admin`;
}
