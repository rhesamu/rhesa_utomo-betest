import { NextFunction, Request, Response } from 'express';
import { RequestStore, requestContext } from '../core/context/RequestContext';

export function cacheHeader() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const store: RequestStore = {};
    requestContext.run(store, () => {
      const originalJson = res.json.bind(res);
      res.json = (body: unknown) => {
        if (store.cacheOutcome && !res.headersSent) {
          res.setHeader('X-Cache', store.cacheOutcome);
        }
        return originalJson(body);
      };
      next();
    });
  };
}
