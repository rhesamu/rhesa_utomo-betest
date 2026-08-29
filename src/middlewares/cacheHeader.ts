import { NextFunction, Request, Response } from 'express';
import { RequestStore, requestContext } from '../core/context/RequestContext';

/**
 * Runs each request inside an AsyncLocalStorage scope and, if a cache-backed
 * read reported an outcome, surfaces it as `X-Cache: HIT|MISS`.
 *
 * res.json is wrapped rather than using the 'finish' event because headers are
 * already flushed by then. Endpoints that are not cache-backed (list queries)
 * simply never set the header.
 */
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
