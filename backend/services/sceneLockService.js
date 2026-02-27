import path from 'path';
import fs from 'fs';
import ChatGPTService from './browser/chatgptService.js';
import GoogleFlowService from './browser/googleFlowService.js';

function extractFirstJsonObject(text = '') {
  if (!text) return null;

  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function buildSceneLockChatGPTPrompt(sceneOption, payload = {}) {
  const {
    mode = 'create',
    styleDirection = '',
    improvementNotes = '',
    outputLanguage = 'en',
    existingNegativePrompt = ''
  } = payload;

  const modeInstruction = mode === 'enhance'
    ? 'Enhance and improve the existing scene prompt while preserving scene identity and geometry.'
    : 'Create a canonical scene lock prompt from scratch.';

  return `You are a scene consistency prompt engineer for AI image/video generation.\n
Task: ${modeInstruction}\n
Scene option data:\n${JSON.stringify({
    value: sceneOption.value,
    label: sceneOption.label,
    description: sceneOption.description,
    promptSuggestion: sceneOption.promptSuggestion || '',
    sceneLockedPrompt: sceneOption.sceneLockedPrompt || '',
    technicalDetails: sceneOption.technicalDetails || {},
    sceneNegativePrompt: outputLanguage === 'vi' ? (sceneOption.sceneNegativePromptVi || sceneOption.sceneNegativePrompt || '') : (sceneOption.sceneNegativePrompt || sceneOption.sceneNegativePromptVi || '')
  }, null, 2)}\n
Style direction (optional): ${styleDirection || '(none)'}\nImprovement notes (optional): ${improvementNotes || '(none)'}\nOutput language: ${outputLanguage}\n
Return ONLY valid JSON with this exact schema:\n{\n  "sceneLockedPrompt": "string",\n  "promptSuggestion": "string",\n  "technicalDetails": {\n    "background": "string",\n    "layout": "string",\n    "lighting": "string",\n    "camera": "string",\n    "constraints": "string"\n  },\n  "sceneNegativePrompt": "string",
  "guidance": "short operator guidance text"\n}\n
Rules:\n- sceneLockedPrompt must be detailed, stable, and reusable across generations.\n- Fix geometry, camera perspective, object layout, and lighting behavior.\n- Avoid brand names and copyrighted locations.\n- Keep it production-ready for fashion/product content.`;
}

export async function generateSceneLockPromptWithChatGPT(sceneOption, payload = {}) {
  const chat = new ChatGPTService({ headless: false });
  await chat.initialize();

  try {
    const prompt = buildSceneLockChatGPTPrompt(sceneOption, payload);
    const raw = await chat.generateText(prompt);
    const parsed = extractFirstJsonObject(raw);

    if (!parsed || !parsed.sceneLockedPrompt) {
      throw new Error('Could not parse scene lock JSON from ChatGPT response');
    }

    return {
      raw,
      parsed
    };
  } finally {
    await chat.close();
  }
}

export async function generateSceneLockImagesWithGoogleFlow({
  prompt,
  imageCount = 2,
  aspectRatio = '1:1',
  sceneValue = 'scene'
}) {
  const flow = new GoogleFlowService({ headless: false });
  const outputDir = path.join(process.cwd(), 'temp', 'scene-locks', sceneValue);
  fs.mkdirSync(outputDir, { recursive: true });

  await flow.initialize();
  const results = [];

  try {
    for (let i = 0; i < imageCount; i++) {
      const outputPath = path.join(outputDir, `${Date.now()}-${i + 1}.png`);
      const item = await flow.generateImage(prompt, {
        aspectRatio,
        download: true,
        outputPath
      });
      results.push(item);
    }

    return results;
  } finally {
    await flow.close();
  }
}
