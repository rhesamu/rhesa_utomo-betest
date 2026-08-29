import { Schema, model, Document } from 'mongoose';

export interface AccountDocument extends Document {
  accountId: string;
  userName: string;
  password: string;
  lastLoginDateTime?: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<AccountDocument>(
  {
    accountId: { type: String, required: true, unique: true, trim: true },
    userName: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    lastLoginDateTime: { type: Date },
    // 1:1 with User.
    userId: { type: String, required: true, unique: true, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

accountSchema.index({ lastLoginDateTime: -1 });

export const AccountModel = model<AccountDocument>('Account', accountSchema);
