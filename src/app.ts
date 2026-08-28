import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { Logger } from 'pino';

import { healthCheckRouter } from './modules/healthCheck/healthCheck.routes';
import { ReadinessCheck } from './modules/healthCheck/IHealthCheckRepository';

import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import { UserService } from './modules/User/user.service';
import { userRouter } from './modules/User/user.routes';

export interface AppDeps {
  logger: Logger;
  readinessChecks?: ReadinessCheck[];
  userService: UserService;
}

export function createApp(deps: AppDeps): Express {
  const { logger, readinessChecks = [] } = deps;
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use('/health', healthCheckRouter(readinessChecks));
  app.use('/api/users', userRouter(deps.userService));
  // app.use('/api/accounts', accountLoginRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
