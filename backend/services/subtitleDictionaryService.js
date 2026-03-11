/**
 * Subtitle Dictionary Service
 *
 * Manages context-aware subtitle text based on:
 * - Template type (reaction, highlight, grid, meme, etc.)
 * - Content theme (funny-animal, product, motivation, fitness, etc.)
 * - Video source (dailyhaha, playboard, youtube, douyin, etc.)
 *
 * Replaces hardcoded fallback texts with intelligent selection
 */

const SUBTITLE_DICTIONARY = {
  // ========== REACTION TEMPLATE ==========
  // Used for reaction videos - focus on emotional response
  reaction: {
    'funny-animal': [
      '😂 TOO FUNNY',
      '🤣 CAN\'T STOP LAUGHING',
      '😆 HILARIOUS',
      '💀 I\'M DEAD',
      '🤪 LOST IT',
      '😹 BRO WHAT',
      '🃏 COMEDY GOLD',
      '😂 THAT KILLED ME',
    ],
    general: [
      '😮 NO WAY',
      '🤔 WAIT WHAT',
      '😲 THAT\'S INSANE',
      '🔥 FIRE',
      '✨ AMAZING',
      '🤯 MIND BLOWN',
      '😱 SHOCKED',
      '👀 MUST WATCH',
    ],
    motivation: [
      '💪 LET\'S GO',
      '🚀 INSPIRING',
      '🎯 GOALS',
      '✨ POWERFUL',
      '🙌 YES YES YES',
      '💯 ABSOLUTE',
      '🔥 MOTIVATION',
      '⚡ FIRED UP',
    ],
    fitness: [
      '💪 GAINS',
      '🏋️ GET FIT',
      '⚡ WORKOUTS',
      '🔥 BURN THOSE CALORIES',
      '💯 PUSH IT',
      '🚀 BEAST MODE',
      '🏆 NO PAIN NO GAIN',
      '💯 GRIND',
    ],
    product: [
      '🎁 COOL PRODUCT',
      '✨ QUALITY',
      '👍 NICE',
      '🔥 GENIUS INVENTION',
      '😍 I NEED THIS',
      '💯 RECOMMEND',
      '🌟 UPGRADE',
      '📱 TECH',
    ],
  },

  // ========== HIGHLIGHT TEMPLATE ==========
  // Used for highlight videos - focus on key moments
  highlight: {
    'funny-animal': [
      '😂 WATCH THIS',
      '🤣 BEST PART',
      'INSTANT REPLAY',
      '🎬 KEY MOMENT',
      '👀 HERE WE GO',
      '⚡ THE MOMENT',
      '🎯 THERE IT IS',
      '💥 PEAK PERFORMANCE',
    ],
    general: [
      '🎬 HIGHLIGHT',
      '⭐ BEST BIT',
      '🔥 MOMENT',
      '👀 FOCUS HERE',
      'KEY FOOTAGE',
      '📹 ESSENTIAL',
      '✨ SHOWCASE',
      '🎯 CRUCIAL',
    ],
    motivation: [
      '💡 KEY LESSON',
      '🎯 TAKEAWAY',
      '✨ MOST IMPORTANT',
      '💪 ESSENTIAL MOMENT',
      '🚀 BREAKTHROUGH',
      '🏆 HIGHLIGHT',
      '📌 PIN THIS',
      '⭐ REMEMBER THIS',
    ],
    fitness: [
      '💪 PERFECT FORM',
      '🎯 WATCH TECHNIQUE',
      '⚡ FORM CHECK',
      '🏋️ PROPER METHOD',
      '📊 RESULTS',
      '🔥 PEAK MOMENT',
      '📈 PROGRESS',
      '🏆 NEW PB',
    ],
    product: [
      '🎁 KEY FEATURE',
      '🔍 LOOK CLOSELY',
      '✨ QUALITY CHECK',
      '⭐ BEST PART',
      '💡 INNOVATION',
      '🎯 STANDOUT',
      '✅ DIFFERENCE',
      '📌 REMEMBER THIS',
    ],
  },

  // ========== GRID TEMPLATE ==========
  // Used for multi-camera/grid layouts
  grid: {
    'funny-animal': [
      '😂 MULTI VIEW',
      '📺 ALL ANGLES',
      '🎬 FULL VIEW',
      '👀 CHECK ALL',
      '🎞️ EVERY SIDE',
      '360 REACTION',
      '📹 COMPLETE',
      '🤣 EVERYWHERE',
    ],
    general: [
      '📺 FULL COVERAGE',
      '📹 ALL SIDES',
      '🎬 COMPLETE VIEW',
      '👀 EVERYWHERE',
      'MULTI ANGLE',
      '📊 FULL PICTURE',
      '🎯 TOTAL VIEW',
      '✨ COMPLETE',
    ],
    motivation: [
      '👥 TOGETHER',
      '🤝 COLLECTIVE',
      '📊 FULL SCOPE',
      '🎯 BIG PICTURE',
      '🌟 COMPLETE',
      '💪 ALL IN',
      '✨ UNIFIED',
      '🚀 WHOLE TEAM',
    ],
    fitness: [
      '👥 GROUP TRAINING',
      '🏋️ TEAM EFFORT',
      '💪 EVERYONE',
      '🤝 TOGETHER',
      '⚡ FULL GROUP',
      '🎯 ALL MEMBERS',
      '📊 COMPLETE CLASS',
      '🔥 TEAM GRIND',
    ],
    product: [
      '📺 FULL VIEW',
      '🔍 ALL DETAILS',
      '📊 COMPLETE SPECS',
      '✨ EVERYTHING',
      '👀 ALL ANGLES',
      '📹 360 VIEW',
      '🎯 ENTIRE SETUP',
      '💡 FULL PICTURE',
    ],
  },

  // ========== MEME TEMPLATE ==========
  // Used for meme/joke overlays
  meme: {
    'funny-animal': [
      '🤣 MEME ME',
      '😂 MEME ENERGY',
      'MEME LORD',
      '🎭 JOKES',
      '😹 SO RELATABLE',
      '💀 MOOD',
      '🃏 COMEDY MOMENT',
      '😆 CAPTURED IT',
    ],
    general: [
      '🎭 COMEDY',
      '🤣 MEME',
      '😂 RELATABLE',
      '💀 MOOD AF',
      '🃏 CAPTURED',
      '😆 PERFECT TIMING',
      '👀 TOO REAL',
      '🎯 EXACTLY',
    ],
    motivation: [
      '💪 MOTIVATIONAL MEME',
      '🎯 TRUTH',
      '✨ REAL TALK',
      '📌 PREACH',
      '🔥 FACTS',
      '💯 ACCURATE',
      '👀 THAT\'S IT',
      '🙌 WORD',
    ],
    fitness: [
      '💪 GYM LIFE',
      '🏋️ GAINS MEME',
      '⚡ FITNESS TRUTH',
      '🤣 GYM JOKES',
      '💀 MOOD BOARD',
      '🙌 REAL AF',
      '🔥 FACTS',
      '😂 SO ME',
    ],
    product: [
      '🎁 PERFECT MEME',
      '😂 RELATABLE',
      '✨ ON BRAND',
      '🔥 SO TRUE',
      '💯 ACCURATE',
      '👀 MOOD',
      '🎯 EXACTLY RIGHT',
      '🤣 EXACTLY',
    ],
  },

  // ========== SHORTS TEMPLATE ==========
  // Used for short-form videos (TikTok, Reels style)
  shorts: {
    'funny-animal': [
      '😂 SHORT VERSION',
      '⚡ QUICK LAUGH',
      '🤣 IN A NUTSHELL',
      '✨ SHORT & SWEET',
      '15 SECONDS OF',
      '⏱️ INSTANT',
      '💥 BOOM',
      '👀 WATCH TILL END',
    ],
    general: [
      '⚡ SHORT VERSION',
      '✨ QUICK HIT',
      '👍 SNACK SIZE',
      '⏱️ INSTANT CLASSIC',
      '15 SECONDS',
      '💥 BAM',
      '🎯 GET TO POINT',
      '👀 FULL VERSION LINK',
    ],
    motivation: [
      '⚡ QUICK MOTIVATION',
      '✨ MOTIVATION DOSE',
      '💪 QUICK FIX',
      '🚀 BOOST NOW',
      '⏱️ INSTANT ENERGY',
      '💯 RAPID FIRE',
      '🔥 POWER MINUTE',
      '🎯 KEY POINT',
    ],
    fitness: [
      '💪 QUICK WORKOUT',
      '⚡ EXPRESS SESSION',
      '🏋️ FAST ROUTINE',
      '⏱️ 60 SECOND',
      '🔥 QUICK BURN',
      '💯 EFFICIENT',
      '🚀 GET MOVING',
      '⚡ LETS GO',
    ],
    product: [
      '✨ QUICK DEMO',
      '👀 IN 15 SECONDS',
      '⚡ INSTANT REVIEW',
      '🎁 QUICK LOOK',
      '💡 FEATURES',
      '🎯 KEY POINTS',
      '📱 BRIEF OVERVIEW',
      '👍 BEST PART',
    ],
  },

  // ========== CINEMATIC TEMPLATE ==========
  // Used for high-quality cinematic videos
  cinematic: {
    'funny-animal': [
      '🎬 CINEMA QUALITY',
      '📽️ FILM STYLE',
      '✨ CINEMATIC',
      '🎥 MOVIE MOMENT',
      '🌟 EPIC',
      '🎭 DRAMATIC',
      '📹 MASTERPIECE',
      '🎞️ PRODUCTION',
    ],
    general: [
      '🎬 CINEMATIC',
      '📽️ PRODUCTION VALUE',
      '✨ MOVIE QUALITY',
      '🎥 EPIC',
      '📹 PREMIUM',
      '🌟 STUNNING',
      '🎭 DRAMATIC',
      '🎞️ MASTERCLASS',
    ],
    motivation: [
      '🎬 POWERFUL',
      '✨ INSPIRING STORY',
      '📽️ EPIC JOURNEY',
      '🌟 TRANSFORMATION',
      '🎥 POWERFUL MOMENT',
      '💪 LEGEND STORY',
      '🎭 EMOTIONAL',
      '🎞️ MUST WATCH',
    ],
    fitness: [
      '🎬 TRANSFORMATION FILM',
      '📽️ JOURNEY',
      '💪 EPIC TRAINING',
      '🎥 BEFORE & AFTER',
      '✨ CINEMATIC GAINS',
      '🏆 CHAMPION STORY',
      '🎭 POWERFUL',
      '📹 DOCUMENTARY',
    ],
    product: [
      '🎬 CINEMATIC REVIEW',
      '📽️ PREMIUM QUALITY',
      '✨ HIGH END',
      '🎥 SHOWCASE',
      '📹 PROFESSIONAL',
      '🎞️ DETAILED LOOK',
      '🌟 LUXURY FEEL',
      '👑 PREMIUM',
    ],
  },

  // ========== MARKETING TEMPLATE ==========
  // Explicitly for product/affiliate focused content
  marketing: {
    product: [
      '🛍️ GET YOURS NOW',
      '💝 LIMITED OFFER',
      '⚡ BEST DEAL',
      '🎁 EXCLUSIVE',
      '✨ MUST HAVE',
      '🔥 HOT DEAL',
      '👍 HIGHLY RECOMMEND',
      '💯 WORTH IT',
      '🏆 TOP CHOICE',
      '📱 LINK IN BIO',
    ],
    luxury: [
      '👑 PREMIUM QUALITY',
      '✨ LUXE PICK',
      '💎 HIGH END',
      '🌟 EXCLUSIVE',
      '🛍️ INVESTMENT',
      '💰 WORTH EVERY PENNY',
      '🎁 GIFT WORTHY',
      '✅ QUALITY CHECK',
      '🏆 LUXURY LIFESTYLE',
      '📌 SAVE THIS',
    ],
    health: [
      '💚 HEALTH FIRST',
      '✨ QUALITY INGREDIENTS',
      '🌿 NATURAL',
      '💪 WELLNESS',
      '⚡ ENERGY BOOST',
      '✅ CERTIFIED',
      '🏆 BEST CHOICE',
      '❤️ SELF CARE',
      '🔬 SCIENCE BACKED',
      '📌 FOR YOUR HEALTH',
    ],
    fitness: [
      '💪 TRAIN SMARTER',
      '🏋️ ESSENTIAL GEAR',
      '⚡ PERFORMANCE',
      '🔥 NEXT LEVEL',
      '👍 ATHLETES CHOICE',
      '🏆 PROVEN',
      '✨ UPGRADE YOUR GAME',
      '💯 TRANSFORMATION',
      '📈 RESULTS',
      '🎯 GET YOURS',
    ],
  },
};

