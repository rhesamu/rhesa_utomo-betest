import mongoose from 'mongoose';
import pino from 'pino';
import { env, buildMongoUri } from '../../config/env';

export const scriptLogger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

export async function runScript(name: string, task: () => Promise<void>): Promise<void> {
  try {
    await mongoose.connect(buildMongoUri(), { autoIndex: false });
    scriptLogger.info(`[${name}] connected to ${env.MONGO_DB_NAME}`);
    await task();
    scriptLogger.info(`[${name}] done`);
  } catch (err) {
    scriptLogger.error({ err }, `[${name}] failed`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

export function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}
