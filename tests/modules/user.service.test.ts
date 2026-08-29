import { mock } from 'jest-mock-extended';
import { UserService } from '../../src/modules/User/user.service';
import { IUserRepository } from '../../src/modules/User/IUserRepository';
import { UserDocument } from '../../src/modules/User/user.model';

const user = { userId: 'USR-1', role: 'admin' } as UserDocument;
const empty = { items: [], total: 0, page: 1, limit: 20 };

function build() {
  const repository = mock<IUserRepository>();
  return { repository, service: new UserService(repository) };
}

describe('UserService', () => {
  it('forwards list queries untouched', async () => {
    const { repository, service } = build();
    repository.findAll.mockResolvedValue(empty);

    await service.list({ role: 'admin', page: 2 });

    expect(repository.findAll).toHaveBeenCalledWith({ role: 'admin', page: 2 });
  });

  it.each([
    ['getByUserId', 'findById', 'USR-1'],
    ['getByAccountNumber', 'findByAccountNumber', 'ACCT-1'],
    ['getByRegistrationNumber', 'findByRegistrationNumber', 'REG-1'],
  ] as const)('%s delegates to %s', async (serviceMethod, repoMethod, arg) => {
    const { repository, service } = build();
    repository[repoMethod].mockResolvedValue(user);

    await service[serviceMethod](arg);

    expect(repository[repoMethod]).toHaveBeenCalledWith(arg);
  });

  it('propagates repository errors rather than swallowing them', async () => {
    const { repository, service } = build();
    repository.findById.mockRejectedValue(new Error('Not found'));

    await expect(service.getByUserId('missing')).rejects.toThrow('Not found');
  });

  it('forwards create, update and delete', async () => {
    const { repository, service } = build();
    repository.create.mockResolvedValue(user);
    repository.update.mockResolvedValue(user);

    const input = {
      userId: 'USR-1',
      fullName: 'Alice',
      accountNumber: 'ACCT-1',
      emailAddress: 'alice@example.com',
      registrationNumber: 'REG-1',
      role: 'admin' as const,
    };
    await service.create(input);
    await service.update('USR-1', { fullName: 'Updated' });
    await service.delete('USR-1');

    expect(repository.create).toHaveBeenCalledWith(input);
    expect(repository.update).toHaveBeenCalledWith('USR-1', { fullName: 'Updated' });
    expect(repository.delete).toHaveBeenCalledWith('USR-1');
  });
});
