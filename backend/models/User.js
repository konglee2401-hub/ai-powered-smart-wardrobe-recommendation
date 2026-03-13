import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    authProviders: {
      google: {
        id: String,
        email: String,
        name: String,
        picture: String,
      },
    },
    permissions: {
      menu: { type: [String], default: [] },
      api: { type: [String], default: [] },
      queue: { type: [String], default: [] },
      job: { type: [String], default: [] },
    },
    access: {
      aiProviders: { type: [String], default: [] },
      browserAutomations: { type: [String], default: [] },
    },
    settings: {
      generation: { type: mongoose.Schema.Types.Mixed, default: {} },
      videoPipeline: { type: mongoose.Schema.Types.Mixed, default: {} },
      scheduler: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    preferences: {
      favoriteColors: [String],
      favoriteStyles: [String],
      bodyType: String,
    },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model('User', userSchema);
