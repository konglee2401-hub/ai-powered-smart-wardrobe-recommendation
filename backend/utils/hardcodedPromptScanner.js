import fs from 'fs/promises';
import path from 'path';

const ROOT_DIR = process.cwd();
const SCAN_DIRS = [
  'backend/utils',
  'backend/controllers',
  'frontend/src/components',
  'frontend/src/utils',
];

const SKIP_PATTERNS = ['node_modules', 'dist', 'coverage', '.git'];

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some((p) => filePath.includes(`/${p}/`) || filePath.includes(`\\${p}\\`));
}

function inferPurpose(varName = '', filePath = '', content = '') {
  const lower = `${varName} ${filePath} ${content.slice(0, 300)}`.toLowerCase();

  if (lower.includes('wear') || lower.includes('holding') || lower.includes('product')) {
    return 'Prompt dựng cảnh wearing/holding product';
  }

  if (lower.includes('analysis') || lower.includes('analyze') || lower.includes('chatgpt')) {
    return 'Prompt phân tích ảnh gửi lên cho ChatGPT';
  }

  if (lower.includes('segment') || lower.includes('script')) {
    return 'Prompt deep analysis để sinh video script theo segment';
  }

  return 'Prompt hardcoded trong project';
}

function inferUseCase(varName = '', filePath = '', content = '') {
  const lower = `${varName} ${filePath} ${content.slice(0, 300)}`.toLowerCase();
  if (lower.includes('script') || lower.includes('segment')) return 'video-script';
  if (lower.includes('outfit') || lower.includes('wear') || lower.includes('fashion')) return 'outfit-change';
  if (lower.includes('product')) return 'product-showcase';
  return 'generic';
}

function prettifyName(varName) {
  return varName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
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
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*prompt[\w$]*)\s*=\s*`([\s\S]*?)`\s*;/gi,
    /return\s+`([\s\S]*?)`\s*;/gi,
    /([A-Za-z_$][\w$]*prompt[\w$]*)\s*:\s*`([\s\S]*?)`/gi,
  ];

  patterns.forEach((regex, patternIdx) => {
    let match;
    while ((match = regex.exec(fileContent)) !== null) {
      const varName = patternIdx === 1 ? `return_prompt_${results.length + 1}` : match[1];
      const rawPrompt = patternIdx === 1 ? match[1] : match[2];
      const content = (rawPrompt || '').trim();

      if (content.length < 40) continue;

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
      const content = await fs.readFile(absFile, 'utf8');
      const foundPrompts = extractTemplateLiteralPrompts(content);

      foundPrompts.forEach((item) => {
        const sourceKey = `${relFile}:${item.varName}`;
        promptItems.push({
          sourceKey,
          name: prettifyName(item.varName),
          purpose: inferPurpose(item.varName, relFile, item.content),
          description: `Synced from hardcoded prompt in ${relFile} (${item.varName})`,
          useCase: inferUseCase(item.varName, relFile, item.content),
          templateType: 'text',
          sourceType: 'hardcoded-scan',
          content: {
            mainPrompt: item.content,
            negativePrompt: '',
          },
          usedInPages: [
            {
              page: relFile,
              context: 'hardcoded_prompt',
              field: item.varName,
            },
          ],
          tags: ['hardcoded', 'auto-scan'],
        });
      });
    }
  }

  return promptItems;
}
