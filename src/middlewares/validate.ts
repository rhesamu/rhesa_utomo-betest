import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { BadRequestError } from '../core/errors/AppError';

interface ValidateSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

export function validate(schemas: ValidateSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
      next();
    } catch (err) {
      next(new BadRequestError('Middleware validation error', extractIssues(err)));
    }
  };
}

function extractIssues(err: unknown): unknown {
  if (err && typeof err === 'object' && 'issues' in err) {
    return (err as { issues: unknown }).issues;
  }
  return err;
}
