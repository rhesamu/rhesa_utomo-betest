import { Paginated } from '../../shared/Paginated';
import { Role, UserDocument } from './user.model';

export interface UserQuery {
  fullName?: string;
  accountNumber?: string;
  registrationNumber?: string;
  role?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserInput {
  userId: string;
  fullName: string;
  accountNumber: string;
  emailAddress: string;
  registrationNumber: string;
  role: Role;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'userId'>>;

export interface IUserRepository {
  findAll(query: UserQuery): Promise<Paginated<UserDocument>>;
  findById(userId: string): Promise<UserDocument>;
  findByAccountNumber(accountNumber: string): Promise<UserDocument>;
  findByRegistrationNumber(registrationNumber: string): Promise<UserDocument>;
  create(user: CreateUserInput): Promise<UserDocument>;
  update(userId: string, input: UpdateUserInput): Promise<UserDocument>;
  delete(userId: string): Promise<void>;
}