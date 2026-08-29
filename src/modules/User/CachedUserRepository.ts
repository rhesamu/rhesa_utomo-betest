import { markCacheOutcome } from '../../core/context/RequestContext';
import { ICache } from '../../infra/cache/ICache';
import { Paginated } from '../../shared/Paginated';
import { CreateUserInput, IUserRepository, UpdateUserInput, UserQuery } from './IUserRepository';
import { UserDocument, UserModel } from './user.model';

// Canonical key holds the payload; the two alias keys hold only a userId
// pointer. One cached copy per user means the alias lookups can never drift
// out of sync with the record they point at.
const canonicalKey = (userId: string) => `user:id:${userId}`;
const accountKey = (accountNumber: string) => `user:acct:${accountNumber}`;
const registrationKey = (registrationNumber: string) => `user:reg:${registrationNumber}`;

export class CachedUserRepository implements IUserRepository {
  constructor(
    private readonly inner: IUserRepository,
    private readonly cache: ICache,
    private readonly ttlSeconds: number,
  ) {}

  // findAll is too dynamic to be cached, and the result is
  // likely to be stale by the time it is used.
  findAll(query: UserQuery): Promise<Paginated<UserDocument>> {
    return this.inner.findAll(query);
  }

  async findById(userId: string): Promise<UserDocument> {
    const cached = await this.cache.get<Record<string, unknown>>(canonicalKey(userId));
    if (cached) {
      markCacheOutcome('HIT');
      return UserModel.hydrate(cached);
    }

    const user = await this.inner.findById(userId);
    markCacheOutcome('MISS');
    await this.warm(user);
    return user;
  }

  findByAccountNumber(accountNumber: string): Promise<UserDocument> {
    return this.findByAlias(accountKey(accountNumber), () =>
      this.inner.findByAccountNumber(accountNumber),
    );
  }

  findByRegistrationNumber(registrationNumber: string): Promise<UserDocument> {
    return this.findByAlias(registrationKey(registrationNumber), () =>
      this.inner.findByRegistrationNumber(registrationNumber),
    );
  }

  async create(user: CreateUserInput): Promise<UserDocument> {
    const created = await this.inner.create(user);
    await this.warm(created);
    return created;
  }

  async update(userId: string, input: UpdateUserInput): Promise<UserDocument> {
    // The previous document is read first so that, if accountNumber or
    // registrationNumber changed, the OLD alias keys can be evicted too.
    // Skipping this leaves a stale pointer resolving to a live record.
    const previous = await this.safeFindById(userId);
    const updated = await this.inner.update(userId, input);
    await this.evict(previous, updated);
    return updated;
  }

  async delete(userId: string): Promise<void> {
    const previous = await this.safeFindById(userId);
    await this.inner.delete(userId);
    await this.evict(previous);
  }

  /** Alias lookup: pointer key -> canonical key, falling back to the source. */
  private async findByAlias(
    aliasKey: string,
    load: () => Promise<UserDocument>,
  ): Promise<UserDocument> {
    const userId = await this.cache.get<string>(aliasKey);
    if (userId) {
      const cached = await this.cache.get<Record<string, unknown>>(canonicalKey(userId));
      if (cached) {
        markCacheOutcome('HIT');
        return UserModel.hydrate(cached);
      }
    }

    const user = await load();
    markCacheOutcome('MISS');
    await this.warm(user);
    return user;
  }

  private async warm(user: UserDocument): Promise<void> {
    const payload = user.toJSON();
    await Promise.all([
      this.cache.set(canonicalKey(user.userId), payload, this.ttlSeconds),
      this.cache.set(accountKey(user.accountNumber), user.userId, this.ttlSeconds),
      this.cache.set(registrationKey(user.registrationNumber), user.userId, this.ttlSeconds),
    ]);
  }

  private async evict(...versions: (UserDocument | null)[]): Promise<void> {
    const keys = new Set<string>();
    for (const version of versions) {
      if (!version) continue;
      keys.add(canonicalKey(version.userId));
      keys.add(accountKey(version.accountNumber));
      keys.add(registrationKey(version.registrationNumber));
    }
    await this.cache.del(...keys);
  }

  private async safeFindById(userId: string): Promise<UserDocument | null> {
    try {
      return await this.inner.findById(userId);
    } catch {
      return null;
    }
  }
}
