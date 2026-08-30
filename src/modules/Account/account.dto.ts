import { z } from 'zod';
import { objectIdSchema } from '../../shared/objectId';

export const createAccountSchema = z.object({
  userName: z.string().min(3),
  password: z.string().min(8),
  userId: objectIdSchema,
  lastLoginDateTime: z.coerce.date().optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

export const listAccountQuerySchema = z.object({
  userName: z.string().min(1).optional(),
  userId: objectIdSchema.optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const staleAccountQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(3650).default(3),
  sort: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const accountIdParamSchema = z.object({
  accountId: objectIdSchema,
});

export type CreateAccountDto = z.infer<typeof createAccountSchema>;
export type UpdateAccountDto = z.infer<typeof updateAccountSchema>;
export type ListAccountQueryDto = z.infer<typeof listAccountQuerySchema>;
export type StaleAccountQueryDto = z.infer<typeof staleAccountQuerySchema>;
