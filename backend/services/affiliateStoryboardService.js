import path from 'path';

function sanitizeText(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

function inferTemplateKey(productFocus = 'full-outfit') {
  const normalized = String(productFocus || 'full-outfit').toLowerCase();
  if (normalized.includes('holding') || normalized.includes('accessor')) {
    return 'tiktok_holding_focus_3seg';
  }
  if (normalized.includes('shoe')) {
    return 'tiktok_shoe_focus_3seg';
  }
  return 'tiktok_full_outfit_3seg';
}

export function getStoryboardSegmentCount(videoDuration = 20, clipDuration = 8) {
  const duration = Number(videoDuration) || 20;
  const maxClip = Number(clipDuration) || 8;
  return Math.max(2, Math.ceil(duration / maxClip));
}

export function buildStoryboardBlueprint(analysis = {}, options = {}) {
  const {
    productFocus = 'full-outfit',
    videoDuration = 20,
    clipDuration = 8
  } = options;

  const segmentCount = getStoryboardSegmentCount(videoDuration, clipDuration);
  const product = analysis.product || {};
  const templateKey = inferTemplateKey(productFocus);
  const segmentNames = ['hook', 'showcase', 'cta', 'detail'];
  const durations = Array.from({ length: segmentCount }, (_, index) => {
    const base = Math.max(1, Math.floor(Number(videoDuration) / segmentCount));
    if (index === segmentCount - 1) {
      return Math.max(1, Number(videoDuration) - base * (segmentCount - 1));
    }
    return base;
  });

  const requiredFrames = [];
  const segments = [];

  for (let index = 0; index < segmentCount; index += 1) {
    const frameStartKey = `seg${index + 1}_start`;
    const frameEndKey = `seg${index + 1}_end`;
    const segmentName = segmentNames[index] || `segment-${index + 1}`;
    const focusLabel = index === 0 ? 'hook' : index === segmentCount - 1 ? 'cta' : productFocus;

    requiredFrames.push({
      key: frameStartKey,
      role: 'start',
      segmentIndex: index + 1,
      segmentName,
      focus: focusLabel,
      shotType: index === 0 ? 'mid-shot' : index === segmentCount - 1 ? 'hero-shot' : 'full-body',
      pose: index === 0 ? 'composed opening pose' : index === segmentCount - 1 ? 'confident CTA pose' : 'natural transition pose',
      purpose: `${segmentName} start frame`
    });

    requiredFrames.push({
      key: frameEndKey,
      role: 'end',
      segmentIndex: index + 1,
      segmentName,
      focus: focusLabel,
      shotType: index === 0 ? 'mid-shot' : index === segmentCount - 1 ? 'hero-shot' : 'full-body',
      pose: index === 0 ? 'slight turn to camera' : index === segmentCount - 1 ? 'final purchase CTA pose' : 'end transition pose',
      purpose: `${segmentName} end frame`
    });

    segments.push({
      segmentIndex: index + 1,
      segmentKey: `segment_${index + 1}`,
      segmentName,
      durationSec: durations[index],
      startFrameKey: frameStartKey,
      endFrameKey: frameEndKey,
      focus: focusLabel
    });
  }

  return {
    templateKey,
    segmentCount,
    clipDuration,
    videoDuration,
    productFocus,
    productCategory: product.category || product.garment_type || 'fashion',
    requiredFrames,
    segments
  };
}

export function buildFrameGenerationPlan(analysis = {}, blueprint = {}, options = {}) {
  const character = analysis.character || analysis.characterProfile || {};
  const product = analysis.product || analysis.productDetails || {};
  const language = String(options.language || 'vi').toLowerCase();
  const displayName = sanitizeText(options.characterDisplayName || options.characterName || character.name, 'the same model');
  const garmentType = sanitizeText(product.garment_type || product.name, 'product');
  const primaryColor = sanitizeText(product.primary_color || product.color, 'matching colors');
  const material = sanitizeText(product.fabric_type || product.material, 'premium fabric');
  const scene = sanitizeText(options.scene, 'studio');
  const lighting = sanitizeText(options.lighting, 'soft diffused light');
  const mood = sanitizeText(options.mood, 'confident');

  const frames = (blueprint.requiredFrames || []).map((frame) => {
    const roleLabel = frame.role === 'start' ? 'opening' : 'ending';
    const focusLine = frame.focus === 'holding' || frame.focus === 'accessories'
      ? 'The product must be clearly interacted with in the hands while the same character identity remains locked.'
      : 'The same uploaded character must visibly wear or present the product while preserving face, hair, body shape, and skin tone.';

    const prompt = language === 'vi'
      ? [
          `Tao anh khoa hinh cho video TikTok, khung ${roleLabel} cua segment ${frame.segmentIndex}.`,
          `Nhan vat bat buoc la ${displayName}, giu nguyen khuon mat, toc, ti le co the, mau da va danh tinh goc.`,
          `San pham: ${garmentType}, mau ${primaryColor}, chat lieu ${material}.`,
          `Canh quay ${frame.shotType}, muc dich ${frame.purpose}, tu the ${frame.pose}.`,
          `Boi canh ${scene}, anh sang ${lighting}, tam trang ${mood}.`,
          focusLine,
          'Anh thoi trang thuc te, dong nhat nhan vat, khong doi nguoi, khong sai anatomy, bo cuc 9:16.'
        ].join(' ')
      : [
          `Create a TikTok keyframe image for the ${roleLabel} of segment ${frame.segmentIndex}.`,
          `The character must remain exactly ${displayName}, preserving face, hair, body proportions, skin tone, and identity.`,
          `Product: ${garmentType}, color ${primaryColor}, material ${material}.`,
          `Shot type ${frame.shotType}, purpose ${frame.purpose}, pose ${frame.pose}.`,
          `Scene ${scene}, lighting ${lighting}, mood ${mood}.`,
          focusLine,
          'Photorealistic vertical 9:16 fashion still, coherent anatomy, no character drift.'
        ].join(' ');

    return {
      ...frame,
      prompt,
      outputLabel: `${frame.key}-${sanitizeText(frame.segmentName, 'segment').replace(/\s+/g, '-')}`
    };
  });

  return {
    ...blueprint,
    frames
  };
}

export function buildSegmentPlanningPrompt({ analysis = {}, blueprint = {}, frameLibrary = [], productFocus = 'full-outfit', language = 'vi' } = {}) {
  const product = analysis.product || {};
  const frameSummary = frameLibrary.map((frame) => ({
    key: frame.frameKey,
    segmentIndex: frame.segmentIndex,
    role: frame.role,
    purpose: frame.purpose,
    path: path.basename(frame.imagePath || '')
  }));

  return `
You are a senior TikTok affiliate video director planning Google Flow video clips in FRAMES mode.

You must create a deeply detailed segment plan that uses the provided start/end frame keys.
The resulting plan will be used to generate video segments sequentially. Character identity continuity is critical.

CONTEXT
- Product Focus: ${productFocus}
- Language: ${language}
- Product: ${sanitizeText(product.garment_type || product.name, 'product')}
- Storyboard Template: ${blueprint.templateKey}
- Segment Count: ${blueprint.segmentCount}
- Frames Mode: each segment requires startFrameKey and endFrameKey

AVAILABLE FRAME LIBRARY
${JSON.stringify(frameSummary, null, 2)}

ANALYSIS
${JSON.stringify(analysis, null, 2)}

RESPONSE FORMAT
Return ONLY valid JSON:
{
  "segments": [
    {
      "segmentIndex": 1,
      "segmentName": "hook/showcase/cta",
      "durationSec": 6,
      "startFrameKey": "seg1_start",
      "endFrameKey": "seg1_end",
      "videoPrompt": "full Google Flow prompt for this segment",
      "voiceoverText": "voiceover for this segment",
      "continuityTargetForNextSegment": {
        "pose": "what the last frame should preserve",
        "camera": "camera continuity",
        "expression": "expression continuity"
      }
    }
  ],
  "voiceoverScript": "full continuous voiceover in target language",
  "hashtags": ["tag1", "tag2"]
}

RULES
- Every segment must use frame keys from the library.
- Segment prompts must describe motion between the start and end frames.
- Preserve the same character identity in all segments.
- Make segment transitions natural and continuous.
- Voiceover must align with the segment sequence.
`.trim();
}

export function buildFallbackSegmentPlan({ analysis = {}, blueprint = {}, language = 'vi' } = {}) {
  const productName = sanitizeText(analysis.product?.garment_type || analysis.product?.name, 'product');
  const hashtags = ['#TikTokShop', '#Affiliate', '#Fashion'];

  const segments = (blueprint.segments || []).map((segment) => ({
    segmentIndex: segment.segmentIndex,
    segmentName: segment.segmentName,
    durationSec: segment.durationSec,
    startFrameKey: segment.startFrameKey,
    endFrameKey: segment.endFrameKey,
    videoPrompt: language === 'vi'
      ? `Tao video segment ${segment.segmentIndex} cho ${productName}. Bat dau tu frame ${segment.startFrameKey} va ket thuc o frame ${segment.endFrameKey}. Giu nguyen nhan vat, chuyen dong mem, lien mach, nhan manh ${segment.focus}.`
      : `Create segment ${segment.segmentIndex} for ${productName}, starting at frame ${segment.startFrameKey} and ending at frame ${segment.endFrameKey}. Preserve the same character and make the motion smooth and continuous while emphasizing ${segment.focus}.`,
    voiceoverText: language === 'vi'
      ? `Segment ${segment.segmentIndex}: gioi thieu ${productName} theo huong ${segment.focus}.`
      : `Segment ${segment.segmentIndex}: showcase ${productName} with a ${segment.focus} angle.`,
    continuityTargetForNextSegment: {
      pose: 'preserve body orientation from the ending frame',
      camera: 'maintain the same lens family and vertical composition',
      expression: 'keep facial emotion continuous'
    }
  }));

  return {
    segments,
    voiceoverScript: segments.map((segment) => segment.voiceoverText).join(' '),
    hashtags
  };
}

export function parseSegmentPlanningResponse(rawResponse, fallbackPayload) {
  if (!rawResponse) {
    return buildFallbackSegmentPlan(fallbackPayload);
  }

  const text = typeof rawResponse === 'string'
    ? rawResponse
    : typeof rawResponse?.data === 'string'
      ? rawResponse.data
      : JSON.stringify(rawResponse?.data || rawResponse);

  const candidates = [];
  const trimmed = String(text || '').trim();
  if (trimmed) {
    candidates.push(trimmed);
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    candidates.push(jsonMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed.segments) && parsed.segments.length > 0) {
        return parsed;
      }
    } catch {
      // Ignore and fallback.
    }
  }

  return buildFallbackSegmentPlan(fallbackPayload);
}
