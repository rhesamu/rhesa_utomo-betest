import { AsyncLocalStorage } from 'node:async_hooks';

export type CacheOutcome = 'HIT' | 'MISS';

export interface RequestStore {
  cacheOutcome?: CacheOutcome;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

/**
 * Lets the cache decorator report its outcome without knowing anything about
 * Express. The repository layer stays free of req/res, and the middleware that
 * writes the X-Cache header stays free of caching logic.
 *
 * No-ops outside a request (scripts, tests, background work).
 */
export function markCacheOutcome(outcome: CacheOutcome): void {
  const store = requestContext.getStore();
  if (store) store.cacheOutcome = outcome;
}
