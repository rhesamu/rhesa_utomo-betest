import { mock } from 'jest-mock-extended';
import { CachedUserRepository } from '../../src/modules/User/CachedUserRepository';
import { IUserRepository } from '../../src/modules/User/IUserRepository';
import { ICache } from '../../src/infra/cache/ICache';
import { UserDocument, UserModel } from '../../src/modules/User/user.model';

const TTL = 300;

// hydrate() builds a real UserDocument with no DB connection
const makeUser = (overrides: Record<string, unknown> = {}): UserDocument =>
  UserModel.hydrate({
    _id: '6a9214e0e428b766f7c00fd1',
    userId: 'USR-1',
    fullName: 'Alice',
    accountNumber: 'ACCT-1',
    emailAddress: 'alice@example.com',
    registrationNumber: 'REG-1',
    role: 'admin',
    ...overrides,
  });

function build() {
  const inner = mock<IUserRepository>();
  const cache = mock<ICache>();
  cache.get.mockResolvedValue(null);
  return { inner, cache, repo: new CachedUserRepository(inner, cache, TTL) };
}

describe('CachedUserRepository', () => {
  describe('findById', () => {
    it('on a miss, loads from the source and warms all three keys', async () => {
      const { inner, cache, repo } = build();
      inner.findById.mockResolvedValue(makeUser());

      await repo.findById('USR-1');

      expect(inner.findById).toHaveBeenCalledWith('USR-1');
      expect(cache.set).toHaveBeenCalledWith('user:id:USR-1', expect.anything(), TTL);
      expect(cache.set).toHaveBeenCalledWith('user:acct:ACCT-1', 'USR-1', TTL);
      expect(cache.set).toHaveBeenCalledWith('user:reg:REG-1', 'USR-1', TTL);
    });

    it('on a hit, returns a real document without touching the source', async () => {
      const { inner, cache, repo } = build();
      cache.get.mockResolvedValue(makeUser().toJSON());

      const result = await repo.findById('USR-1');

      expect(inner.findById).not.toHaveBeenCalled();
      expect(result.userId).toBe('USR-1');

      expect(result).toBeInstanceOf(UserModel);
      expect(typeof result.toJSON).toBe('function');
    });
  });

  describe('alias lookups', () => {
    it('resolves pointer key then canonical key', async () => {
      const { inner, cache, repo } = build();
      cache.get.mockImplementation(async (key: string) =>
        key === 'user:acct:ACCT-1' ? 'USR-1' : makeUser().toJSON(),
      );

      const result = await repo.findByAccountNumber('ACCT-1');

      expect(cache.get).toHaveBeenCalledWith('user:acct:ACCT-1');
      expect(cache.get).toHaveBeenCalledWith('user:id:USR-1');
      expect(inner.findByAccountNumber).not.toHaveBeenCalled();
      expect(result.userId).toBe('USR-1');
    });

    it('falls through to the source when the pointer resolves but the payload is gone', async () => {
      const { inner, cache, repo } = build();
      cache.get.mockImplementation(async (key: string) =>
        key === 'user:acct:ACCT-1' ? 'USR-1' : null,
      );
      inner.findByAccountNumber.mockResolvedValue(makeUser());

      await repo.findByAccountNumber('ACCT-1');

      expect(inner.findByAccountNumber).toHaveBeenCalledWith('ACCT-1');
    });

    it('does the same for registration number', async () => {
      const { inner, cache, repo } = build();
      inner.findByRegistrationNumber.mockResolvedValue(makeUser());

      await repo.findByRegistrationNumber('REG-1');

      expect(cache.get).toHaveBeenCalledWith('user:reg:REG-1');
      expect(inner.findByRegistrationNumber).toHaveBeenCalledWith('REG-1');
    });
  });

  describe('invalidation', () => {
    it('evicts on update', async () => {
      const { inner, cache, repo } = build();
      inner.findById.mockResolvedValue(makeUser());
      inner.update.mockResolvedValue(makeUser({ fullName: 'Alice Updated' }));

      await repo.update('USR-1', { fullName: 'Alice Updated' });

      expect(cache.del.mock.calls[0]).toEqual(
        expect.arrayContaining(['user:id:USR-1', 'user:acct:ACCT-1', 'user:reg:REG-1']),
      );
    });

    it('evicts the OLD alias keys when the account number changes', async () => {
      const { inner, cache, repo } = build();
      inner.findById.mockResolvedValue(makeUser({ accountNumber: 'ACCT-OLD' }));
      inner.update.mockResolvedValue(makeUser({ accountNumber: 'ACCT-NEW' }));

      await repo.update('USR-1', { accountNumber: 'ACCT-NEW' });

      const evicted = cache.del.mock.calls[0];
      expect(evicted).toContain('user:acct:ACCT-OLD');
      expect(evicted).toContain('user:acct:ACCT-NEW');
    });

    it('evicts on delete', async () => {
      const { inner, cache, repo } = build();
      inner.findById.mockResolvedValue(makeUser());

      await repo.delete('USR-1');

      expect(inner.delete).toHaveBeenCalledWith('USR-1');
      expect(cache.del.mock.calls[0]).toContain('user:id:USR-1');
    });

    it('still deletes when the record was already absent from cache and source', async () => {
      const { inner, repo } = build();
      inner.findById.mockRejectedValue(new Error('not found'));
      inner.delete.mockResolvedValue(undefined);

      await expect(repo.delete('USR-1')).resolves.toBeUndefined();
      expect(inner.delete).toHaveBeenCalledWith('USR-1');
    });

    it('warms the cache on create', async () => {
      const { inner, cache, repo } = build();
      inner.create.mockResolvedValue(makeUser());

      await repo.create({
        userId: 'USR-1',
        fullName: 'Alice',
        accountNumber: 'ACCT-1',
        emailAddress: 'alice@example.com',
        registrationNumber: 'REG-1',
        role: 'admin',
      });

      expect(cache.set).toHaveBeenCalledWith('user:id:USR-1', expect.anything(), TTL);
    });
  });

  describe('findAll', () => {
    it('is not cached', async () => {
      const { inner, cache, repo } = build();
      inner.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

      await repo.findAll({ role: 'admin' });

      expect(inner.findAll).toHaveBeenCalledWith({ role: 'admin' });
      expect(cache.get).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });
  });
});
