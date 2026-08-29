import jwt from 'jsonwebtoken';
import { JwtService } from '../../src/infra/jwt/JwtService';
import { TokenPayload } from '../../src/infra/jwt/ITokenService';
import { UnauthorizedError } from '../../src/core/errors/AppError';

const SECRET = 'a'.repeat(32);
const OTHER_SECRET = 'b'.repeat(32);

const payload: TokenPayload = {
  accountId: 'ACC-1',
  userId: 'USR-1',
  userName: 'alice',
  role: 'admin',
};

const service = new JwtService(SECRET, '1h');

describe('JwtService', () => {
  it('round-trips a payload', () => {
    expect(service.verify(service.sign(payload))).toEqual(payload);
  });

  it('sets an expiry matching the configured lifetime', () => {
    const decoded = jwt.decode(service.sign(payload)) as jwt.JwtPayload;
    expect(decoded.exp! - decoded.iat!).toBe(3600);
  });

  it('does not carry a password field', () => {
    expect(JSON.stringify(jwt.decode(service.sign(payload)))).not.toContain('password');
  });

  describe('rejects', () => {
    it('a token signed with a different secret', () => {
      const foreign = jwt.sign(payload, OTHER_SECRET, { expiresIn: '1h' });
      expect(() => service.verify(foreign)).toThrow(UnauthorizedError);
    });

    it('an expired token', () => {
      const expired = jwt.sign(payload, SECRET, { expiresIn: '-1s' });
      expect(() => service.verify(expired)).toThrow(UnauthorizedError);
    });

    it('a malformed token', () => {
      expect(() => service.verify('not.a.jwt')).toThrow(UnauthorizedError);
    });

    it('a validly signed token missing required claims', () => {
      const thin = jwt.sign({ foo: 'bar' }, SECRET, { expiresIn: '1h' });
      expect(() => service.verify(thin)).toThrow('Invalid token payload');
    });

    it('a validly signed token whose claims are the wrong type', () => {
      const wrongTypes = jwt.sign({ accountId: 1, userId: 2, userName: 3 }, SECRET, {
        expiresIn: '1h',
      });
      expect(() => service.verify(wrongTypes)).toThrow('Invalid token payload');
    });
  });

  it('uses one indistinguishable message for expired vs bad-signature', () => {
    // Distinguishing them would leak information about the signing setup.
    const expired = jwt.sign(payload, SECRET, { expiresIn: '-1s' });
    const foreign = jwt.sign(payload, OTHER_SECRET, { expiresIn: '1h' });

    const messageOf = (token: string) => {
      try {
        service.verify(token);
        return null;
      } catch (err) {
        return (err as Error).message;
      }
    };

    expect(messageOf(expired)).toBe(messageOf(foreign));
    expect(messageOf(expired)).toBe('Invalid or expired token');
  });

  it('treats an absent role as undefined rather than throwing', () => {
    const noRole = jwt.sign({ accountId: 'ACC-1', userId: 'USR-1', userName: 'alice' }, SECRET, {
      expiresIn: '1h',
    });
    expect(service.verify(noRole).role).toBeUndefined();
  });
});
