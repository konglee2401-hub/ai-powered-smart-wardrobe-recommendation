import mongoose from 'mongoose';

const TrendChannelSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['youtube', 'facebook'],
    required: true,
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
  topic: [{
    type: String,
    enum: ['hai', 'dance', 'cooking'],
  }],
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
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

TrendChannelSchema.index({ platform: 1, channelId: 1 }, { unique: true });
TrendChannelSchema.index({ isActive: 1, priority: -1 });

const TrendChannel = mongoose.models.TrendChannel || mongoose.model('TrendChannel', TrendChannelSchema);

export default TrendChannel;
