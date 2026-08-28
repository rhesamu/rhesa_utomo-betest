import { ConflictError } from '../core/errors/AppError';

interface MongoDuplicateKeyError extends Error {
  code: number;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

export function toRepositoryError(err: unknown): Error {
  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    return new ConflictError(`${field} already exists`, err.keyValue);
  }
  return err instanceof Error ? err : new Error(String(err));
}
