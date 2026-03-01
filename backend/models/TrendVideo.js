import mongoose from 'mongoose';

const TrendVideoSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['youtube', 'facebook'],
    required: true,
    index: true,
  },
  videoId: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    default: '',
    trim: true,
  },
  views: {
    type: Number,
    default: 0,
    index: true,
  },
  likes: {
    type: Number,
    default: 0,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnail: String,
  topic: {
    type: String,
    enum: ['hai', 'dance', 'cooking'],
    index: true,
  },
  uploadedAt: Date,
  discoveredAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  localPath: String,
  downloadStatus: {
    type: String,
    enum: ['pending', 'downloading', 'done', 'failed'],
    default: 'pending',
    index: true,
  },
  failReason: String,
  downloadedAt: Date,
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrendChannel',
    index: true,
  },
}, { timestamps: true });

TrendVideoSchema.index({ platform: 1, videoId: 1 }, { unique: true });
TrendVideoSchema.index({ topic: 1, downloadStatus: 1, discoveredAt: -1 });

const TrendVideo = mongoose.models.TrendVideo || mongoose.model('TrendVideo', TrendVideoSchema);

export default TrendVideo;
