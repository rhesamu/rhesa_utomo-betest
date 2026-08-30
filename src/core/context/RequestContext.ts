import { AsyncLocalStorage } from 'node:async_hooks';

export type CacheOutcome = 'HIT' | 'MISS';

export interface RequestStore {
  cacheOutcome?: CacheOutcome;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

export function markCacheOutcome(outcome: CacheOutcome): void {
  const store = requestContext.getStore();
  if (store) store.cacheOutcome = outcome;
}
