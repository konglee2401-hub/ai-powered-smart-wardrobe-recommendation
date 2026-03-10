import mongoose from 'mongoose';

const TemplateLibrarySchema = new mongoose.Schema({
  favorites: [{ type: String }],
  pinned: [{ type: String }],
  recent: [{ type: String }],
}, { _id: false });

const SubVideoLibrarySourceSchema = new mongoose.Schema({
  key: { type: String, default: '' },
  name: { type: String, default: '' },
  sourceType: { type: String, default: 'public-drive-folder' },
  url: { type: String, default: '' },
  folderId: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  maxDepth: { type: Number, default: 3 },
  visibility: { type: String, default: 'public-web' },
  themeHints: [{ type: String }],
  recommendedTemplateGroups: [{ type: String }],
  notes: { type: String, default: '' },
}, { _id: false });

const TemplateBrowserPreferencesSchema = new mongoose.Schema({
  search: { type: String, default: '' },
  groupKey: { type: String, default: 'all' },
  showOnlySuggested: { type: Boolean, default: false },
  suggestionLimit: { type: Number, default: 6 },
}, { _id: false });

const ComposerDefaultsSchema = new mongoose.Schema({
  recipe: { type: String, default: 'mashup' },
  platform: { type: String, default: 'youtube' },
  duration: { type: Number, default: 30 },
  aspectRatio: { type: String, default: '9:16' },
  layout: { type: String, default: '2-3-1-3' },
  templateName: { type: String, default: 'reaction' },
  templateStrategy: { type: String, default: 'weighted' },
  quality: { type: String, default: 'high' },
  audioSource: { type: String, default: 'main' },
  subtitleMode: { type: String, default: 'auto' },
  backgroundAudioVolume: { type: Number, default: 0.18 },
  youtubePublishType: { type: String, default: 'shorts' },
  watermarkEnabled: { type: Boolean, default: true },
  voiceoverEnabled: { type: Boolean, default: false },
  highlightEnabled: { type: Boolean, default: false },
  highlightSource: { type: String, default: 'sub' },
  highlightClipDuration: { type: Number, default: 6 },
  highlightMaxHighlights: { type: Number, default: 3 },
  clipExtractionEnabled: { type: Boolean, default: false },
  clipSegmentDuration: { type: Number, default: 20 },
  clipMaxClips: { type: Number, default: 24 },
}, { _id: false });

const VideoPipelinePreferencesSchema = new mongoose.Schema({
  production: {
    templateLibrary: {
      type: TemplateLibrarySchema,
      default: () => ({ favorites: [], pinned: [], recent: [] }),
    },
    subVideoLibrarySources: {
      type: [SubVideoLibrarySourceSchema],
      default: () => ([{
        key: 'public-video-reels',
        name: 'Public Video Reels Library',
        sourceType: 'public-drive-folder',
        url: 'https://drive.google.com/drive/folders/1PlCs1HxhzulF8tzO80wiJSVM2fzAhI7A',
        folderId: '1PlCs1HxhzulF8tzO80wiJSVM2fzAhI7A',
        enabled: true,
        isDefault: true,
        maxDepth: 3,
        visibility: 'public-web',
        themeHints: ['motivation', 'luxury', 'motherhood', 'health', 'funny-animal', 'product'],
        recommendedTemplateGroups: ['shorts', 'highlight', 'reaction', 'cinematic', 'marketing', 'viral'],
        notes: 'Default public sub-video library source for mashup and shorts automation.',
      }]),
    },
    composerDefaults: {
      type: ComposerDefaultsSchema,
      default: () => ({
        recipe: 'mashup',
        platform: 'youtube',
        duration: 30,
        aspectRatio: '9:16',
        layout: '2-3-1-3',
        templateName: 'reaction',
        templateStrategy: 'weighted',
        quality: 'high',
        audioSource: 'main',
        subtitleMode: 'auto',
        backgroundAudioVolume: 0.18,
        youtubePublishType: 'shorts',
        watermarkEnabled: true,
        voiceoverEnabled: false,
        highlightEnabled: false,
        highlightSource: 'sub',
        highlightClipDuration: 6,
        highlightMaxHighlights: 3,
        clipExtractionEnabled: false,
        clipSegmentDuration: 20,
        clipMaxClips: 24,
      }),
    },
    templateBrowserPreferences: {
      type: TemplateBrowserPreferencesSchema,
      default: () => ({
        search: '',
        groupKey: 'all',
        showOnlySuggested: false,
        suggestionLimit: 6,
      }),
    },
  },
}, { _id: false });

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
  videoScriptScoringConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
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
  videoPipelinePreferences: {
    type: VideoPipelinePreferencesSchema,
    default: () => ({ production: { templateLibrary: { favorites: [], pinned: [], recent: [] }, subVideoLibrarySources: [{ key: 'public-video-reels', name: 'Public Video Reels Library', sourceType: 'public-drive-folder', url: 'https://drive.google.com/drive/folders/1PlCs1HxhzulF8tzO80wiJSVM2fzAhI7A', folderId: '1PlCs1HxhzulF8tzO80wiJSVM2fzAhI7A', enabled: true, isDefault: true, maxDepth: 3, visibility: 'public-web', themeHints: ['motivation', 'luxury', 'motherhood', 'health', 'funny-animal', 'product'], recommendedTemplateGroups: ['shorts', 'highlight', 'reaction', 'cinematic', 'marketing', 'viral'], notes: 'Default public sub-video library source for mashup and shorts automation.' }] } }),
  },
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
    videoScriptScoringConfig: null,
    keywords: {
      hai: ['hài', 'funny', 'comedy', 'skit'],
      dance: ['dance', 'nhảy', 'vũ đạo', 'choreography'],
      cooking: ['cooking', 'nấu ăn', 'recipe', 'món ngon'],
    },
    playboardConfigs: DEFAULT_PLAYBOARD_CONFIGS,
    videoPipelinePreferences: { production: { templateLibrary: { favorites: [], pinned: [], recent: [] }, composerDefaults: { recipe: 'mashup', platform: 'youtube', duration: 30, aspectRatio: '9:16', layout: '2-3-1-3', templateName: 'reaction', templateStrategy: 'weighted', quality: 'high', audioSource: 'main', subtitleMode: 'auto', backgroundAudioVolume: 0.18, youtubePublishType: 'shorts', watermarkEnabled: true, voiceoverEnabled: false, highlightEnabled: false, highlightSource: 'sub', highlightClipDuration: 6, highlightMaxHighlights: 3, clipExtractionEnabled: false, clipSegmentDuration: 20, clipMaxClips: 24 }, templateBrowserPreferences: { search: '', groupKey: 'all', showOnlySuggested: false, suggestionLimit: 6 } } },
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
