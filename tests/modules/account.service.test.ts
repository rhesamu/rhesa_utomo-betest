import { mock } from 'jest-mock-extended';
import { AccountService } from '../../src/modules/Account/account.service';
import { IAccountRepository } from '../../src/modules/Account/IAccountRepository';
import { IPasswordHasher } from '../../src/infra/hash/IPasswordHasher';
import { AccountDocument } from '../../src/modules/Account/account.model';
import { ACCOUNT_ID, USER_ID } from '../helpers/ids';

const HASHED = '$2b$10$hashedvalue';

function build() {
  const repository = mock<IAccountRepository>();
  const hasher = mock<IPasswordHasher>();
  hasher.hash.mockResolvedValue(HASHED);
  repository.create.mockResolvedValue({} as AccountDocument);
  repository.update.mockResolvedValue({} as AccountDocument);
  return { repository, hasher, service: new AccountService(repository, hasher) };
}

describe('AccountService', () => {
  describe('create', () => {
    it('hashes the password before it reaches the repository', async () => {
      const { repository, hasher, service } = build();

      await service.create({
        userName: 'alice',
        password: 'plaintext123',
        userId: USER_ID,
      });

      expect(hasher.hash).toHaveBeenCalledWith('plaintext123');
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ password: HASHED }));
    });

    it('never passes the plaintext through', async () => {
      const { repository, service } = build();

      await service.create({
        userName: 'alice',
        password: 'plaintext123',
        userId: USER_ID,
      });

      const persisted = repository.create.mock.calls[0][0];
      expect(persisted.password).not.toBe('plaintext123');
    });
  });

  describe('update', () => {
    it('hashes a supplied password', async () => {
      const { repository, hasher, service } = build();

      await service.update(ACCOUNT_ID, { password: 'newpassword1' });

      expect(hasher.hash).toHaveBeenCalledWith('newpassword1');
      expect(repository.update).toHaveBeenCalledWith(ACCOUNT_ID, { password: HASHED });
    });

    it('does not invoke the hasher when no password is supplied', async () => {
      const { repository, hasher, service } = build();

      await service.update(ACCOUNT_ID, { userName: 'bob' });

      expect(hasher.hash).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(ACCOUNT_ID, { userName: 'bob' });
    });
  });

  describe('delegation', () => {
    it('passes the stale-account query straight through', async () => {
      const { repository, service } = build();
      repository.findStale.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

      await service.listStale({ days: 7 });

      expect(repository.findStale).toHaveBeenCalledWith({ days: 7 });
    });

    it('forwards list queries untouched', async () => {
      const { repository, service } = build();
      repository.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

      await service.list({ userName: 'ali', page: 2 });

      expect(repository.findAll).toHaveBeenCalledWith({ userName: 'ali', page: 2 });
    });

    it('forwards detail lookups', async () => {
      const { repository, service } = build();
      repository.findById.mockResolvedValue({} as AccountDocument);

      await service.getByAccountId(ACCOUNT_ID);

      expect(repository.findById).toHaveBeenCalledWith(ACCOUNT_ID);
    });

    it('forwards deletes', async () => {
      const { repository, service } = build();

      await service.delete(ACCOUNT_ID);

      expect(repository.delete).toHaveBeenCalledWith(ACCOUNT_ID);
    });

    it('propagates repository errors rather than swallowing them', async () => {
      const { repository, service } = build();
      repository.findById.mockRejectedValue(new Error('Account not found: ACC-9'));

      await expect(service.getByAccountId('ACC-9')).rejects.toThrow('Account not found: ACC-9');
    });

    it('passes an explicit recordLogin timestamp through', async () => {
      const { repository, service } = build();
      repository.recordLogin.mockResolvedValue({} as AccountDocument);
      const at = new Date('2026-01-01T00:00:00Z');

      await service.recordLogin(ACCOUNT_ID, at);

      expect(repository.recordLogin).toHaveBeenCalledWith(ACCOUNT_ID, at);
    });

    it('defaults recordLogin to the current time', async () => {
      const { repository, service } = build();
      repository.recordLogin.mockResolvedValue({} as AccountDocument);

      await service.recordLogin(ACCOUNT_ID);

      expect(repository.recordLogin).toHaveBeenCalledWith(ACCOUNT_ID, expect.any(Date));
    });
  });
});
