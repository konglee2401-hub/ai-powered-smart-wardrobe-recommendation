import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    replacedByToken: { type: String, default: null },
    createdByIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    rememberMe: { type: Boolean, default: false },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
