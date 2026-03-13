import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'default' },
    allowedAIProviders: { type: [String], default: [] },
    allowedBrowserAutomations: { type: [String], default: [] },
    defaultPermissions: {
      menu: { type: [String], default: [] },
      api: { type: [String], default: [] },
      queue: { type: [String], default: [] },
      job: { type: [String], default: [] },
    },
    defaultUserSettings: {
      generation: { type: mongoose.Schema.Types.Mixed, default: {} },
      videoPipeline: { type: mongoose.Schema.Types.Mixed, default: {} },
      scheduler: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true }
);

export default mongoose.model('SystemSettings', systemSettingsSchema);
