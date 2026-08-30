import { mock } from 'jest-mock-extended';
import { CachedUserRepository } from '../../src/modules/User/CachedUserRepository';
import { IUserRepository } from '../../src/modules/User/IUserRepository';
import { ICache } from '../../src/infra/cache/ICache';
import { UserDocument, UserModel } from '../../src/modules/User/user.model';
import { USER_ID } from '../helpers/ids';

const TTL = 300;

const makeUser = (overrides: Record<string, unknown> = {}): UserDocument =>
  UserModel.hydrate({
    _id: USER_ID,
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

      await repo.findById(USER_ID);

      expect(inner.findById).toHaveBeenCalledWith(USER_ID);
      expect(cache.set).toHaveBeenCalledWith(
        `user:id:${USER_ID}`,
        expect.objectContaining({ _id: expect.anything() }),
        TTL,
      );
      expect(cache.set).toHaveBeenCalledWith('user:acct:ACCT-1', USER_ID, TTL);
      expect(cache.set).toHaveBeenCalledWith('user:reg:REG-1', USER_ID, TTL);
    });

    it('on a hit, returns a real document without touching the source', async () => {
      const { inner, cache, repo } = build();
      cache.get.mockResolvedValue(makeUser().toObject());

      const result = await repo.findById(USER_ID);

      expect(inner.findById).not.toHaveBeenCalled();
      expect(result.userId).toBe(USER_ID);

      expect(result).toBeInstanceOf(UserModel);
      expect(typeof result.toJSON).toBe('function');
      expect(String(result._id)).toBe(USER_ID);
    });
  });

  describe('alias lookups', () => {
    it('resolves pointer key then canonical key', async () => {
      const { inner, cache, repo } = build();
      cache.get.mockImplementation(async (key: string) =>
        key === 'user:acct:ACCT-1' ? USER_ID : makeUser().toObject(),
      );

      const result = await repo.findByAccountNumber('ACCT-1');

      expect(cache.get).toHaveBeenCalledWith('user:acct:ACCT-1');
      expect(cache.get).toHaveBeenCalledWith(`user:id:${USER_ID}`);
      expect(inner.findByAccountNumber).not.toHaveBeenCalled();
      expect(result.userId).toBe(USER_ID);
    });

    it('falls through to the source when the pointer resolves but the payload is gone', async () => {
      const { inner, cache, repo } = build();
      cache.get.mockImplementation(async (key: string) =>
        key === 'user:acct:ACCT-1' ? USER_ID : null,
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

      await repo.update(USER_ID, { fullName: 'Alice Updated' });

      expect(cache.del.mock.calls[0]).toEqual(
        expect.arrayContaining([`user:id:${USER_ID}`, 'user:acct:ACCT-1', 'user:reg:REG-1']),
      );
    });

    it('evicts the OLD alias keys when the account number changes', async () => {
      const { inner, cache, repo } = build();
      inner.findById.mockResolvedValue(makeUser({ accountNumber: 'ACCT-OLD' }));
      inner.update.mockResolvedValue(makeUser({ accountNumber: 'ACCT-NEW' }));

      await repo.update(USER_ID, { accountNumber: 'ACCT-NEW' });

      const evicted = cache.del.mock.calls[0];
      expect(evicted).toContain('user:acct:ACCT-OLD');
      expect(evicted).toContain('user:acct:ACCT-NEW');
    });

    it('evicts on delete', async () => {
      const { inner, cache, repo } = build();
      inner.findById.mockResolvedValue(makeUser());

      await repo.delete(USER_ID);

      expect(inner.delete).toHaveBeenCalledWith(USER_ID);
      expect(cache.del.mock.calls[0]).toContain(`user:id:${USER_ID}`);
    });

    it('still deletes when the record was already absent from cache and source', async () => {
      const { inner, repo } = build();
      inner.findById.mockRejectedValue(new Error('not found'));
      inner.delete.mockResolvedValue(undefined);

      await expect(repo.delete(USER_ID)).resolves.toBeUndefined();
      expect(inner.delete).toHaveBeenCalledWith(USER_ID);
    });

    it('warms the cache on create', async () => {
      const { inner, cache, repo } = build();
      inner.create.mockResolvedValue(makeUser());

      await repo.create({
        fullName: 'Alice',
        accountNumber: 'ACCT-1',
        emailAddress: 'alice@example.com',
        registrationNumber: 'REG-1',
        role: 'admin',
      });

      expect(cache.set).toHaveBeenCalledWith(`user:id:${USER_ID}`, expect.anything(), TTL);
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
