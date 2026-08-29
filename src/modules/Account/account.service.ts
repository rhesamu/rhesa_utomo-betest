import { Paginated } from '../../shared/Paginated';
import { IPasswordHasher } from '../../infra/hash/IPasswordHasher';
import { AccountDocument } from './account.model';
import {
  AccountQuery,
  CreateAccountInput,
  IAccountRepository,
  StaleAccountQuery,
  UpdateAccountInput,
} from './IAccountRepository';

export class AccountService {
  constructor(
    private readonly accountRepository: IAccountRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  list(query: AccountQuery): Promise<Paginated<AccountDocument>> {
    return this.accountRepository.findAll(query);
  }

  getByAccountId(accountId: string): Promise<AccountDocument> {
    return this.accountRepository.findById(accountId);
  }

  listStale(query: StaleAccountQuery): Promise<Paginated<AccountDocument>> {
    return this.accountRepository.findStale(query);
  }

  async create(input: CreateAccountInput): Promise<AccountDocument> {
    const password = await this.passwordHasher.hash(input.password);
    return this.accountRepository.create({ ...input, password });
  }

  async update(accountId: string, input: UpdateAccountInput): Promise<AccountDocument> {
    const payload =
      input.password === undefined
        ? input
        : { ...input, password: await this.passwordHasher.hash(input.password) };
    return this.accountRepository.update(accountId, payload);
  }

  delete(accountId: string): Promise<void> {
    return this.accountRepository.delete(accountId);
  }

  recordLogin(accountId: string, at: Date = new Date()): Promise<AccountDocument> {
    return this.accountRepository.recordLogin(accountId, at);
  }
}
