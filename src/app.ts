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
import { cacheHeader } from './middlewares/cacheHeader';
import { UserService } from './modules/User/user.service';
import { userRouter } from './modules/User/user.routes';
import { AccountService } from './modules/Account/account.service';
import { accountRouter } from './modules/Account/account.routes';
import { AuthService } from './modules/Auth/auth.service';
import { authRouter } from './modules/Auth/auth.routes';
import { ITokenService } from './infra/jwt/ITokenService';

export interface AppDeps {
  logger: Logger;
  readinessChecks?: ReadinessCheck[];
  userService: UserService;
  accountService: AccountService;
  authService: AuthService;
  tokenService: ITokenService;
}

export function createApp(deps: AppDeps): Express {
  const { logger, readinessChecks = [] } = deps;
  const app = express();

  // Trust the single edge-proxy hop, so the rate limiters below key on the real client IP.
  app.set('trust proxy', 1);

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

  app.use(cacheHeader());

  app.use('/health', healthCheckRouter(readinessChecks));
  app.use('/api/auth', authRouter(deps.authService, deps.tokenService));
  app.use('/api/users', userRouter(deps.userService, deps.tokenService));
  app.use('/api/accounts', accountRouter(deps.accountService, deps.tokenService));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
