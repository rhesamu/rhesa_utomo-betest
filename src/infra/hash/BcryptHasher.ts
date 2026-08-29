import bcrypt from 'bcryptjs';
import { IPasswordHasher } from './IPasswordHasher';

const DEFAULT_SALT_ROUNDS = 10;

export class BcryptHasher implements IPasswordHasher {
  constructor(private readonly saltRounds: number = DEFAULT_SALT_ROUNDS) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
