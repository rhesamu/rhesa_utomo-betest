import { Schema, model, Document, Types } from 'mongoose';

export interface AccountDocument extends Document {
  accountId: string;
  userName: string;
  password: string;
  lastLoginDateTime?: Date;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<AccountDocument>(
  {
    userName: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    lastLoginDateTime: { type: Date },
    // 1:1 with User.
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret._id;
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  },
);

accountSchema.virtual('accountId').get(function (this: { _id: unknown }) {
  return String(this._id);
});

accountSchema.index({ lastLoginDateTime: -1 });

export const AccountModel = model<AccountDocument>('Account', accountSchema);
