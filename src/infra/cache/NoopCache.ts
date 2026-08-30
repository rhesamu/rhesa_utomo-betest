import { ICache } from './ICache';

// NoopCache is selected when REDIS_URL is unset, so the app
// runs with no Redis and no conditional `if (cache)` checks anywhere.
export class NoopCache implements ICache {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {}

  async del(..._keys: string[]): Promise<void> {}
}
