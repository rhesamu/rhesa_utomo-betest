import { NotFoundError } from '../../core/errors/AppError';
import { BaseRepository } from '../../shared/BaseRepository';
import { toRepositoryError } from '../../shared/mongoErrors';
import { Paginated } from '../../shared/Paginated';
import { FilterFieldConfig, parseListQuery } from '../../shared/QueryBuilder';
import { AccountDocument, AccountModel } from './account.model';
import {
  AccountQuery,
  CreateAccountInput,
  IAccountRepository,
  StaleAccountQuery,
  UpdateAccountInput,
} from './IAccountRepository';

const FILTER_FIELDS: FilterFieldConfig[] = [
  { field: 'userName', mode: 'text' },
  { field: 'userId', mode: 'exact' },
];

const SORT_FIELDS = ['userName', 'accountId', 'lastLoginDateTime', 'createdAt'];
const STALE_SORT_FIELDS = ['lastLoginDateTime', 'userName', 'createdAt'];

const DEFAULT_STALE_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class MongoAccountRepository
  extends BaseRepository<AccountDocument>
  implements IAccountRepository
{
  constructor() {
    super(AccountModel, 'accountId');
  }

  findAll(query: AccountQuery): Promise<Paginated<AccountDocument>> {
    return this.findMany(query as Record<string, unknown>, FILTER_FIELDS, SORT_FIELDS);
  }

  findById(accountId: string): Promise<AccountDocument> {
    return this.findOneById(accountId);
  }

  async findByUserNameWithPassword(userName: string): Promise<AccountDocument> {
    const document = await AccountModel.findOne({ userName }).select('+password').exec();
    if (!document) {
      throw new NotFoundError(`Account not found for user name: ${userName}`);
    }
    return document;
  }

  async findStale(query: StaleAccountQuery): Promise<Paginated<AccountDocument>> {
    const days = query.days ?? DEFAULT_STALE_DAYS;
    const cutoff = new Date(Date.now() - days * MS_PER_DAY);

    const { sort, skip, limit, page } = parseListQuery<AccountDocument>(
      query as Record<string, unknown>,
      [],
      STALE_SORT_FIELDS,
      { lastLoginDateTime: 1 },
    );

    const filter = { lastLoginDateTime: { $lt: cutoff } };
    const [items, total] = await Promise.all([
      AccountModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      AccountModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  async create(input: CreateAccountInput): Promise<AccountDocument> {
    try {
      return await this.createDocument(input);
    } catch (err) {
      throw toRepositoryError(err);
    }
  }

  async update(accountId: string, input: UpdateAccountInput): Promise<AccountDocument> {
    try {
      return await this.updateOneById(accountId, input);
    } catch (err) {
      throw toRepositoryError(err);
    }
  }

  delete(accountId: string): Promise<void> {
    return this.deleteOneById(accountId);
  }

  recordLogin(accountId: string, at: Date): Promise<AccountDocument> {
    return this.updateOneById(accountId, { lastLoginDateTime: at });
  }
}
