import { Schema, model, Document } from 'mongoose';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Role = 'user' | 'admin';

export interface UserDocument extends Document {
  userId: string;
  fullName: string;
  accountNumber: string;
  emailAddress: string;
  registrationNumber: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, unique: true, trim: true },
    emailAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Invalid email address format'],
    },
    registrationNumber: { type: String, required: true, unique: true, trim: true },
    role: { type: String, required: true, enum: ['admin', 'user'] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  },
);

userSchema.virtual('userId').get(function (this: { _id: unknown }) {
  return String(this._id);
});

userSchema.index({ role: 1, fullName: 1 });

export const UserModel = model<UserDocument>('User', userSchema);
