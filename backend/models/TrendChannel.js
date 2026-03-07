import mongoose from 'mongoose';

/**
 * TrendChannel is the Mongo record for a discovered publisher/channel.
 * The unified pipeline reads this collection directly so operators can review
 * source health, thresholds, and video counts without going through the
 * Python scraper API at page-render time.
 */
const TrendChannelSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['youtube', 'facebook', 'dailyhaha', 'douyin', 'playboard', 'other'],
    required: true,
    index: true,
  },
  sourceKey: {
    type: String,
    default: '',
    trim: true,
    index: true,
  },
  channelId: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    default: '',
    trim: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  channelUrl: {
    type: String,
    default: '',
    trim: true,
  },
  topic: [{
    type: String,
    enum: ['hai', 'dance', 'cooking'],
  }],
  subscriberCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5,
  },
  totalVideos: {
    type: Number,
    default: 0,
  },
  lastScanned: Date,
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  healthStatus: {
    type: String,
    enum: ['healthy', 'warning', 'inactive', 'error'],
    default: 'healthy',
    index: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

TrendChannelSchema.index({ platform: 1, channelId: 1 }, { unique: true });
TrendChannelSchema.index({ isActive: 1, priority: -1, subscriberCount: -1 });

const TrendChannel = mongoose.models.TrendChannel || mongoose.model('TrendChannel', TrendChannelSchema);

export default TrendChannel;
