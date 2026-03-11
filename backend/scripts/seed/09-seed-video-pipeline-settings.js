import dotenv from 'dotenv';
import connectDB from '../../config/db.js';
import TrendSetting from '../../models/TrendSetting.js';
import QueueScannerSettings from '../../models/QueueScannerSettings.js';
import DEFAULT_SCORING_CONFIG from '../../constants/videoScriptScoring.js';
import subtitleDictionaryService from '../../services/subtitleDictionaryService.js';

dotenv.config();

const SEEDED_COMPOSER_DEFAULTS = {
  recipe: 'mashup',
  platform: 'youtube',
  duration: 30,
  aspectRatio: '9:16',
  layout: '2-3-1-3',
  templateName: 'reaction-pip',
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
  clipExtractionEnabled: true,
  clipSegmentDuration: 20,
  clipMaxClips: 24,
};

const SEEDED_TEMPLATE_BROWSER_PREFERENCES = {
  search: '',
  groupKey: 'reaction',
  showOnlySuggested: false,
  suggestionLimit: 6,
};

const SEEDED_SUB_VIDEO_LIBRARY_SOURCE = {
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
};

const SEEDED_QUEUE_SETTINGS = {
  key: 'default',
  enabled: false,
  intervalMinutes: 60,
  scheduleMode: 'manual',
  everyHours: 1,
  dailyTime: '09:00',
  scheduleLabel: 'Manual only',
  autoPublish: false,
  platform: 'youtube',
  youtubePublishType: 'shorts',
};

function hasEntries(library = {}) {
  return Boolean(library?.favorites?.length || library?.pinned?.length || library?.recent?.length);
}

function mergeSubVideoLibrarySources(existingSources = []) {
  const items = Array.isArray(existingSources) ? existingSources : [];
  const withoutSeed = items.filter((item) => String(item?.key || item?.folderId || '') !== SEEDED_SUB_VIDEO_LIBRARY_SOURCE.key && String(item?.folderId || '') !== SEEDED_SUB_VIDEO_LIBRARY_SOURCE.folderId);
  const nextSources = [SEEDED_SUB_VIDEO_LIBRARY_SOURCE, ...withoutSeed.map((item) => ({ ...item, isDefault: false }))];
  return nextSources;
}

async function run() {
  await connectDB();

  const trendSetting = await TrendSetting.getOrCreateDefault();
  const existingPreferences = trendSetting.videoPipelinePreferences?.toObject
    ? trendSetting.videoPipelinePreferences.toObject()
    : trendSetting.videoPipelinePreferences || {};
  const existingProduction = existingPreferences.production || {};
  const existingTemplateLibrary = existingProduction.templateLibrary || { favorites: [], pinned: [], recent: [] };
  const existingSubVideoLibrarySources = existingProduction.subVideoLibrarySources || [];

  trendSetting.videoPipelinePreferences = {
    ...existingPreferences,
    production: {
      ...existingProduction,
      templateLibrary: hasEntries(existingTemplateLibrary)
        ? existingTemplateLibrary
        : { favorites: [], pinned: [], recent: [] },
      subVideoLibrarySources: mergeSubVideoLibrarySources(existingSubVideoLibrarySources),
      subtitleDictionary: subtitleDictionaryService.SUBTITLE_DICTIONARY,
      composerDefaults: SEEDED_COMPOSER_DEFAULTS,
      templateBrowserPreferences: SEEDED_TEMPLATE_BROWSER_PREFERENCES,
    },
  };
  if (!trendSetting.videoScriptScoringConfig) {
    trendSetting.videoScriptScoringConfig = DEFAULT_SCORING_CONFIG;
  }
  await trendSetting.save();

  const queueSettings = await QueueScannerSettings.findOneAndUpdate(
    { key: 'default' },
    SEEDED_QUEUE_SETTINGS,
    { upsert: true, new: true }
  );

  console.log('[video-pipeline-settings] seeded composer defaults and production settings');
  console.log(JSON.stringify({
    templateLibrary: trendSetting.videoPipelinePreferences?.production?.templateLibrary,
    subVideoLibrarySources: trendSetting.videoPipelinePreferences?.production?.subVideoLibrarySources,
    subtitleDictionary: {
      templates: Object.keys(trendSetting.videoPipelinePreferences?.production?.subtitleDictionary || {}),
      totalVariants: Object.values(trendSetting.videoPipelinePreferences?.production?.subtitleDictionary || {})
        .reduce((sum, templates) => sum + Object.values(templates).reduce((s, themes) => s + themes.length, 0), 0),
    },
    composerDefaults: trendSetting.videoPipelinePreferences?.production?.composerDefaults,
    templateBrowserPreferences: trendSetting.videoPipelinePreferences?.production?.templateBrowserPreferences,
    scheduler: {
      enabled: queueSettings.enabled,
      scheduleMode: queueSettings.scheduleMode,
      platform: queueSettings.platform,
      youtubePublishType: queueSettings.youtubePublishType,
    },
    videoScriptScoringConfig: trendSetting.videoScriptScoringConfig
  }, null, 2));

  process.exit(0);
}

run().catch((error) => {
  console.error('[video-pipeline-settings] seed failed:', error);
  process.exit(1);
});
