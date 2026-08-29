import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { ITokenService } from '../../infra/jwt/ITokenService';
import { loginSchema } from './auth.dto';

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export function authRouter(authService: AuthService, tokenService: ITokenService): Router {
  const router = Router();
  const controller = new AuthController(authService);

  router.post('/login', loginRateLimit, validate({ body: loginSchema }), controller.login);
  router.get('/me', authenticate(tokenService), controller.me);

  return router;
}
