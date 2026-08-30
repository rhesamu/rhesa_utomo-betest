import { Types } from 'mongoose';

export const oid = (n: number): string => n.toString(16).padStart(24, '0');

export const objectId = (n: number): Types.ObjectId => new Types.ObjectId(oid(n));

export const USER_ID = oid(1);
export const ACCOUNT_ID = oid(2);
