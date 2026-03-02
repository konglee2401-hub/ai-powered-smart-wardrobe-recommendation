import mongoose from 'mongoose';

const PlayboardConfigSchema = new mongoose.Schema({
  dimension: {
    type: String,
    enum: ['most-viewed', 'most-liked', 'most-commented'],
    default: 'most-viewed',
  },
  category: {
    type: String,
    default: 'All',
  },
  country: {
    type: String,
    default: 'Worldwide',
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'year-end', 'yearly', 'all-time'],
    default: 'weekly',
  },
  dateRange: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10,
  },
}, { _id: true });

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
  proxyList: [{ type: String }],
  telegramBotToken: { type: String, default: '' },
  isEnabled: {
    type: Boolean,
    default: true,
  },
  playboardConfigs: [PlayboardConfigSchema],
}, { timestamps: true });

const PLAYBOARD_CATEGORIES = [
  'All', 'Pets & Animal', 'Music', 'Gaming', 'News & Politics',
  'People & Blogs', 'Travel & Event', 'Sports', 'Auto & Vehicles',
  'Comedy', 'Entertainment', 'Film & Animation', 'Howto & Style',
  'Education', 'Science & Technology'
];

const PLAYBOARD_COUNTRIES = [
  { code: 'go', name: 'Worldwide' },
  { code: 'vn', name: 'Viet Nam' },
  { code: 'jp', name: 'Japan' },
  { code: 'kr', name: 'South Korea' },
  { code: 'tw', name: 'Taiwan' },
  { code: 'us', name: 'United States' },
  { code: 'in', name: 'India' },
  { code: 'id', name: 'Indonesia' },
  { code: 'br', name: 'Brazil' },
  { code: 'ca', name: 'Canada' },
  { code: 'cn', name: 'China' },
  { code: 'de', name: 'Germany' },
  { code: 'hk', name: 'Hong Kong' },
  { code: 'pk', name: 'Pakistan' },
  { code: 'ph', name: 'Philippines' },
  { code: 'es', name: 'Spain' },
  { code: 'th', name: 'Thailand' },
  { code: 'gb', name: 'United Kingdom' },
];

const PLAYBOARD_DIMENSIONS = [
  { value: 'most-viewed', label: 'Most Viewed' },
  { value: 'most-liked', label: 'Most Liked' },
  { value: 'most-commented', label: 'Most Commented' }
];

const PLAYBOARD_PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'year-end', label: 'Year-End' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'all-time', label: 'All-time' }
];

const DEFAULT_PLAYBOARD_CONFIGS = [
  { dimension: 'most-viewed', category: 'All', country: 'Worldwide', period: 'weekly', isActive: true, priority: 10 },
  { dimension: 'most-viewed', category: 'Howto & Style', country: 'Viet Nam', period: 'weekly', isActive: true, priority: 8 },
  { dimension: 'most-viewed', category: 'Comedy', country: 'Viet Nam', period: 'weekly', isActive: true, priority: 7 },
  { dimension: 'most-viewed', category: 'Entertainment', country: 'Worldwide', period: 'weekly', isActive: true, priority: 6 },
];

TrendSettingSchema.statics.getOrCreateDefault = async function getOrCreateDefault() {
  const defaults = {
    key: 'default',
    keywords: {
      hai: ['hài', 'funny', 'comedy', 'skit'],
      dance: ['dance', 'nhảy', 'vũ đạo', 'choreography'],
      cooking: ['cooking', 'nấu ăn', 'recipe', 'món ngon'],
    },
    playboardConfigs: DEFAULT_PLAYBOARD_CONFIGS,
  };

  const setting = await this.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: defaults },
    { new: true, upsert: true }
  );

  return setting;
};

TrendSettingSchema.statics.getPlayboardMetadata = function getPlayboardMetadata() {
  return {
    categories: PLAYBOARD_CATEGORIES,
    countries: PLAYBOARD_COUNTRIES,
    dimensions: PLAYBOARD_DIMENSIONS,
    periods: PLAYBOARD_PERIODS,
  };
};

const TrendSetting = mongoose.models.TrendSetting || mongoose.model('TrendSetting', TrendSettingSchema);

export default TrendSetting;
