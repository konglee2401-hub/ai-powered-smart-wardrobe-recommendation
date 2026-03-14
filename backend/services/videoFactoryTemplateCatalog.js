const BASE_ENGINE_TEMPLATES = {
  reaction: {
    name: 'reaction',
    type: 'reaction',
    layout: 'split',
    description: '2/3 main video + 1/3 reaction/sub video on the right side.',
    canvas: {
      safeMargin: 32,
      subtitleMarginBottom: 180,
    },
    split: {
      mainRatio: 0.67,
      direction: 'horizontal',
    },
    overlay: {
      enabled: false,
    },
    managedBy: 'video-factory',
  },
  highlight: {
    name: 'highlight',
    type: 'highlight',
    layout: 'pip',
    description: 'Main video full canvas with highlight reaction overlay.',
    canvas: {
      safeMargin: 36,
      subtitleMarginBottom: 180,
    },
    overlay: {
      enabled: true,
      widthRatio: 0.28,
      heightRatio: 0.28,
      position: 'top-right',
    },
    managedBy: 'video-factory',
  },
  meme: {
    name: 'meme',
    type: 'meme',
    layout: 'pip',
    description: 'Reaction layout with meme overlay window support.',
    canvas: {
      safeMargin: 36,
      subtitleMarginBottom: 210,
    },
    overlay: {
      enabled: true,
      widthRatio: 0.26,
      heightRatio: 0.26,
      position: 'bottom-right',
    },
    meme: {
      enabled: true,
      width: 220,
      height: 220,
      position: 'top-left',
      startTime: 4,
      endTime: 6,
    },
    managedBy: 'video-factory',
  },
  tiktok: {
    name: 'tiktok',
    type: 'tiktok',
    layout: 'vertical-focus',
    description: 'Blurred vertical canvas with centered foreground and optional reaction bubble.',
    canvas: {
      safeMargin: 36,
      subtitleMarginBottom: 220,
    },
    overlay: {
      enabled: true,
      widthRatio: 0.24,
      heightRatio: 0.24,
      position: 'bottom-right',
    },
    background: {
      blur: 28,
    },
    managedBy: 'video-factory',
  },
  grid: {
    name: 'grid',
    type: 'grid',
    layout: 'grid',
    description: '2x2 reaction grid for four clips.',
    canvas: {
      safeMargin: 24,
      subtitleMarginBottom: 120,
    },
    managedBy: 'video-factory',
  },
  'grid-2': {
    name: 'grid-2',
    type: 'grid',
    layout: 'split',
    description: 'Two-up grid with 2/3 main video and 1/3 sub video.',
    canvas: {
      safeMargin: 32,
      subtitleMarginBottom: 180,
    },
    split: {
      mainRatio: 0.67,
      direction: 'horizontal',
    },
    overlay: {
      enabled: false,
    },
    managedBy: 'video-factory',
  },
};

const GROUPS = {
  featured: {
    label: 'Featured Templates',
    useCases: ['viral', 'highlight', 'youtube entertainment'],
    engineTemplate: 'highlight',
  },
  reaction: {
    label: 'Reaction Templates',
    useCases: ['reaction', 'duet', 'commentary'],
    engineTemplate: 'reaction',
  },
  highlight: {
    label: 'Highlight Templates',
    useCases: ['highlight', 'sports', 'moments'],
    engineTemplate: 'highlight',
  },
  meme: {
    label: 'Meme Templates',
    useCases: ['meme', 'viral remix', 'humor'],
    engineTemplate: 'meme',
  },
  shorts: {
    label: 'Shorts Templates',
    useCases: ['shorts', 'reels', 'vertical video'],
    engineTemplate: 'tiktok',
  },
  educational: {
    label: 'Educational Templates',
    useCases: ['education', 'tutorial', 'explainer'],
    engineTemplate: 'highlight',
  },
  podcast: {
    label: 'Podcast Templates',
    useCases: ['podcast', 'interview', 'talk show'],
    engineTemplate: 'reaction',
  },
  gaming: {
    label: 'Gaming Templates',
    useCases: ['gaming', 'stream clip', 'highlight'],
    engineTemplate: 'highlight',
  },
  cinematic: {
    label: 'Cinematic Templates',
    useCases: ['cinematic', 'teaser', 'storytelling'],
    engineTemplate: 'highlight',
  },
  marketing: {
    label: 'Marketing Templates',
    useCases: ['marketing', 'product', 'promotion'],
    engineTemplate: 'highlight',
  },
  viral: {
    label: 'Viral Formats',
    useCases: ['viral', 'countdown', 'hook'],
    engineTemplate: 'highlight',
  },
};

