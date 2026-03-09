import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SCAN_DIRS = [
  'backend/controllers',
  'backend/routes',
  'backend/services',
  'backend/utils',
  'backend/scripts/scene-lock',
  'backend/scripts/trend-automation',
  'frontend/src/components',
  'frontend/src/pages',
  'frontend/src/services',
  'frontend/src/constants',
  'frontend/src/utils',
];

const SKIP_PATTERNS = [
  'node_modules',
  'dist',
  'coverage',
  '.git',
  'backend/scripts/auth',
  'backend/scripts/debug',
  'backend/scripts/test',
  'backend/tests',
  'frontend/src/tests',
  'frontend/src/__tests__',
];

const SKIP_FILE_PATTERNS = [/\.spec\./i, /\.test\./i, /package-lock\.json$/i];
const PROMPT_HINTS = [
  'prompt',
  'analysis',
  'analyze',
  'chatgpt',
  'scene',
  'lighting',
  'camera',
  'json',
  'voiceover',
  'script',
  'wearing',
  'holding',
  'character',
  'product',
  'return only',
  'image 1',
  'negative prompt',
];

function shouldSkip(filePath) {
  if (SKIP_PATTERNS.some((p) => filePath.includes(`/${p}/`) || filePath.includes(`\\${p}\\`))) {
    return true;
  }

  return SKIP_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function inferPurpose(varName = '', filePath = '', content = '') {
  const lower = `${varName} ${filePath} ${content.slice(0, 300)}`.toLowerCase();

  if (lower.includes('wear') || lower.includes('holding') || lower.includes('product')) {
    return 'Prompt dung canh wearing/holding product';
  }

  if (lower.includes('analysis') || lower.includes('analyze') || lower.includes('chatgpt')) {
    return 'Prompt phan tich anh gui len cho ChatGPT';
  }

  if (lower.includes('segment') || lower.includes('script') || lower.includes('voiceover')) {
    return 'Prompt sinh video script / voiceover';
  }

  return 'Prompt hardcoded trong project';
}

function inferUseCase(varName = '', filePath = '', content = '') {
  const lower = `${varName} ${filePath} ${content.slice(0, 300)}`.toLowerCase();
  if (lower.includes('script') || lower.includes('segment') || lower.includes('voiceover')) return 'video-script';
  if (lower.includes('affiliate') || lower.includes('analysis') || lower.includes('analyze') || lower.includes('chatgpt')) return 'affiliate-video-tiktok-analysis';
  if (lower.includes('holding') || lower.includes('product')) return 'product-showcase';
  if (lower.includes('outfit') || lower.includes('wear') || lower.includes('fashion')) return 'change-clothes';
  return 'generic';
}

function inferTemplateType(varName = '', filePath = '', content = '') {
  const lower = `${varName} ${filePath} ${content.slice(0, 300)}`.toLowerCase();
  if (lower.includes('video') || lower.includes('segment') || lower.includes('voiceover')) return 'video';
  if (lower.includes('analysis') || lower.includes('analyze') || lower.includes('chatgpt') || lower.includes('return only valid json')) return 'text';
  if (lower.includes('image') || lower.includes('wearing') || lower.includes('holding')) return 'image';
  return 'text';
}

function prettifyName(varName) {
  return varName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function isLikelyPrompt(varName = '', filePath = '', content = '') {
  const lower = `${varName} ${filePath} ${content.slice(0, 800)}`.toLowerCase();
  const lowerVarFile = `${varName} ${filePath}`.toLowerCase();
  const hits = PROMPT_HINTS.filter((hint) => lower.includes(hint)).length;
  const hasPromptLikeName = /(prompt|template|instruction|message|analysis|script)/i.test(lowerVarFile);
  const hasPromptLikeBody = lower.includes('you are') || lower.includes('return only valid json') || lower.includes('image 1') || lower.includes('negative prompt');

  if (hasPromptLikeName && hits >= 2 && content.length >= 80) return true;
  if (hasPromptLikeBody && hits >= 3 && content.length >= 100) return true;
  if (content.length >= 260 && hits >= 5 && hasPromptLikeName) return true;
  return false;
}

function inferUsedInPages(relFile, varName, content) {
  const locations = [
    {
      page: relFile,
      context: 'hardcoded_prompt',
      field: varName,
    },
  ];

  const lower = `${relFile} ${varName} ${content.slice(0, 300)}`.toLowerCase();
  if (relFile.includes('backend/services/affiliateVideoTikTokService.js') && lower.includes('analysis')) {
    locations.push({
      page: 'AffiliateVideoTikTokFlow',
      step: 1,
      context: 'chatgpt-analysis',
      field: 'analysisPrompt',
    });
  }

  return locations;
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (shouldSkip(fullPath)) continue;

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractTemplateLiteralPrompts(fileContent) {
  const results = [];
  const seen = new Set();
  const patterns = [
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*`([\s\S]*?)`\s*;/gi,
    /return\s+`([\s\S]*?)`\s*;/gi,
    /([A-Za-z_$][\w$]*)\s*:\s*`([\s\S]*?)`/gi,
  ];

  patterns.forEach((regex, patternIdx) => {
    let match;
    while ((match = regex.exec(fileContent)) !== null) {
      const varName = patternIdx === 1 ? `return_prompt_${results.length + 1}` : match[1];
      const rawPrompt = patternIdx === 1 ? match[1] : match[2];
      const content = (rawPrompt || '').trim();

      if (content.length < 80) continue;
      if (!isLikelyPrompt(varName, '', content)) continue;

      const key = `${varName}:${content.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ varName, content });
    }
  });

  return results;
}

export async function scanHardcodedPrompts() {
  const promptItems = [];
  const seenSourceKeys = new Set();

  for (const relativeDir of SCAN_DIRS) {
    const absDir = path.join(ROOT_DIR, relativeDir);
    let files = [];

    try {
      files = await collectFiles(absDir);
    } catch (_) {
      continue;
    }

    for (const absFile of files) {
      const relFile = path.relative(ROOT_DIR, absFile).replace(/\\/g, '/');
      const fileContent = await fs.readFile(absFile, 'utf8');
      const foundPrompts = extractTemplateLiteralPrompts(fileContent);

      foundPrompts.forEach((item) => {
        if (!isLikelyPrompt(item.varName, relFile, item.content)) return;

        const sourceKey = `${relFile}:${item.varName}`;
        if (seenSourceKeys.has(sourceKey)) return;
        seenSourceKeys.add(sourceKey);

        promptItems.push({
          sourceKey,
          name: prettifyName(item.varName),
          purpose: inferPurpose(item.varName, relFile, item.content),
          description: `Synced from hardcoded prompt in ${relFile} (${item.varName})`,
          useCase: inferUseCase(item.varName, relFile, item.content),
          templateType: inferTemplateType(item.varName, relFile, item.content),
          sourceType: 'hardcoded-scan',
          content: {
            mainPrompt: item.content,
            negativePrompt: '',
          },
          usedInPages: inferUsedInPages(relFile, item.varName, item.content),
          tags: ['hardcoded', 'auto-scan'],
        });
      });
    }
  }

  return promptItems;
}
