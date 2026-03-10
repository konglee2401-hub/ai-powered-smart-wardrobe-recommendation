import TrendSetting from '../models/TrendSetting.js';
import DEFAULT_SCORING_CONFIG from '../constants/videoScriptScoring.js';

const CACHE_TTL_MS = 60 * 1000;
let cachedConfig = null;
let cachedAt = 0;

function mergeScoringConfig(dbConfig = {}) {
  return {
    ...DEFAULT_SCORING_CONFIG,
    ...dbConfig,
    weights: { ...DEFAULT_SCORING_CONFIG.weights, ...(dbConfig.weights || {}) },
    boosts: Array.isArray(dbConfig.boosts) ? dbConfig.boosts : DEFAULT_SCORING_CONFIG.boosts,
  };
}

export async function getVideoScriptScoringConfig() {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }

  const setting = await TrendSetting.getOrCreateDefault();
  const dbConfig = setting?.videoScriptScoringConfig || null;
  cachedConfig = mergeScoringConfig(dbConfig || {});
  cachedAt = now;
  return cachedConfig;
}

export default {
  getVideoScriptScoringConfig,
};
