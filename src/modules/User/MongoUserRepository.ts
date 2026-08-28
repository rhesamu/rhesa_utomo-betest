import { NotFoundError } from '../../core/errors/AppError';
import { BaseRepository } from '../../shared/BaseRepository';
import { toRepositoryError } from '../../shared/mongoErrors';
import { Paginated } from '../../shared/Paginated';
import { FilterFieldConfig } from '../../shared/QueryBuilder';
import { UserDocument, UserModel } from './user.model';
import { CreateUserInput, IUserRepository, UpdateUserInput, UserQuery } from './IUserRepository';

const FILTER_FIELDS: FilterFieldConfig[] = [
  { field: 'fullName', mode: 'text' },
  { field: 'role', mode: 'exact' },
  { field: 'accountNumber', mode: 'exact' },
  { field: 'registrationNumber', mode: 'exact' },
];

const SORT_FIELDS = ['fullName', 'accountNumber', 'registrationNumber', 'role', 'createdAt'];

export class MongoUserRepository extends BaseRepository<UserDocument> implements IUserRepository {
  constructor() {
    super(UserModel, 'userId');
  }

  findAll(query: UserQuery): Promise<Paginated<UserDocument>> {
    return this.findMany(query as Record<string, unknown>, FILTER_FIELDS, SORT_FIELDS);
  }

  findById(userId: string): Promise<UserDocument> {
    return this.findOneById(userId);
  }

  async findByAccountNumber(accountNumber: string): Promise<UserDocument> {
    const doc = await UserModel.findOne({ accountNumber }).exec();
    if (!doc) {
      throw new NotFoundError(`User not found for account number: ${accountNumber}`);
    }
    return doc;
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<UserDocument> {
    const doc = await UserModel.findOne({ registrationNumber }).exec();
    if (!doc) {
      throw new NotFoundError(`User not found for registration number: ${registrationNumber}`);
    }
    return doc;
  }

  async create(user: CreateUserInput): Promise<UserDocument> {
    try {
      return await this.createDocument(user);
    } catch (err) {
      throw toRepositoryError(err);
    }
  }

  async update(userId: string, input: UpdateUserInput): Promise<UserDocument> {
    try {
      return await this.updateOneById(userId, input);
    } catch (err) {
      throw toRepositoryError(err);
    }
  }

  delete(userId: string): Promise<void> {
    return this.deleteOneById(userId);
  }
}
