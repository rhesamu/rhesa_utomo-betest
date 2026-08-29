import { toRepositoryError } from '../../src/shared/mongoErrors';
import { ConflictError } from '../../src/core/errors/AppError';

describe('toRepositoryError', () => {
  it('translates a Mongo duplicate-key error into a 409 naming the field', () => {
    const duplicate = Object.assign(new Error('E11000 duplicate key'), {
      code: 11000,
      keyValue: { accountNumber: 'ACCT-1' },
    });

    const result = toRepositoryError(duplicate);

    expect(result).toBeInstanceOf(ConflictError);
    expect((result as ConflictError).statusCode).toBe(409);
    expect(result.message).toBe('accountNumber already exists');
    expect((result as ConflictError).details).toEqual({ accountNumber: 'ACCT-1' });
  });

  it('falls back to a generic field name when keyValue is absent', () => {
    const duplicate = Object.assign(new Error('dup'), { code: 11000 });
    expect(toRepositoryError(duplicate).message).toBe('field already exists');
  });

  it('passes non-duplicate errors through untouched', () => {
    const original = new Error('connection reset');
    expect(toRepositoryError(original)).toBe(original);
  });

  it('wraps non-Error throwables', () => {
    const result = toRepositoryError('something odd');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('something odd');
  });
});