function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeTemplate(groupKey, row) {
  const group = GROUPS[groupKey];
  const code = `T${String(row.id).padStart(3, '0')}`;
  const slug = `${String(row.id).padStart(3, '0')}-${slugify(row.name)}`;

  return {
    id: row.id,
    code,
    slug,
    fileName: `${slug}.json`,
    name: row.name,
    groupKey,
    group: group.label,
    purpose: row.purpose || `${row.name} automation preset for ${group.label.toLowerCase()}.`,
    useCases: row.useCases || group.useCases,
    layoutNotes: row.layoutNotes || [],
    timingNotes: row.timingNotes || [],
    effects: row.effects || [],
    ffmpegCoreFilter: row.ffmpegCoreFilter || '',
    engineTemplate: row.engineTemplate || group.engineTemplate,
    canvas: row.canvas || {},
    split: row.split || {},
    overlay: row.overlay || {},
    meme: row.meme || {},
    background: row.background || {},
    tags: row.tags || [],
  };
}

const TEMPLATE_DEFINITIONS = [
  makeTemplate('featured', {
    id: 1,
    name: 'MrBeast Mashup Style',
    purpose: 'Fast viral entertainment edit with zoom punches, text pops, and timed meme inserts.',
    useCases: ['video viral', 'highlight', 'youtube entertainment'],
    layoutNotes: ['Main clip', 'zoom punch', 'text pop', 'meme insert'],
    timingNotes: ['Quick cut rhythm', 'Meme burst around 4s-6s'],
    effects: ['zoom punch', 'meme insert', 'quick cuts'],
    ffmpegCoreFilter: "[0:v]scale=1280:720,zoompan=z='if(lte(zoom,1.0),1.1,zoom)':d=1[v0];[1:v]scale=200:-1[v1];[v0][v1]overlay=10:10:enable='between(t,4,6)'",
    engineTemplate: 'meme',
    meme: { enabled: true, width: 200, height: 200, position: 'top-left', startTime: 4, endTime: 6 },
    overlay: { enabled: false },
    tags: ['mrbeast', 'viral', 'fast-cut'],
  }),
  makeTemplate('featured', {
    id: 2,
    name: 'TikTok Mashup Style',
    purpose: 'Vertical short-form preset with blur background, centered foreground, and caption-friendly safe zones.',
    useCases: ['vertical video', 'shorts', 'reels'],
    layoutNotes: ['blur background', 'foreground vertical', 'auto caption'],
    timingNotes: ['Optimized for 9:16 delivery'],
    effects: ['box blur background', 'center crop'],
    ffmpegCoreFilter: '[0:v]split[bg][fg];[bg]scale=1080:1920,boxblur=20[bg2];[fg]scale=1080:-1[fg2];[bg2][fg2]overlay=(W-w)/2:(H-h)/2',
    engineTemplate: 'tiktok',
    background: { blur: 20 },
    tags: ['tiktok', 'shorts', 'vertical'],
  }),
  makeTemplate('reaction', { id: 3, name: 'Reaction PiP', layoutNotes: ['main video', 'facecam corner'], effects: ['pip overlay'], ffmpegCoreFilter: 'overlay=W-w-20:H-h-20', engineTemplate: 'highlight', overlay: { enabled: true, widthRatio: 0.26, heightRatio: 0.26, position: 'bottom-right' } }),
  makeTemplate('reaction', { id: 4, name: 'Reaction Split', layoutNotes: ['left video', 'right reaction'], effects: ['split screen'], ffmpegCoreFilter: 'hstack', engineTemplate: 'reaction' }),
  makeTemplate('reaction', { id: 5, name: 'Reaction Grid', layoutNotes: ['4 cameras', '2x2 grid'], effects: ['multi cam'], ffmpegCoreFilter: '[0:v][1:v]hstack[top];[2:v][3:v]hstack[bottom];[top][bottom]vstack', engineTemplate: 'grid' }),
  makeTemplate('reaction', { id: 6, name: 'Reaction Zoom', layoutNotes: ['main video', 'facecam zoom on speech'], timingNotes: ['Zoom grows during speaking moments'], effects: ['zoompan'], ffmpegCoreFilter: "zoompan=z='zoom+0.002'", engineTemplate: 'highlight' }),
  makeTemplate('reaction', { id: 7, name: 'Reaction Pop', layoutNotes: ['main video', 'reaction pop-in'], timingNotes: ['Overlay appears between 5s and 6s'], effects: ['timed overlay'], ffmpegCoreFilter: "overlay=enable='between(t,5,6)'", engineTemplate: 'highlight' }),
  makeTemplate('reaction', { id: 8, name: 'Reaction Slide', layoutNotes: ['main video', 'reaction slides in'], effects: ['slide in'], ffmpegCoreFilter: "overlay=x='t*300'", engineTemplate: 'highlight' }),
  makeTemplate('reaction', { id: 9, name: 'Reaction Meme Insert', layoutNotes: ['main video', 'reaction', 'meme burst'], timingNotes: ['Meme insert between 3s and 5s'], effects: ['meme insert'], ffmpegCoreFilter: "overlay=10:10:enable='between(t,3,5)'", engineTemplate: 'meme' }),
  makeTemplate('reaction', { id: 10, name: 'Reaction Dual', layoutNotes: ['main feed', 'reaction feed'], effects: ['dual layout'], ffmpegCoreFilter: 'hstack', engineTemplate: 'reaction' }),
  makeTemplate('reaction', { id: 11, name: 'Reaction Picture Chain', layoutNotes: ['main', 'cam1', 'cam2'], effects: ['stacked PiP'], ffmpegCoreFilter: '[0:v][1:v]overlay=W-w-20:H-h-20[tmp];[tmp][2:v]overlay=20:H-h-20', engineTemplate: 'highlight' }),
  makeTemplate('reaction', { id: 12, name: 'Reaction Highlight', layoutNotes: ['main video', 'reaction zoom on highlight'], effects: ['highlight zoom'], ffmpegCoreFilter: "zoompan=z='if(between(in_time,0,1.2),1.15,1.0)'", engineTemplate: 'highlight' }),
  makeTemplate('highlight', { id: 13, name: 'Basic Highlight', layoutNotes: ['trim segment'], effects: ['trim'], ffmpegCoreFilter: 'trim', engineTemplate: 'highlight' }),
  makeTemplate('highlight', { id: 14, name: 'Highlight Flash', layoutNotes: ['main highlight', 'flash transition'], effects: ['xfade'], ffmpegCoreFilter: 'xfade=transition=fade', engineTemplate: 'highlight' }),
  makeTemplate('highlight', { id: 15, name: 'Highlight Replay', layoutNotes: ['main highlight', 'instant replay'], effects: ['loop'], ffmpegCoreFilter: 'loop', engineTemplate: 'highlight' }),
  makeTemplate('highlight', { id: 16, name: 'Highlight Slow Motion', layoutNotes: ['main highlight', 'slow motion'], effects: ['slow motion'], ffmpegCoreFilter: 'setpts=2*PTS', engineTemplate: 'highlight' }),
  makeTemplate('highlight', { id: 17, name: 'Highlight Zoom', layoutNotes: ['main highlight', 'digital zoom'], effects: ['zoompan'], ffmpegCoreFilter: 'zoompan', engineTemplate: 'highlight' }),
  makeTemplate('highlight', { id: 18, name: 'Highlight Crop', layoutNotes: ['highlight crop'], effects: ['crop'], ffmpegCoreFilter: 'crop', engineTemplate: 'highlight' }),
  makeTemplate('highlight', { id: 19, name: 'Highlight Focus', layoutNotes: ['sharp subject', 'blurred background'], effects: ['boxblur background'], ffmpegCoreFilter: 'boxblur', engineTemplate: 'tiktok' }),
  makeTemplate('highlight', { id: 20, name: 'Highlight Multi', layoutNotes: ['multiple camera view'], effects: ['multi camera'], ffmpegCoreFilter: 'xstack', engineTemplate: 'grid' }),
  makeTemplate('highlight', { id: 21, name: 'Highlight Cutaway', layoutNotes: ['main highlight', 'insert cutaway clip'], effects: ['insert clip'], ffmpegCoreFilter: 'overlay', engineTemplate: 'reaction' }),
  makeTemplate('highlight', { id: 22, name: 'Highlight Counter', layoutNotes: ['main highlight', 'numeric counter'], effects: ['counter overlay'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('meme', { id: 23, name: 'Meme Pop', layoutNotes: ['main video', 'timed meme pop'], timingNotes: ['Use between() window for punchline'], effects: ['timed overlay'], ffmpegCoreFilter: "overlay=enable='between(t,4,6)'", engineTemplate: 'meme' }),
  makeTemplate('meme', { id: 24, name: 'Meme Slide', layoutNotes: ['main video', 'sliding meme'], effects: ['slide'], ffmpegCoreFilter: "overlay=x='t*200'", engineTemplate: 'meme' }),
  makeTemplate('meme', { id: 25, name: 'Meme Shake', layoutNotes: ['main video', 'shaking meme'], effects: ['rotate'], ffmpegCoreFilter: 'rotate', engineTemplate: 'meme' }),
  makeTemplate('meme', { id: 26, name: 'Meme Loop', layoutNotes: ['main video', 'looping meme asset'], effects: ['loop'], ffmpegCoreFilter: 'loop', engineTemplate: 'meme' }),
  makeTemplate('meme', { id: 27, name: 'Meme Reverse', layoutNotes: ['main video', 'reverse gag'], effects: ['reverse'], ffmpegCoreFilter: 'reverse', engineTemplate: 'meme' }),
  makeTemplate('meme', { id: 28, name: 'Meme Glitch', layoutNotes: ['main video', 'glitch meme'], effects: ['rgb shift'], ffmpegCoreFilter: 'rgbashift', engineTemplate: 'meme' }),
  makeTemplate('meme', { id: 29, name: 'Meme Sticker', layoutNotes: ['main video', 'PNG sticker overlay'], effects: ['png overlay'], ffmpegCoreFilter: 'overlay', engineTemplate: 'meme' }),
  makeTemplate('meme', { id: 30, name: 'Meme Caption', layoutNotes: ['main video', 'caption card'], effects: ['drawtext'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'meme' }),
  makeTemplate('meme', { id: 31, name: 'Meme Combo', layoutNotes: ['overlay', 'zoom'], effects: ['overlay', 'zoom'], ffmpegCoreFilter: 'overlay,zoompan', engineTemplate: 'meme' }),
  makeTemplate('meme', { id: 32, name: 'Meme Burst', layoutNotes: ['meme pop', 'flash accent'], effects: ['flash effect'], ffmpegCoreFilter: 'curves,overlay', engineTemplate: 'meme' }),
  makeTemplate('shorts', { id: 33, name: 'Shorts Hook', layoutNotes: ['hook clip first', 'vertical framing'], effects: ['hook lead'], ffmpegCoreFilter: 'trim,setpts', engineTemplate: 'tiktok' }),
  makeTemplate('shorts', { id: 34, name: 'Shorts Caption', layoutNotes: ['vertical video', 'caption overlay'], effects: ['drawtext'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'tiktok' }),
  makeTemplate('shorts', { id: 35, name: 'Shorts Zoom', layoutNotes: ['vertical video', 'dynamic zoom'], effects: ['zoompan'], ffmpegCoreFilter: 'zoompan', engineTemplate: 'tiktok' }),
  makeTemplate('shorts', { id: 36, name: 'Shorts Split', layoutNotes: ['two videos stacked'], effects: ['split'], ffmpegCoreFilter: 'hstack', engineTemplate: 'reaction' }),
  makeTemplate('shorts', { id: 37, name: 'Shorts Meme', layoutNotes: ['vertical base', 'meme insert'], effects: ['meme insert'], ffmpegCoreFilter: 'overlay', engineTemplate: 'meme' }),
  makeTemplate('shorts', { id: 38, name: 'Shorts Loop', layoutNotes: ['vertical ending loop'], effects: ['loop ending'], ffmpegCoreFilter: 'loop', engineTemplate: 'tiktok' }),
  makeTemplate('shorts', { id: 39, name: 'Shorts Story', layoutNotes: ['sequential clips'], effects: ['clip sequencing'], ffmpegCoreFilter: 'concat', engineTemplate: 'tiktok' }),
  makeTemplate('shorts', { id: 40, name: 'Shorts Reaction', layoutNotes: ['vertical main', 'facecam'], effects: ['facecam'], ffmpegCoreFilter: 'overlay=W-w-24:H-h-24', engineTemplate: 'highlight' }),
  makeTemplate('shorts', { id: 41, name: 'Shorts Slide', layoutNotes: ['vertical transition'], effects: ['slide transition'], ffmpegCoreFilter: 'xfade=transition=slideleft', engineTemplate: 'tiktok' }),
  makeTemplate('shorts', { id: 42, name: 'Shorts Overlay', layoutNotes: ['vertical base', 'graphics overlay'], effects: ['graphics overlay'], ffmpegCoreFilter: 'overlay', engineTemplate: 'tiktok' }),
  makeTemplate('educational', { id: 43, name: 'Slide Video', layoutNotes: ['main video', 'slide overlay'], effects: ['slide overlay'], ffmpegCoreFilter: 'overlay', engineTemplate: 'reaction' }),
  makeTemplate('educational', { id: 44, name: 'Diagram Overlay', layoutNotes: ['main video', 'diagram image'], effects: ['diagram overlay'], ffmpegCoreFilter: 'overlay', engineTemplate: 'highlight' }),
  makeTemplate('educational', { id: 45, name: 'Step Highlight', layoutNotes: ['step text callout'], effects: ['step text'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('educational', { id: 46, name: 'Annotation', layoutNotes: ['annotated region'], effects: ['drawbox'], ffmpegCoreFilter: 'drawbox', engineTemplate: 'highlight' }),
  makeTemplate('educational', { id: 47, name: 'Whiteboard', layoutNotes: ['whiteboard base', 'text overlay'], effects: ['whiteboard text'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('educational', { id: 48, name: 'Focus Box', layoutNotes: ['highlight region'], effects: ['focus box'], ffmpegCoreFilter: 'drawbox', engineTemplate: 'highlight' }),
  makeTemplate('educational', { id: 49, name: 'Picture in Picture', layoutNotes: ['instructor corner', 'demo main'], effects: ['PiP'], ffmpegCoreFilter: 'overlay=W-w-20:20', engineTemplate: 'highlight' }),
  makeTemplate('educational', { id: 50, name: 'Timeline', layoutNotes: ['video timeline', 'progress bar'], effects: ['progress bar'], ffmpegCoreFilter: 'drawbox', engineTemplate: 'highlight' }),
  makeTemplate('educational', { id: 51, name: 'Key Word', layoutNotes: ['keyword emphasis'], effects: ['keyword drawtext'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('educational', { id: 52, name: 'Demo Split', layoutNotes: ['split comparison'], effects: ['split screen'], ffmpegCoreFilter: 'hstack', engineTemplate: 'reaction' }),
  makeTemplate('podcast', { id: 53, name: 'Dual Cam', layoutNotes: ['host', 'guest'], effects: ['dual cam'], ffmpegCoreFilter: 'hstack', engineTemplate: 'reaction' }),
  makeTemplate('podcast', { id: 54, name: 'Quad Cam', layoutNotes: ['four camera grid'], effects: ['quad cam'], ffmpegCoreFilter: 'xstack', engineTemplate: 'grid' }),
  makeTemplate('podcast', { id: 55, name: 'Speaker Zoom', layoutNotes: ['zoom active speaker'], effects: ['speaker zoom'], ffmpegCoreFilter: 'zoompan', engineTemplate: 'highlight' }),
  makeTemplate('podcast', { id: 56, name: 'Quote Highlight', layoutNotes: ['quote card'], effects: ['quote text'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('podcast', { id: 57, name: 'Caption Bar', layoutNotes: ['lower third caption bar'], effects: ['caption bar'], ffmpegCoreFilter: 'drawbox,drawtext', engineTemplate: 'highlight' }),
  makeTemplate('podcast', { id: 58, name: 'Audio Wave', layoutNotes: ['audio waveform'], effects: ['showwaves'], ffmpegCoreFilter: 'showwaves', engineTemplate: 'highlight' }),
  makeTemplate('podcast', { id: 59, name: 'Clip Highlight', layoutNotes: ['quote clip highlight'], effects: ['highlight trim'], ffmpegCoreFilter: 'trim', engineTemplate: 'highlight' }),
  makeTemplate('podcast', { id: 60, name: 'Guest Focus', layoutNotes: ['guest focus crop'], effects: ['guest focus'], ffmpegCoreFilter: 'crop', engineTemplate: 'highlight' }),
  makeTemplate('podcast', { id: 61, name: 'Reaction Cut', layoutNotes: ['cut between speaker and reaction'], effects: ['reaction cut'], ffmpegCoreFilter: 'concat', engineTemplate: 'reaction' }),
  makeTemplate('podcast', { id: 62, name: 'Key Takeaway', layoutNotes: ['closing takeaway'], effects: ['takeaway text'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('gaming', { id: 63, name: 'Facecam', layoutNotes: ['gameplay', 'facecam corner'], effects: ['facecam'], ffmpegCoreFilter: 'overlay=W-w-20:H-h-20', engineTemplate: 'highlight' }),
  makeTemplate('gaming', { id: 64, name: 'Kill Highlight', layoutNotes: ['kill highlight moment'], effects: ['highlight trim'], ffmpegCoreFilter: 'trim', engineTemplate: 'highlight' }),
  makeTemplate('gaming', { id: 65, name: 'Replay', layoutNotes: ['replay moment'], effects: ['replay'], ffmpegCoreFilter: 'loop', engineTemplate: 'highlight' }),
  makeTemplate('gaming', { id: 66, name: 'Score Overlay', layoutNotes: ['score HUD'], effects: ['score overlay'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('gaming', { id: 67, name: 'Meme Reaction', layoutNotes: ['gameplay', 'meme insert'], effects: ['meme reaction'], ffmpegCoreFilter: 'overlay', engineTemplate: 'meme' }),
  makeTemplate('gaming', { id: 68, name: 'Fast Cuts', layoutNotes: ['rapid cut sequence'], effects: ['fast cuts'], ffmpegCoreFilter: 'trim,setpts', engineTemplate: 'reaction' }),
  makeTemplate('gaming', { id: 69, name: 'Epic Zoom', layoutNotes: ['hero zoom'], effects: ['epic zoom'], ffmpegCoreFilter: 'zoompan', engineTemplate: 'highlight' }),
  makeTemplate('gaming', { id: 70, name: 'Stream Clip', layoutNotes: ['stream clip framing'], effects: ['stream clip'], ffmpegCoreFilter: 'overlay', engineTemplate: 'reaction' }),
  makeTemplate('gaming', { id: 71, name: 'Chat Overlay', layoutNotes: ['gameplay', 'chat overlay'], effects: ['chat overlay'], ffmpegCoreFilter: 'overlay', engineTemplate: 'meme' }),
  makeTemplate('gaming', { id: 72, name: 'Victory Moment', layoutNotes: ['victory freeze', 'celebration'], effects: ['victory highlight'], ffmpegCoreFilter: 'trim,zoompan', engineTemplate: 'highlight' }),
  makeTemplate('cinematic', { id: 73, name: 'Letterbox', layoutNotes: ['cinematic matte'], effects: ['letterbox'], ffmpegCoreFilter: 'drawbox', engineTemplate: 'highlight' }),
  makeTemplate('cinematic', { id: 74, name: 'Film Grain', layoutNotes: ['grain texture'], effects: ['film grain'], ffmpegCoreFilter: 'noise', engineTemplate: 'highlight' }),
  makeTemplate('cinematic', { id: 75, name: 'Light Leak', layoutNotes: ['light leak overlay'], effects: ['light leak'], ffmpegCoreFilter: 'blend', engineTemplate: 'meme' }),
  makeTemplate('cinematic', { id: 76, name: 'Color Grade', layoutNotes: ['color grade pass'], effects: ['eq'], ffmpegCoreFilter: 'eq', engineTemplate: 'highlight' }),
  makeTemplate('cinematic', { id: 77, name: 'Slow Zoom', layoutNotes: ['slow push-in'], effects: ['slow zoom'], ffmpegCoreFilter: 'zoompan', engineTemplate: 'highlight' }),
  makeTemplate('cinematic', { id: 78, name: 'Texture Overlay', layoutNotes: ['texture pass'], effects: ['texture overlay'], ffmpegCoreFilter: 'overlay', engineTemplate: 'meme' }),
  makeTemplate('cinematic', { id: 79, name: 'Blend Effect', layoutNotes: ['blended plates'], effects: ['blend'], ffmpegCoreFilter: 'blend', engineTemplate: 'highlight' }),
  makeTemplate('cinematic', { id: 80, name: 'Cinematic Intro', layoutNotes: ['intro title'], effects: ['intro title'], ffmpegCoreFilter: 'fade,drawtext', engineTemplate: 'highlight' }),
  makeTemplate('cinematic', { id: 81, name: 'Cinematic Outro', layoutNotes: ['outro title'], effects: ['outro title'], ffmpegCoreFilter: 'fade,drawtext', engineTemplate: 'highlight' }),
  makeTemplate('cinematic', { id: 82, name: 'Cinematic Reveal', layoutNotes: ['reveal transition'], effects: ['reveal'], ffmpegCoreFilter: 'xfade', engineTemplate: 'highlight' }),
  makeTemplate('marketing', { id: 83, name: 'Product Focus', layoutNotes: ['product close focus'], effects: ['product focus'], ffmpegCoreFilter: 'crop,zoompan', engineTemplate: 'highlight' }),
  makeTemplate('marketing', { id: 84, name: 'Feature List', layoutNotes: ['feature bullets'], effects: ['feature list'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('marketing', { id: 85, name: 'Before After', layoutNotes: ['before/after split'], effects: ['comparison'], ffmpegCoreFilter: 'hstack', engineTemplate: 'reaction' }),
  makeTemplate('marketing', { id: 86, name: 'CTA Overlay', layoutNotes: ['cta banner'], effects: ['cta overlay'], ffmpegCoreFilter: 'drawbox,drawtext', engineTemplate: 'meme' }),
  makeTemplate('marketing', { id: 87, name: 'Testimonial', layoutNotes: ['testimonial + product'], effects: ['testimonial'], ffmpegCoreFilter: 'hstack', engineTemplate: 'reaction' }),
  makeTemplate('marketing', { id: 88, name: 'Demo Clip', layoutNotes: ['product demo'], effects: ['demo clip'], ffmpegCoreFilter: 'trim', engineTemplate: 'highlight' }),
  makeTemplate('marketing', { id: 89, name: 'Zoom Product', layoutNotes: ['product zoom'], effects: ['zoom product'], ffmpegCoreFilter: 'zoompan', engineTemplate: 'highlight' }),
  makeTemplate('marketing', { id: 90, name: 'Text Promo', layoutNotes: ['promo headline'], effects: ['promo text'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('marketing', { id: 91, name: 'Brand Logo', layoutNotes: ['logo sting'], effects: ['logo overlay'], ffmpegCoreFilter: 'overlay', engineTemplate: 'meme' }),
  makeTemplate('marketing', { id: 92, name: 'Price Reveal', layoutNotes: ['price reveal card'], effects: ['price reveal'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('viral', { id: 93, name: 'Top 10', layoutNotes: ['ranked format'], effects: ['rank counter'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('viral', { id: 94, name: 'Countdown', layoutNotes: ['countdown timer'], effects: ['countdown'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('viral', { id: 95, name: 'Fact Video', layoutNotes: ['fact card'], effects: ['fact text'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('viral', { id: 96, name: 'Quiz', layoutNotes: ['quiz prompt'], effects: ['quiz text'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('viral', { id: 97, name: 'Mystery', layoutNotes: ['mystery setup'], effects: ['suspense blur'], ffmpegCoreFilter: 'boxblur', engineTemplate: 'highlight' }),
  makeTemplate('viral', { id: 98, name: 'Hook Question', layoutNotes: ['hook question opener'], effects: ['hook question'], ffmpegCoreFilter: 'drawtext', engineTemplate: 'highlight' }),
  makeTemplate('viral', { id: 99, name: 'Loop Ending', layoutNotes: ['looping outro'], effects: ['loop ending'], ffmpegCoreFilter: 'loop', engineTemplate: 'highlight' }),
  makeTemplate('viral', { id: 100, name: 'Twist Ending', layoutNotes: ['twist reveal'], effects: ['twist reveal'], ffmpegCoreFilter: 'xfade,drawtext', engineTemplate: 'highlight' }),
];

function mergeTemplate(baseTemplate, overrides = {}) {
  return {
    ...deepClone(baseTemplate),
    ...overrides,
    canvas: {
      ...(baseTemplate.canvas || {}),
      ...(overrides.canvas || {}),
    },
    split: {
      ...(baseTemplate.split || {}),
      ...(overrides.split || {}),
    },
    overlay: {
      ...(baseTemplate.overlay || {}),
      ...(overrides.overlay || {}),
    },
    meme: {
      ...(baseTemplate.meme || {}),
      ...(overrides.meme || {}),
    },
    background: {
      ...(baseTemplate.background || {}),
      ...(overrides.background || {}),
    },
  };
}

function buildTemplateSeed(template) {
  const baseTemplate = BASE_ENGINE_TEMPLATES[template.engineTemplate] || BASE_ENGINE_TEMPLATES.highlight;
  return mergeTemplate(baseTemplate, {
    name: template.slug,
    displayName: template.name,
    description: template.purpose,
    templateId: template.id,
    templateCode: template.code,
    group: template.group,
    groupKey: template.groupKey,
    useCases: template.useCases,
    layoutNotes: template.layoutNotes,
    timingNotes: template.timingNotes,
    effects: template.effects,
    ffmpegCoreFilter: template.ffmpegCoreFilter,
    engineTemplate: template.engineTemplate,
    managedBy: 'video-factory',
    tags: template.tags,
  });
}

export const VIDEO_FACTORY_TEMPLATES = TEMPLATE_DEFINITIONS.map((template) => ({
  ...template,
  seed: buildTemplateSeed(template),
}));

export const VIDEO_FACTORY_TEMPLATE_SEEDS = Object.fromEntries(
  VIDEO_FACTORY_TEMPLATES.map((template) => [template.slug, template.seed])
);

export const VIDEO_FACTORY_BASE_TEMPLATES = BASE_ENGINE_TEMPLATES;

export function getVideoFactoryTemplateSeed(templateName) {
  return VIDEO_FACTORY_TEMPLATE_SEEDS[templateName] || VIDEO_FACTORY_BASE_TEMPLATES[templateName] || null;
}