/**
 * Get appropriate subtitle texts based on template and theme
 * Supports both hardcoded defaults and database-configured dictionaries
 * @param {string} templateName - Template type (reaction, highlight, grid, etc.)
 * @param {string} theme - Content theme (funny-animal, product, motivation, etc.)
 * @param {object} customDictionary - Optional custom dictionary from DB config
 * @returns {array} Array of subtitle options
 */
function getSubtitleOptions(templateName = 'reaction', theme = 'general', customDictionary = null) {
  // Use custom dictionary if provided (from DB), otherwise use defaults
  const dict = customDictionary || SUBTITLE_DICTIONARY;
  const templates = dict[templateName] || dict.reaction || SUBTITLE_DICTIONARY.reaction;
  const subtitles = templates[theme] || templates.general || [];
  return subtitles.length > 0 ? subtitles : (SUBTITLE_DICTIONARY.reaction.general || []);
}

/**
 * Select random subtitle from appropriate pool
 */
function selectRandomSubtitle(templateName, theme, customDictionary = null) {
  const options = getSubtitleOptions(templateName, theme, customDictionary);
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get fallback subtitles for a segment duration using intelligent selection
 * @param {number} duration - Total duration in seconds
 * @param {string} templateName - Template type
 * @param {string} theme - Content theme
 * @param {object} customDictionary - Optional custom dictionary from DB config
 * @returns {array} Array of subtitle segments
 */
function generateFallbackSubtitles(duration = 30, templateName = 'reaction', theme = 'general', customDictionary = null) {
  const segmentCount = Math.max(3, Math.ceil(duration / 5));
  const segmentDuration = duration / segmentCount;
  const options = getSubtitleOptions(templateName, theme, customDictionary);

  return Array.from({ length: segmentCount }).map((_, idx) => ({
    index: idx + 1,
    startTime: Math.floor(idx * segmentDuration),
    endTime: Math.floor((idx + 1) * segmentDuration),
    text: options[idx % options.length],
    duration: segmentDuration,
    isAffiliateTerm: /discount|deal|link|shop|offer|buy|sale|price|yours/i.test(options[idx % options.length]),
    isCallout: /!/i.test(options[idx % options.length]),
  }));
}

/**
 * Get all available themes for a template
 */
function getAvailableThemes(templateName = 'reaction') {
  const templates = SUBTITLE_DICTIONARY[templateName] || SUBTITLE_DICTIONARY.reaction;
  return Object.keys(templates);
}

/**
 * Get all available templates
 */
function getAvailableTemplates() {
  return Object.keys(SUBTITLE_DICTIONARY);
}

export default {
  SUBTITLE_DICTIONARY,
  getSubtitleOptions,
  selectRandomSubtitle,
  generateFallbackSubtitles,
  getAvailableThemes,
  getAvailableTemplates,
};
