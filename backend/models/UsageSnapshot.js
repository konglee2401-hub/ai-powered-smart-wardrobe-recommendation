import mongoose from 'mongoose';

const usageSnapshotSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD
    generation: {
      image: { type: Number, default: 0 },
      video: { type: Number, default: 0 },
      voice: { type: Number, default: 0 },
      oneClick: { type: Number, default: 0 },
    },
    scrape: {
      runs: { type: Number, default: 0 },
      videos: { type: Number, default: 0 },
    },
    mashup: {
      running: { type: Number, default: 0 },
    },
    storage: {
      usedGB: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

usageSnapshotSchema.index({ user: 1, dateKey: 1 }, { unique: true });

const UsageSnapshot =
  mongoose.models.UsageSnapshot || mongoose.model('UsageSnapshot', usageSnapshotSchema);

export default UsageSnapshot;
