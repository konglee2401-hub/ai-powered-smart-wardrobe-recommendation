import mongoose from 'mongoose';

const SourceCriteriaSchema = new mongoose.Schema({
  minViews: {
    type: Number,
    default: 0,
    min: 0,
  },
  minSubscribers: {
    type: Number,
    default: 0,
    min: 0,
  },
  minTotalVideos: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

/**
 * TrendSourceConfig is the Mongo-backed source registry for scraper providers.
 * The unified pipeline uses this collection to show operators which providers
 * exist, what default URL they point at, and which thresholds are used when
 * a scraper decides whether a channel/video is worth storing.
 */
const TrendSourceConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  provider: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  defaultUrl: {
    type: String,
    default: '',
    trim: true,
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true,
  },
  allowDelete: {
    type: Boolean,
    default: true,
  },
  videoCriteria: {
    type: SourceCriteriaSchema,
    default: () => ({}),
  },
  channelCriteria: {
    type: SourceCriteriaSchema,
    default: () => ({}),
  },
  sortOrder: {
    type: Number,
    default: 50,
    min: 0,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

TrendSourceConfigSchema.index({ enabled: 1, sortOrder: 1, name: 1 });

const DEFAULT_SOURCE_CONFIGS = [
  {
    key: 'playboard',
    name: 'Playboard',
    provider: 'playboard',
    description: 'Trending channel discovery from Playboard ranking pages.',
    defaultUrl: 'https://playboard.co/en/',
    enabled: true,
    isDefault: true,
    allowDelete: false,
    sortOrder: 10,
    videoCriteria: { minViews: 100000 },
    channelCriteria: { minSubscribers: 10000, minTotalVideos: 5 },
  },
  {
    key: 'youtube',
    name: 'YouTube',
    provider: 'youtube',
    description: 'Direct YouTube source links or playlists for scraping.',
    defaultUrl: 'https://www.youtube.com/',
    enabled: true,
    isDefault: true,
    allowDelete: false,
    sortOrder: 20,
    videoCriteria: { minViews: 50000 },
    channelCriteria: { minSubscribers: 5000, minTotalVideos: 10 },
  },
  {
    key: 'dailyhaha',
    name: 'DailyHaha',
    provider: 'dailyhaha',
    description: 'Humor-focused source used for short-form reuse workflows.',
    defaultUrl: 'https://dailyhaha.com/',
    enabled: true,
    isDefault: true,
    allowDelete: false,
    sortOrder: 30,
    videoCriteria: { minViews: 20000 },
    channelCriteria: { minSubscribers: 0, minTotalVideos: 3 },
  },
];

TrendSourceConfigSchema.statics.ensureDefaults = async function ensureDefaults() {
  for (const item of DEFAULT_SOURCE_CONFIGS) {
    await this.findOneAndUpdate(
      { key: item.key },
      {
        $set: {
          ...item,
          isDefault: true,
          allowDelete: false,
          sortOrder: item.sortOrder,
        },
      },
      { upsert: true, new: true }
    );
  }

  return this.find({}).sort({ sortOrder: 1, name: 1 }).lean();
};

const TrendSourceConfig =
  mongoose.models.TrendSourceConfig || mongoose.model('TrendSourceConfig', TrendSourceConfigSchema);

export default TrendSourceConfig;
