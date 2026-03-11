function normalizeText(value = '') {
  return String(value || '').trim();
}

function truncateText(value = '', maxLength = 95) {
  const text = normalizeText(value);
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function normalizeTag(value = '') {
  const text = normalizeText(value)
    .replace(/#/g, '')
    .replace(/[^a-z0-9\s-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function normalizeHashtag(value = '') {
  const tag = normalizeTag(value).toLowerCase().replace(/[\s-]+/g, '');
  if (!tag) return '';
  return `#${tag}`;
}

function uniqueList(items = []) {
  const seen = new Set();
  const results = [];
  for (const item of items) {
    const key = String(item || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }
  return results;
}

export function buildPublishMetadata(context = {}) {
  const sourceTitle = normalizeText(context.sourceTitle || context.mainTitle || 'Mashup video');
  const templateName = normalizeText(context.templateName || '');
  const templateGroup = normalizeText(context.templateGroup || '');
  const sourceKey = normalizeText(context.sourceKey || context.sourcePlatform || '');
  const subtitleText = normalizeText(context.subtitleText || context.subtitleContext || '');
  const subVideoName = normalizeText(context.subVideoName || '');

  let title = sourceTitle || 'Mashup video';
  if (templateName && !title.toLowerCase().includes(templateName.toLowerCase())) {
    title = `${title} | ${templateName}`;
  }
  title = truncateText(title, 95);

  const tagCandidates = [
    templateName,
    templateGroup,
    sourceKey,
    subVideoName,
    'mashup',
    'shorts',
  ];

  const tags = uniqueList(tagCandidates.map(normalizeTag).filter(Boolean)).slice(0, 18);
  const hashtags = uniqueList(tagCandidates.map(normalizeHashtag).filter(Boolean)).slice(0, 8);

  const descriptionParts = [];
  if (templateName) descriptionParts.push(`Template: ${templateName}`);
  if (templateGroup) descriptionParts.push(`Group: ${templateGroup}`);
  if (sourceKey) descriptionParts.push(`Source: ${sourceKey}`);
  if (subtitleText) descriptionParts.push(`Subtitle: ${subtitleText}`);
  const description = descriptionParts.join('\n');

  return {
    title,
    description,
    tags,
    hashtags,
    generatedAt: new Date().toISOString(),
  };
}

export function mergePublishUploadConfig(uploadConfig = {}, generated = {}) {
  const hasProp = (key) => Object.prototype.hasOwnProperty.call(uploadConfig || {}, key);
  const merged = { ...(uploadConfig || {}) };

  if (!hasProp('title') && generated.title) merged.title = generated.title;
  if (!hasProp('description') && generated.description) merged.description = generated.description;
  if (!hasProp('tags') && Array.isArray(generated.tags)) merged.tags = generated.tags;
  if (!hasProp('hashtags') && Array.isArray(generated.hashtags)) merged.hashtags = generated.hashtags;
  if (!hasProp('visibility') && generated.visibility) merged.visibility = generated.visibility;

  return merged;
}
