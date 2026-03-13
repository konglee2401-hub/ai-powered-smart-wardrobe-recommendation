import mongoose from 'mongoose';

/**
 * DriveTemplateSource stores the list of Drive folders that provide template
 * footage for mashup/composition jobs. The UI reads health + strategy from
 * here so operators can validate folder connectivity without opening raw config.
 */
const DriveTemplateSourceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  folderId: {
    type: String,
    required: true,
    trim: true,
  },
  folderPath: {
    type: String,
    default: '',
    trim: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  selectionStrategy: {
    type: String,
    enum: ['random', 'weighted', 'ai_suggested'],
    default: 'random',
  },
  healthStatus: {
    type: String,
    enum: ['unknown', 'healthy', 'warning', 'error'],
    default: 'unknown',
    index: true,
  },
  lastCheckedAt: Date,
  lastError: String,
  notes: String,
}, {
  timestamps: true,
});

DriveTemplateSourceSchema.index({ enabled: 1, healthStatus: 1, updatedAt: -1 });
DriveTemplateSourceSchema.index({ userId: 1, folderId: 1 }, { unique: true, sparse: true });

const DriveTemplateSource =
  mongoose.models.DriveTemplateSource || mongoose.model('DriveTemplateSource', DriveTemplateSourceSchema);

export default DriveTemplateSource;
