import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError, ForbiddenError } from '../core/errors/AppError';
import { ITokenService, TokenPayload } from '../infra/jwt/ITokenService';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

const BEARER_PREFIX = 'Bearer ';

export function authenticate(tokenService: ITokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith(BEARER_PREFIX)) {
        throw new UnauthorizedError('Missing or malformed Authorization header');
      }
      const token = header.slice(BEARER_PREFIX.length).trim();
      if (!token) {
        throw new UnauthorizedError('Missing bearer token');
      }
      req.auth = tokenService.verify(token);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError('Not authenticated'));
      return;
    }
    if (!req.auth.role || !allowedRoles.includes(req.auth.role)) {
      next(new ForbiddenError('Insufficient role'));
      return;
    }
    next();
  };
}
