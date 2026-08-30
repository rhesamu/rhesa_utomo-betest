import { Paginated } from '../../shared/Paginated';
import { IUserRepository, CreateUserInput, UpdateUserInput, UserQuery } from './IUserRepository';
import { UserDocument } from './user.model';

export class UserService {
    // Interchangeable between MongoUserRepository and CachedUserRepository
  constructor(private readonly userRepository: IUserRepository) {}

  list(query: UserQuery): Promise<Paginated<UserDocument>> {
    return this.userRepository.findAll(query);
  }

  getByUserId(userId: string): Promise<UserDocument> {
    return this.userRepository.findById(userId);
  }

  getByAccountNumber(accountNumber: string): Promise<UserDocument> {
    return this.userRepository.findByAccountNumber(accountNumber);
  }

  getByRegistrationNumber(registrationNumber: string): Promise<UserDocument> {
    return this.userRepository.findByRegistrationNumber(registrationNumber);
  }

  create(input: CreateUserInput): Promise<UserDocument> {
    return this.userRepository.create(input);
  }

  update(userId: string, input: UpdateUserInput): Promise<UserDocument> {
    return this.userRepository.update(userId, input);
  }

  delete(userId: string): Promise<void> {
    return this.userRepository.delete(userId);
  }
}
