import { mock } from 'jest-mock-extended';
import { AuthService } from '../../src/modules/Auth/auth.service';
import { IAccountRepository } from '../../src/modules/Account/IAccountRepository';
import { IUserRepository } from '../../src/modules/User/IUserRepository';
import { IPasswordHasher } from '../../src/infra/hash/IPasswordHasher';
import { ITokenService } from '../../src/infra/jwt/ITokenService';
import { AccountDocument } from '../../src/modules/Account/account.model';
import { UserDocument } from '../../src/modules/User/user.model';
import { UnauthorizedError } from '../../src/core/errors/AppError';
import { ACCOUNT_ID, USER_ID, objectId } from '../helpers/ids';

const account = {
  accountId: ACCOUNT_ID,
  userName: 'alice',
  password: '$2b$10$storedhash',
  userId: objectId(1),
} as unknown as AccountDocument;

const user = { userId: USER_ID, role: 'admin' } as UserDocument;

function build() {
  const accountRepository = mock<IAccountRepository>();
  const userRepository = mock<IUserRepository>();
  const hasher = mock<IPasswordHasher>();
  const tokenService = mock<ITokenService>();

  accountRepository.findByUserNameWithPassword.mockResolvedValue(account);
  accountRepository.recordLogin.mockResolvedValue(account);
  userRepository.findById.mockResolvedValue(user);
  hasher.compare.mockResolvedValue(true);
  tokenService.sign.mockReturnValue('signed.jwt.token');

  return {
    accountRepository,
    userRepository,
    hasher,
    tokenService,
    service: new AuthService(accountRepository, userRepository, hasher, tokenService),
  };
}

const credentials = { userName: 'alice', password: 'supersecret1' };

describe('AuthService.login', () => {
  describe('on success', () => {
    it('compares against the stored hash, not the plaintext', async () => {
      const { hasher, service } = build();
      await service.login(credentials);
      expect(hasher.compare).toHaveBeenCalledWith('supersecret1', '$2b$10$storedhash');
    });

    it('signs a payload carrying identity and role, and no password', async () => {
      const { tokenService, service } = build();

      const result = await service.login(credentials);

      expect(tokenService.sign).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        userId: USER_ID,
        userName: 'alice',
        role: 'admin',
      });
      expect(result.token).toBe('signed.jwt.token');
      expect(JSON.stringify(result)).not.toContain('storedhash');
      expect(typeof tokenService.sign.mock.calls[0][0].userId).toBe('string');
    });

    it('stamps the login time', async () => {
      const { accountRepository, service } = build();
      await service.login(credentials);
      expect(accountRepository.recordLogin).toHaveBeenCalledWith(ACCOUNT_ID, expect.any(Date));
    });

    it('resolves role from the User record', async () => {
      const { userRepository, service } = build();
      await service.login(credentials);
      expect(userRepository.findById).toHaveBeenCalledWith(USER_ID);
    });

    it('still issues a token when the User record is missing', async () => {
      const { userRepository, tokenService, service } = build();
      userRepository.findById.mockRejectedValue(new Error('not found'));

      await service.login(credentials);

      expect(tokenService.sign).toHaveBeenCalledWith(expect.objectContaining({ role: undefined }));
    });
  });

  describe('on failure', () => {
    it('rejects a wrong password', async () => {
      const { hasher, service } = build();
      hasher.compare.mockResolvedValue(false);
      await expect(service.login(credentials)).rejects.toThrow(UnauthorizedError);
    });

    it('rejects an unknown user name', async () => {
      const { accountRepository, service } = build();
      accountRepository.findByUserNameWithPassword.mockRejectedValue(new Error('not found'));
      await expect(service.login(credentials)).rejects.toThrow(UnauthorizedError);
    });

    it('uses an identical message for unknown user and wrong password', async () => {
      const wrongPassword = build();
      wrongPassword.hasher.compare.mockResolvedValue(false);

      const unknownUser = build();
      unknownUser.accountRepository.findByUserNameWithPassword.mockRejectedValue(
        new Error('not found'),
      );

      const messageOf = async (svc: AuthService) => {
        try {
          await svc.login(credentials);
          return null;
        } catch (err) {
          return (err as Error).message;
        }
      };

      const [wrongPasswordMsg, unknownUserMsg] = await Promise.all([
        messageOf(wrongPassword.service),
        messageOf(unknownUser.service),
      ]);
      expect(wrongPasswordMsg).toBe(unknownUserMsg);
      expect(wrongPasswordMsg).toBe('Invalid credentials');
    });

    it('does not stamp a login time on a failed attempt', async () => {
      const { accountRepository, hasher, service } = build();
      hasher.compare.mockResolvedValue(false);

      await expect(service.login(credentials)).rejects.toThrow();

      expect(accountRepository.recordLogin).not.toHaveBeenCalled();
    });
  });
});
