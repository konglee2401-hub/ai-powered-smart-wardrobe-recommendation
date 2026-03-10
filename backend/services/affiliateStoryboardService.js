import path from 'path';
import VIDEO_SCRIPT_TEMPLATES, { getVideoScriptTemplateById } from '../constants/videoScriptTemplates.js';
import { getVideoScriptScoringConfig } from './videoScriptScoringService.js';

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

function normalizeMatchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u1ef9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMatchCorpus(analysis = {}, productFocus = '') {
  const product = analysis.product || {};
  const character = analysis.character || {};
  const recs = analysis.recommendations || {};
  return normalizeMatchText([
    product.garment_type,
    product.name,
    product.category,
    product.primary_color,
    product.fabric_type,
    product.key_details,
    product.style_category,
    productFocus,
    character.gender,
    character.age,
    recs.scene?.choice || recs.scene,
    recs.mood?.choice || recs.mood,
    recs.lighting?.choice || recs.lighting
  ].filter(Boolean).join(' '));
}

export async function selectVideoScriptTemplate({ analysis = {}, productFocus = 'full-outfit' } = {}) {
  const corpus = buildMatchCorpus(analysis, productFocus);
  const scoringConfig = await getVideoScriptScoringConfig();

  const boostMatchers = {
    kol: (text) => text.includes('kol') || text.includes('persona') || text.includes('influencer'),
    'ai-tool': (text) => text.includes('tool') || text.includes('saas') || text.includes('automation'),
    'fashion-movement': (text) => text.includes('outfit') || text.includes('fashion') || text.includes('dress'),
    'deal-urgency': (text) => text.includes('deal') || text.includes('sale') || text.includes('discount')
  };

  const scored = VIDEO_SCRIPT_TEMPLATES.map((template) => {
    const keywords = (template.keywords || []).map((k) => normalizeMatchText(k));
    const tagHits = (template.tags || []).filter((tag) => corpus.includes(normalizeMatchText(tag))).length;
    const keywordHits = keywords.filter((k) => k && corpus.includes(k)).length;
    const baseScore = tagHits * (scoringConfig.weights?.tag || 2)
      + keywordHits * (scoringConfig.weights?.keyword || 3);

    const boostResults = (scoringConfig.boosts || [])
      .map((boost) => ({
        id: boost.id,
        score: boost.score || 0,
        matched: (() => {
          if (typeof boost.match === 'function') {
            return Boolean(boost.match(corpus, template, analysis));
          }
          if (Array.isArray(boost.keywords)) {
            const normalized = boost.keywords.map((k) => normalizeMatchText(k)).filter(Boolean);
            if (normalized.some((k) => corpus.includes(k))) return true;
          }
          if (Array.isArray(boost.tags)) {
            const normalizedTags = boost.tags.map((t) => normalizeMatchText(t)).filter(Boolean);
            if (normalizedTags.some((t) => corpus.includes(t))) return true;
          }
          return boostMatchers[boost.id] ? Boolean(boostMatchers[boost.id](corpus, template, analysis)) : false;
        })()
      }))
      .filter((boost) => boost.matched);

    const boostScore = boostResults.reduce((sum, boost) => sum + boost.score, 0);

    return {
      template,
      score: baseScore + boostScore,
      matches: {
        tagHits,
        keywordHits,
        boosts: boostResults
      }
    };
  }).sort((a, b) => b.score - a.score);

  const winner = scored[0]?.template || VIDEO_SCRIPT_TEMPLATES[0];
  const reason = scored[0]
    ? `Matched ${scored[0].matches.keywordHits} keywords, ${scored[0].matches.tagHits} tags, boosts: ${scored[0].matches.boosts.map((b) => b.id).join(', ') || 'none'}.`
    : 'Default template selection.';

  return {
    template: winner,
    reason,
    scored,
    config: scoringConfig
  };
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
    // Text is ALLOWED only on hook (first) and cta (last) frames where it enhances engagement
    const textRequired = segmentName === 'hook' || segmentName === 'cta';

    requiredFrames.push({
      key: frameStartKey,
      role: 'start',
      segmentIndex: index + 1,
      segmentName,
      focus: focusLabel,
      shotType: index === 0 ? 'mid-shot' : index === segmentCount - 1 ? 'hero-shot' : 'full-body',
      pose: index === 0 ? 'composed opening pose' : index === segmentCount - 1 ? 'confident CTA pose' : 'natural transition pose',
      purpose: `${segmentName} start frame`,
      textRequired
    });

    requiredFrames.push({
      key: frameEndKey,
      role: 'end',
      segmentIndex: index + 1,
      segmentName,
      focus: focusLabel,
      shotType: index === 0 ? 'mid-shot' : index === segmentCount - 1 ? 'hero-shot' : 'full-body',
      pose: index === 0 ? 'slight turn to camera' : index === segmentCount - 1 ? 'final purchase CTA pose' : 'end transition pose',
      purpose: `${segmentName} end frame`,
      textRequired
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

    const textRequired = frame.textRequired || false;

    let promptParts;
    if (language === 'vi') {
      if (textRequired) {
        // Hook/CTA frames: ALLOW conditional text
        promptParts = [
          `===== CONTEXT (For AI Understanding Only) =====`,
          `Video segment ${frame.segmentIndex} of ${blueprint.segmentCount}: ${frame.segmentName}`,
          `Frame role: ${roleLabel}`,
          `Purpose: ${frame.purpose}`,
          `Pose guidance: ${frame.pose}`,
          `Text overlay: CO THE co (optional)`,
          ``,
          `===== CHARACTER & PRODUCT =====`,
          `Nhan vat bat buoc la ${displayName}, giu nguyen khuon mat, toc, ti le co the, mau da va danh tinh goc.`,
          `San pham: ${garmentType}, mau ${primaryColor}, chat lieu ${material}.`,
          ``,
          `===== PURE VISUAL GENERATION =====`,
          `Tao anh khoa hinh cho video TikTok, khung ${roleLabel}.`,
          `Canh quay ${frame.shotType}.`,
          `Boi canh ${scene}, anh sang ${lighting}, tam trang ${mood}.`,
          focusLine,
          ``,
          `===== TEXT OVERLAY (CO CHON) =====`,
          `Neu segment nay can text nho (hook hoac cta): co the hien thi 1-2 tu nho (ej "LIMITED OFFER", "BUY NOW").`,
          `Neu hien thi text: vi tri goc canh (khong lap character), mau trang/toi roi, contrast cao.`,
          `Text DAY LA CHI GIAN CHUI - Video prompt se chi tiet dung text nao.`,
          `Neu VIDEO PROMPT khong noi den text, thi KHONG VE text.`,
          ``,
          `Anh thoi trang thuc te, dong nhat nhan vat, khong sai anatomy, bo cuc 9:16.`
        ];
      } else {
        // Showcase/Detail frames: STRICT no text
        promptParts = [
          `===== CONTEXT (For AI Understanding Only) =====`,
          `Video segment ${frame.segmentIndex} of ${blueprint.segmentCount}: ${frame.segmentName}`,
          `Frame role: ${roleLabel}`,
          `Purpose: ${frame.purpose}`,
          `Pose guidance: ${frame.pose}`,
          `Text overlay: TUYET DOI khong co`,
          ``,
          `===== CHARACTER & PRODUCT =====`,
          `Nhan vat bat buoc la ${displayName}, giu nguyen khuon mat, toc, ti le co the, mau da va danh tinh goc.`,
          `San pham: ${garmentType}, mau ${primaryColor}, chat lieu ${material}.`,
          ``,
          `===== PURE VISUAL GENERATION (KHONG TEXT) =====`,
          `Tao anh khoa hinh cho video TikTok, khung ${roleLabel}.`,
          `Canh quay ${frame.shotType}.`,
          `Boi canh ${scene}, anh sang ${lighting}, tam trang ${mood}.`,
          focusLine,
          ``,
          `===== CRITICAL: KHONG TEXT TOAN BO =====`,
          `TUYET DOI khong ghi text, so hieu, chu, label, metadata len anh.`,
          `Khong co: "Segment 1", "Segment 2", "Segment 3", "CTA", tieu de, chu thich, hay logo, chu description.`,
          `Chi la anh tay thuc te: nhan vat + san pham, KHONG CO CHI TIET VAN BAN.`,
          `Anh thoi trang thuc te, dong nhat nhan vat, khong sai anatomy, bo cuc 9:16.`
        ];
      }
    } else {
      if (textRequired) {
        // Hook/CTA frames: ALLOW conditional text
        promptParts = [
          `===== CONTEXT (For AI Understanding Only) =====`,
          `Video segment ${frame.segmentIndex} of ${blueprint.segmentCount}: ${frame.segmentName}`,
          `Frame role: ${roleLabel}`,
          `Purpose: ${frame.purpose}`,
          `Pose guidance: ${frame.pose}`,
          `Text overlay: OPTIONAL`,
          ``,
          `===== CHARACTER & PRODUCT =====`,
          `The character must remain exactly ${displayName}, preserving face, hair, body proportions, skin tone, and identity.`,
          `Product: ${garmentType}, color ${primaryColor}, material ${material}.`,
          ``,
          `===== PURE VISUAL GENERATION =====`,
          `Create a TikTok keyframe image for the ${roleLabel}.`,
          `Shot type ${frame.shotType}.`,
          `Scene ${scene}, lighting ${lighting}, mood ${mood}.`,
          focusLine,
          ``,
          `===== TEXT OVERLAY (OPTIONAL - Hook/CTA only) =====`,
          `For hook (engagement) or CTA (call to action): may display small text (1-2 words max).`,
          `Examples: "LIMITED OFFER", "BUY NOW", "EXCLUSIVE", "SHOP NOW".`,
          `If displaying text: corner position (no overlap), white/bold color, high contrast.`,
          `NOTE: This is guidance only. Video prompt will specify actual text to render.`,
          `If video prompt does NOT mention text, then render NO text on this frame.`,
          ``,
          `Photorealistic vertical 9:16 fashion still, coherent anatomy, no character drift.`
        ];
      } else {
        // Showcase/Detail frames: STRICT no text
        promptParts = [
          `===== CONTEXT (For AI Understanding Only) =====`,
          `Video segment ${frame.segmentIndex} of ${blueprint.segmentCount}: ${frame.segmentName}`,
          `Frame role: ${roleLabel}`,
          `Purpose: ${frame.purpose}`,
          `Pose guidance: ${frame.pose}`,
          `Text overlay: NONE`,
          ``,
          `===== CHARACTER & PRODUCT =====`,
          `The character must remain exactly ${displayName}, preserving face, hair, body proportions, skin tone, and identity.`,
          `Product: ${garmentType}, color ${primaryColor}, material ${material}.`,
          ``,
          `===== PURE VISUAL GENERATION (NO TEXT) =====`,
          `Create a TikTok keyframe image for the ${roleLabel}.`,
          `Shot type ${frame.shotType}.`,
          `Scene ${scene}, lighting ${lighting}, mood ${mood}.`,
          focusLine,
          ``,
          `===== CRITICAL: NO TEXT ANYWHERE =====`,
          `Do NOT render any text, numbers, labels, metadata, titles, captions, or overlays.`,
          `Do NOT include: "Segment 1", "Segment 2", "Segment 3", "CTA", headings, descriptions, or any text.`,
          `Only render: pure photorealistic image of character and product.`,
          `Photorealistic vertical 9:16 fashion still, coherent anatomy, no character drift, NO TEXT ANYWHERE.`
        ];
      }
    }

    const prompt = promptParts.join('\n');

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

export function buildSegmentPlanningPrompt({ analysis = {}, blueprint = {}, frameLibrary = [], productFocus = 'full-outfit', language = 'vi', scriptTemplateId = 'auto', autoSelection = null } = {}) {
  const product = analysis.product || {};
  const frameSummary = frameLibrary.map((frame) => ({
    key: frame.frameKey,
    segmentIndex: frame.segmentIndex,
    role: frame.role,
    purpose: frame.purpose,
    path: path.basename(frame.imagePath || ''),
    textAllowed: frame.textRequired || false
  }));

  const templateList = VIDEO_SCRIPT_TEMPLATES
    .map((template) => ({
      id: template.id,
      name: template.name,
      summary: template.summary,
      bestFor: template.bestFor
    }));
  const requestedTemplate = scriptTemplateId && scriptTemplateId !== 'auto'
    ? getVideoScriptTemplateById(scriptTemplateId)
    : null;
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

AVAILABLE FRAME LIBRARY (textAllowed = whether text overlay can appear on these frames)
${JSON.stringify(frameSummary, null, 2)}

ANALYSIS
${JSON.stringify(analysis, null, 2)}

SCRIPT TEMPLATE LIBRARY (choose ONE best template, or follow requested template if provided)
${JSON.stringify(templateList, null, 2)}

TEMPLATE SELECTION RULES
- If a requested template is provided, use it strictly.
- If not provided (auto), choose the best template based on product type, target context, and hook potential.
- You must output templateId, templateName, and templateReason in the response JSON.

REQUESTED TEMPLATE
${requestedTemplate ? JSON.stringify(requestedTemplate, null, 2) : 'AUTO'}

AUTO-MATCH RECOMMENDATION
${autoSelection ? JSON.stringify({
  recommendedTemplateId: autoSelection.template.id,
  recommendedTemplateName: autoSelection.template.name,
  reason: autoSelection.reason
}, null, 2) : 'N/A'}

RESPONSE FORMAT
Return ONLY valid JSON:
{
  "templateId": "selected-template-id",
  "templateName": "Selected Template Name",
  "templateReason": "Why this template fits the product and audience",
  "segments": [
    {
      "segmentIndex": 1,
      "segmentName": "hook/showcase/cta",
      "durationSec": 6,
      "startFrameKey": "seg1_start",
      "endFrameKey": "seg1_end",
      "videoPrompt": "full Google Flow prompt for this segment",
      "textOverlayRequired": true,
      "textOverlayContent": "if true, specify text (e.g., 'LIMITED OFFER', 'BUY NOW')",
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

CRITICAL RULES FOR TEXT OVERLAYS
- Check each frame's textAllowed field (from frame library)
- Hook frames (hook segment): textAllowed=true, can suggest text overlay ("LIMITED OFFER", "SHOP NOW", etc.)
- Showcase/Detail frames: textAllowed=false, MUST set textOverlayRequired=false
- CTA frames (cta segment): textAllowed=true, MUST suggest text overlay ("BUY NOW", "EXCLUSIVE", etc.)
- If textAllowed=false, set textOverlayRequired=false and textOverlayContent=null
- If textAllowed=true AND segment type suggests text (hook/cta), set textOverlayRequired=true and specify exact text
- Text should be 1-3 words maximum, high-impact, direct call to action for CTA
- Include textOverlayContent in the videoPrompt IF textOverlayRequired=true

OTHER RULES
- Every segment must use frame keys from the library
- Segment prompts must describe motion between start/end frames
- Preserve character identity in all segments
- Make transitions natural and continuous
- Voiceover must align with segment sequence
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
    textOverlayRequired: segment.segmentName === 'hook' || segment.segmentName === 'cta',
    textOverlayContent: segment.segmentName === 'cta' ? 'BUY NOW' : segment.segmentName === 'hook' ? 'LIMITED OFFER' : null,
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
