import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'user']);

export const createUserSchema = z.object({
  userId: z.string().min(1),
  fullName: z.string().min(1),
  accountNumber: z.string().min(1),
  emailAddress: z.string().email(),
  registrationNumber: z.string().min(1),
  role: roleSchema,
});

export const updateUserSchema = createUserSchema.omit({ userId: true }).partial();

export const listUserQuerySchema = z.object({
  role: roleSchema.optional(),
  fullName: z.string().min(1).optional(),
  accountNumber: z.string().min(1).optional(),
  registrationNumber: z.string().min(1).optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

export const accountNumberParamSchema = z.object({
  accountNumber: z.string().min(1),
});

export const registrationNumberParamSchema = z.object({
  registrationNumber: z.string().min(1),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type ListUserQueryDto = z.infer<typeof listUserQuerySchema>;