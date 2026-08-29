import { UnauthorizedError } from '../../core/errors/AppError';
import { IPasswordHasher } from '../../infra/hash/IPasswordHasher';
import { ITokenService, TokenPayload } from '../../infra/jwt/ITokenService';
import { IAccountRepository } from '../Account/IAccountRepository';
import { IUserRepository } from '../User/IUserRepository';
import { LoginDto } from './auth.dto';

export interface LoginResult {
  token: string;
  account: TokenPayload;
}

export class AuthService {
  constructor(
    private readonly accountRepository: IAccountRepository,
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async login({ userName, password }: LoginDto): Promise<LoginResult> {
    const account = await this.findAccountOrUnauthorized(userName);

    const passwordMatches = await this.passwordHasher.compare(password, account.password);
    if (!passwordMatches) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const role = await this.resolveRole(account.userId);

    await this.accountRepository.recordLogin(account.accountId, new Date());

    const payload: TokenPayload = {
      accountId: account.accountId,
      userId: account.userId,
      userName: account.userName,
      role,
    };

    return { token: this.tokenService.sign(payload), account: payload };
  }

  private async findAccountOrUnauthorized(userName: string) {
    try {
      return await this.accountRepository.findByUserNameWithPassword(userName);
    } catch {
      throw new UnauthorizedError('Invalid credentials');
    }
  }

  private async resolveRole(userId: string): Promise<string | undefined> {
    try {
      const user = await this.userRepository.findById(userId);
      return user.role;
    } catch {
      return undefined;
    }
  }
}
