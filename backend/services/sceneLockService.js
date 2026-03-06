import path from 'path';
import fs from 'fs';
import ChatGPTService from './browser/chatgptService.js';
import GoogleFlowAutomationService from './googleFlowAutomationService.js';

function extractFirstJsonObject(text = '') {
  if (!text) return null;

  // Try fenced code block first (```json ... ```)
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  let candidate = fenced ? fenced[1] : text;

  // Direct parse attempt
  try {
    return JSON.parse(candidate);
  } catch (e1) {
    // Try extracting JSON object from text
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      let jsonStr = candidate.slice(firstBrace, lastBrace + 1);
      
      try {
        return JSON.parse(jsonStr);
      } catch (e2) {
        // ChatGPT often returns JSON with literal newlines inside strings
        // We need to fix this by escaping newlines inside string values
        try {
          const fixed = fixJsonWithNewlines(jsonStr);
          return JSON.parse(fixed);
        } catch (e3) {
          console.log('⚠️  JSON parse failed after all attempts');
          console.log('   Error:', e3.message);
          return null;
        }
      }
    }
    return null;
  }
}

/**
 * Fix JSON that has literal newlines inside string values
 * ChatGPT often returns multi-line JSON like:
 * {
 *   "key": "value with
 *   multiple
 *   lines"
 * }
 * Also handles unescaped double quotes inside strings:
 *   "text with "quotes" inside"
 * Should become:
 *   "text with \"quotes\" inside"
 */
function fixJsonWithNewlines(jsonStr) {
  // Strategy: Parse character by character, tracking if we're inside a string
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      if (inString) {
        // Check if this is an embedded quote (unescaped quote inside a string)
        // Look ahead to see if there's a colon or closing brace/bracket after
        // which would indicate this is actually ending the string
        let lookAhead = i + 1;
        while (lookAhead < jsonStr.length && /\s/.test(jsonStr[lookAhead])) {
          lookAhead++;
        }
        const nextNonSpace = jsonStr[lookAhead];
        
        // If next char is : or } or ] or , or end of string, this quote ends the string
        if (nextNonSpace === ':' || nextNonSpace === '}' || nextNonSpace === ']' || 
            nextNonSpace === ',' || nextNonSpace === undefined) {
          // This is the end of the string value
          inString = false;
          result += char;
        } else {
          // This is an embedded quote inside the string - escape it
          result += '\\' + char;
        }
      } else {
        // Start of a string
        inString = true;
        result += char;
      }
      continue;
    }
    
    // Inside a string, escape newlines and control characters
    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      // Outside string, keep character as-is
      result += char;
    }
  }
  
  return result;
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
Rules:\n- sceneLockedPrompt must be detailed, stable, and reusable across generations.\n- Lighting must be bright commercial quality (avoid dark/moody/night-club look).\n- Camera should be medium-close fashion framing for subject movement (avoid far wide camera).\n- Define a clear subject stage/empty zone where character stands naturally.\n- Props must support realistic interaction (leaning desk, correctly oriented high stool/chair toward camera, clear walk path).\n- Prefer light wall/prop colors (white/cream/light gray/warm wood), avoid dull pastel-wash or muddy palettes.\n- Include pose compatibility guidance for moving subject in center frame.\n- Fix geometry, camera perspective, object layout, and lighting behavior.\n- Avoid brand names and copyrighted locations.\n- Keep it production-ready for fashion/product content.`;
}

export async function generateSceneLockPromptWithChatGPT(sceneOption, payload = {}) {
  const chat = new ChatGPTService({ headless: false });
  await chat.initialize();

  try {
    const prompt = buildSceneLockChatGPTPrompt(sceneOption, payload);
    const raw = await chat.sendPrompt(prompt);
    
    console.log('\n📋 RAW RESPONSE PREVIEW (first 500 chars):');
    console.log(raw.substring(0, 500));
    console.log('...\n');
    
    const parsed = extractFirstJsonObject(raw);

    if (!parsed || !parsed.sceneLockedPrompt) {
      console.log('❌ Failed to parse JSON from response');
      console.log('   Raw response length:', raw.length);
      console.log('   Parsed result:', parsed);
      throw new Error('Could not parse scene lock JSON from ChatGPT response');
    }

    console.log('✅ JSON parsed successfully');
    console.log('   sceneLockedPrompt length:', parsed.sceneLockedPrompt?.length || 0);

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
  imageCount = 1,
  aspectRatio = '16:9',
  sceneValue = 'scene',
  headless = false
}) {
  const outputDir = path.join(process.cwd(), 'temp', 'scene-locks', sceneValue);
  fs.mkdirSync(outputDir, { recursive: true });

  const targetCount = Math.max(1, Math.min(4, Number(imageCount) || 1));

  const flow = new GoogleFlowAutomationService({
    type: 'image',
    aspectRatio,
    outputDir
  });

  try {
    console.log('\n[SCENE-LOCK] 🚀 Using unified generateImages() with built-in error recovery');
    
    // Use unified generateImages() method which supports:
    // - Optional reference images (none in this case for scene locks)
    // - Single or multiple prompts
    // - Output count parameter
    // - Full error recovery + retry mechanism (light + heavy retry)
    const result = await flow.generateImages(
      null,  // No reference images for scene lock generation
      {
        prompts: [prompt],
        outputCount: targetCount
      }
    );

    if (!result.success || !result.downloadedFiles || result.downloadedFiles.length === 0) {
      throw new Error(`Scene lock generation failed: ${result.error || 'No images generated'}`);
    }

    // 💫 Log if partial success
    if (result.partialSuccesses && result.partialSuccesses.length > 0) {
      console.log(`\n[SCENE-LOCK] ⚠️  PARTIAL SUCCESS: ${result.downloadedFiles.length}/${targetCount} images generated`);
      result.partialSuccesses.forEach(p => {
        console.log(`   - Prompt ${p.promptNumber}: ${p.found}/${p.expected} images`);
      });
      console.log(`[SCENE-LOCK] 💡 Can retry to get remaining images or proceed with ${result.downloadedFiles.length}/${targetCount}\n`);
    }

    // Convert downloaded files to result format with proper naming
    const results = result.downloadedFiles.map((filePath, idx) => {
      const fileExt = path.extname(filePath) || '.png';
      const fileName = path.basename(filePath, fileExt);
      
      // Rename with scene lock format
      const renamedFileName = `scene-lock-${sceneValue}-${Date.now()}-${String(idx + 1).padStart(2, '0')}${fileExt}`;
      const renamedFilePath = path.join(outputDir, renamedFileName);
      
      try {
        if (filePath !== renamedFilePath) {
          fs.renameSync(filePath, renamedFilePath);
        }
        return { path: renamedFilePath, url: renamedFilePath };
      } catch (renameErr) {
        console.warn(`[SCENE-LOCK] ⚠️  Could not rename: ${renameErr.message}`);
        return { path: filePath, url: filePath };
      }
    });

    console.log(`\n[SCENE-LOCK] ✅ Successfully generated ${results.length}/${targetCount} images with error recovery\n`);
    return results;
  } catch (error) {
    console.error('[SCENE-LOCK] ❌ Generation error:', error.message);
    throw error;
  } finally {
    // No need to manually close - generateImages() handles cleanup
    console.log('[SCENE-LOCK] ✅ Complete\n');
  }
}

