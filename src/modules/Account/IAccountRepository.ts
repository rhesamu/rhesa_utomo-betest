import { Paginated } from '../../shared/Paginated';
import { AccountDocument } from './account.model';

export interface AccountQuery {
  userName?: string;
  userId?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface StaleAccountQuery {
  days?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CreateAccountInput {
  accountId: string;
  userName: string;
  password: string;
  userId: string;
  lastLoginDateTime?: Date;
}

export type UpdateAccountInput = Partial<Omit<CreateAccountInput, 'accountId'>>;

export interface IAccountRepository {
  findAll(query: AccountQuery): Promise<Paginated<AccountDocument>>;
  findById(accountId: string): Promise<AccountDocument>;
  findByUserNameWithPassword(userName: string): Promise<AccountDocument>;
  findStale(query: StaleAccountQuery): Promise<Paginated<AccountDocument>>;
  create(input: CreateAccountInput): Promise<AccountDocument>;
  update(accountId: string, input: UpdateAccountInput): Promise<AccountDocument>;
  delete(accountId: string): Promise<void>;
  recordLogin(accountId: string, at: Date): Promise<AccountDocument>;
}
