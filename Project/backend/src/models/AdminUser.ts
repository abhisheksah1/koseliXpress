import mongoose, { Schema, Document } from 'mongoose';

export interface AdminUserDocument extends Document {
  email: string;
  password: string;
  passcode: string;
  fullName: string;
  username: string;
  role: string;
  status: 'active' | 'inactive';
  isSuperAdmin: boolean;
  mobile: string;
}

const adminUserSchema = new Schema<AdminUserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    passcode: { type: String, default: '0000' },
    fullName: { type: String, default: 'Super Admin' },
    username: { type: String, default: 'superadmin' },
    role: { type: String, default: 'admin' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isSuperAdmin: { type: Boolean, default: true },
    mobile: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'admin_users',
  }
);

export const AdminUserModel = mongoose.model<AdminUserDocument>('AdminUser', adminUserSchema);
