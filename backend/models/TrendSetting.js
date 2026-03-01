import mongoose from 'mongoose';

const TrendSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    default: 'default',
  },
  keywords: {
    hai: [{ type: String }],
    dance: [{ type: String }],
    cooking: [{ type: String }],
  },
  cronTimes: {
    discover: { type: String, default: '0 7 * * *' },
    scan: { type: String, default: '30 8 * * *' },
  },
  maxConcurrentDownload: {
    type: Number,
    default: 3,
    min: 1,
    max: 10,
  },
  minViewsFilter: {
    type: Number,
    default: 100000,
  },
  minChannelFollowers: {
    type: Number,
    default: 100000,
  },
  minChannelTotalVideos: {
    type: Number,
    default: 10,
  },
  highPriorityViews: {
    type: Number,
    default: 1000000,
  },
  proxyList: [{ type: String }],
  telegramBotToken: { type: String, default: '' },
  isEnabled: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

TrendSettingSchema.statics.getOrCreateDefault = async function getOrCreateDefault() {
  const defaults = {
    key: 'default',
    keywords: {
      hai: ['hài', 'funny', 'comedy', 'skit'],
      dance: ['dance', 'nhảy', 'vũ đạo', 'choreography'],
      cooking: ['cooking', 'nấu ăn', 'recipe', 'món ngon'],
    },
    minChannelFollowers: 100000,
    minChannelTotalVideos: 10,
    highPriorityViews: 1000000,
  };

  const setting = await this.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: defaults },
    { new: true, upsert: true }
  );

  return setting;
};

const TrendSetting = mongoose.models.TrendSetting || mongoose.model('TrendSetting', TrendSettingSchema);

export default TrendSetting;
