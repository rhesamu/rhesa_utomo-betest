import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { UnauthorizedError } from '../../core/errors/AppError';
import { ITokenService, TokenPayload } from './ITokenService';

export class JwtService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: SignOptions['expiresIn'],
  ) {}

  sign(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verify(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (typeof decoded === 'string') {
        throw new UnauthorizedError('Invalid token payload');
      }
      return this.toTokenPayload(decoded);
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  private toTokenPayload(decoded: JwtPayload): TokenPayload {
    const { accountId, userId, userName, role } = decoded;
    if (
      typeof accountId !== 'string' ||
      typeof userId !== 'string' ||
      typeof userName !== 'string'
    ) {
      throw new UnauthorizedError('Invalid token payload');
    }
    return { accountId, userId, userName, role: typeof role === 'string' ? role : undefined };
  }
}
