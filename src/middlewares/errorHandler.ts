import { NextFunction, Request, Response } from 'express';
import { AppError } from '../core/errors/AppError';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json({ error: err.name, message: err.message, details: err.details });
    return;
  }

  req.log?.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'InternalServerError', message: 'Something unexpected happpened' });
}
