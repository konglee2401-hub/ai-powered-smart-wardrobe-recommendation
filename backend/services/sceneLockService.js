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
Rules:\n- sceneLockedPrompt must be detailed, stable, and reusable across generations.\n- Fix geometry, camera perspective, object layout, and lighting behavior.\n- Avoid brand names and copyrighted locations.\n- Keep it production-ready for fashion/product content.`;
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

  const flow = new GoogleFlowAutomationService({
    type: 'image',
    aspectRatio,
    imageCount: 1,
    model: 'Nano Banana Pro',
    headless,
    outputDir
  });

  const results = [];
  const MAX_RETRIES = 3;

  try {
    // STEP 1: Initialize browser session (loads session from .sessions/google-flow-session-complete.json)
    console.log('\n[INIT] 🚀 Initializing Google Flow Automation Service...');
    await flow.init();
    console.log('[INIT] ✅ Browser initialized\n');

    // STEP 2: Navigate to Google Flow project
    console.log('[NAV] 🔗 Navigating to Google Flow...');
    await flow.navigateToFlow();
    console.log('[NAV] ✅ Navigated to project\n');

    // STEP 3: Wait for page to be fully ready
    console.log('[PAGE] ⏳ Waiting for page to load...');
    await flow.waitForPageReady();
    console.log('[PAGE] ✅ Page ready');
    await flow.page.waitForTimeout(3000);
    console.log('[PAGE] ✅ Ready\n');

    // STEP 4: Configure settings (aspect ratio, model)
    console.log('[CONFIG] ⚙️  Configuring settings...');
    await flow.configureSettings();
    console.log('[CONFIG] ✅ Settings configured\n');

    // STEP 5: Generate images in loop
    for (let i = 0; i < imageCount; i++) {
      console.log(`\n${'═'.repeat(80)}`);
      console.log(`🎨 GENERATING IMAGE ${i + 1}/${imageCount}`);
      console.log(`${'═'.repeat(80)}\n`);

      // Clear previous prompt if not first iteration
      if (i > 0) {
        console.log('[CLEAR] 🧹 Clearing previous prompt...');
        await flow.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
        await flow.page.waitForTimeout(200);
        await flow.page.keyboard.down('Control');
        await flow.page.keyboard.press('a');
        await flow.page.keyboard.up('Control');
        await flow.page.waitForTimeout(100);
        await flow.page.keyboard.press('Backspace');
        await flow.page.waitForTimeout(500);
        console.log('[CLEAR] ✅ Previous prompt cleared\n');
      }

      // Capture hrefs before prompt
      console.log('[HREFS] 📸 Capturing hrefs BEFORE prompt...');
      const prePromptHrefs = await flow.page.evaluate(() => {
        const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        return Array.from(links).map(link => link.getAttribute('href'));
      });
      console.log(`[HREFS] ✓ Captured ${prePromptHrefs.length} items\n`);

      // Enter prompt using enterPrompt method
      console.log('[PROMPT] 📝 Entering prompt...');
      await flow.enterPrompt(prompt);
      console.log('[PROMPT] ✅ Prompt entered\n');

      // Click submit button
      console.log('[SUBMIT] 🖱️  Clicking submit button...');
      const submitResult = await flow.page.evaluate(() => {
        const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (!textbox) return { found: false };
        
        let container = textbox;
        for (let i = 0; i < 5; i++) {
          container = container.parentElement;
        }
        
        const buttons = container.querySelectorAll('button');
        for (const btn of buttons) {
          const icon = btn.querySelector('i.google-symbols');
          if (icon && icon.textContent.includes('arrow_forward')) {
            if (!btn.disabled) {
              const rect = btn.getBoundingClientRect();
              return {
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }
          }
        }
        return { found: false };
      });
      
      if (submitResult.found) {
        console.log(`   ✓ Found submit button at (${submitResult.x}, ${submitResult.y})`);
        await flow.page.mouse.move(submitResult.x, submitResult.y);
        await flow.page.waitForTimeout(100);
        await flow.page.mouse.down();
        await flow.page.waitForTimeout(50);
        await flow.page.mouse.up();
        console.log('[SUBMIT] ✅ Submit clicked\n');
      } else {
        console.log('[SUBMIT] ⚠️  Submit button not found, trying Enter key...');
        await flow.page.keyboard.press('Enter');
        await flow.page.waitForTimeout(1000);
      }

      // Wait for generation with retry mechanism
      let retryCount = 0;
      let success = false;
      let generatedHref = null;

      while (retryCount < MAX_RETRIES && !success) {
        if (retryCount > 0) {
          console.log(`\n[RETRY] 🔄 Attempt ${retryCount}/${MAX_RETRIES}...\n`);
        }

        // Wait for generation to complete
        console.log('[WAIT] ⏳ Waiting for generation (max 120s)...\n');
        const timeoutMs = 120000;
        const maxAttempts = Math.ceil(timeoutMs / 1000);
        let generationDetected = false;
        let attempt = 0;

        while (!generationDetected && attempt < maxAttempts) {
          attempt++;

          const currentHrefs = await flow.page.evaluate(() => {
            const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
            return Array.from(links).map(link => {
              const parent = link.closest('[data-tile-id]') || link.closest('[data-index]');
              const warningIcon = parent?.querySelector('i.google-symbols');
              const tileText = parent?.textContent || '';
              // Check for error indicators: warning icon OR "Không thành công" text
              const hasError = (warningIcon && warningIcon.textContent.includes('warning')) ||
                              tileText.includes('Không thành công') ||
                              tileText.includes('thất bại');
              return {
                href: link.getAttribute('href'),
                hasError: hasError || false,
                hasWarning: warningIcon?.textContent.includes('warning') || false
              };
            });
          });

          // Find new href
          for (const current of currentHrefs) {
            if (!prePromptHrefs.includes(current.href)) {
              generatedHref = current;
              generationDetected = true;
              break;
            }
          }

          if (generationDetected) {
            console.log(`[WAIT] ✓ NEW image detected (attempt ${attempt}s)`);
            break;
          }

          if (attempt % 10 === 0) {
            console.log(`[WAIT] Attempt ${attempt}/${maxAttempts}s...`);
          }

          await flow.page.waitForTimeout(1000);
        }

        if (!generationDetected) {
          console.log(`[WAIT] ❌ No new image within ${timeoutMs / 1000}s`);
          retryCount++;
          continue;
        }

        // Check for errors
        if (generatedHref.hasError) {
          console.log('[ERROR] ⚠️  Generation has error');
          
          // Try "Thử lại" or "Sử dụng lại câu lệnh" from context menu
          const retryResult = await attemptRetryViaContextMenu(flow, generatedHref.href);
          
          if (retryResult.success) {
            console.log('[RETRY] ✅ Retry triggered, waiting for new generation...\n');
            await flow.page.waitForTimeout(3000);
            
            // Continue waiting for the retry generation
            continue;
          } else {
            console.log('[RETRY] ❌ Could not trigger retry via context menu');
            retryCount++;
            continue;
          }
        }

        // Success - no error
        success = true;
      }

      if (!success || !generatedHref) {
        throw new Error(`Failed to generate image after ${MAX_RETRIES} retries`);
      }

      // Download the generated image
      console.log('[DOWNLOAD] ⬇️  Downloading image...');
      await flow.page.waitForTimeout(2000);

      const downloadedFile = await flow.downloadItemViaContextMenu(generatedHref.href);

      if (!downloadedFile) {
        throw new Error('Failed to download image');
      }

      // Rename file with image number
      const fileExt = path.extname(downloadedFile);
      const fileName = path.basename(downloadedFile, fileExt);
      const imageNum = String(i + 1).padStart(2, '0');
      const renamedFileName = `${fileName}-scene-${imageNum}${fileExt}`;
      const renamedFilePath = path.join(outputDir, renamedFileName);

      try {
        // Move to output directory with new name
        const finalPath = path.join(outputDir, path.basename(downloadedFile));
        if (downloadedFile !== finalPath) {
          fs.renameSync(downloadedFile, finalPath);
        }
        fs.renameSync(finalPath, renamedFilePath);
        console.log(`[DOWNLOAD] ✅ Downloaded: ${renamedFileName}\n`);
        results.push({ path: renamedFilePath, url: renamedFilePath });
      } catch (renameErr) {
        console.log(`[DOWNLOAD] ⚠️  Could not rename: ${renameErr.message}`);
        results.push({ path: downloadedFile, url: downloadedFile });
      }
    }

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`✅ All ${imageCount} images generated`);
    console.log(`${'═'.repeat(70)}\n`);

    return results;

  } finally {
    console.log('[CLOSE] 🚪 Closing browser...');
    await flow.close();
    console.log('[CLOSE] ✅ Browser closed\n');
  }
}

/**
 * Attempt retry via context menu - tries "Thử lại", "Sử dụng lại câu lệnh", or "Undo"
 * IMPORTANT: Context menus are rendered in PORTALS at document.body level
 */
async function attemptRetryViaContextMenu(flow, targetHref) {
  console.log('[RETRY] 🔍 Attempting retry via context menu...');
  
  // Find the generated item position
  const reuseResult = await flow.page.evaluate((href) => {
    const link = document.querySelector(`a[href="${href}"]`);
    if (!link) return { found: false };
    const rect = link.getBoundingClientRect();
    return {
      found: true,
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2)
    };
  }, targetHref);

  if (!reuseResult.found) {
    console.log('[RETRY] ⚠️  Could not find target image link');
    return { success: false };
  }

  // Right-click on the generated image
  console.log(`[RETRY] 🖱️  Right-clicking on image at (${reuseResult.x}, ${reuseResult.y})`);
  await flow.page.mouse.move(reuseResult.x, reuseResult.y);
  await flow.page.waitForTimeout(300);
  await flow.page.mouse.down({ button: 'right' });
  await flow.page.waitForTimeout(50);
  await flow.page.mouse.up({ button: 'right' });
  await flow.page.waitForTimeout(1000);

  // Look for retry options in context menu (PORTAL - search from document root)
  console.log('[RETRY] 🔍 Searching for retry options in context menu...');
  const menuResult = await flow.page.evaluate(() => {
    // Method 1: Find context menu by role (in portal)
    const allMenuItems = document.querySelectorAll('[role="menuitem"]');
    console.log(`[RETRY-DEBUG] Found ${allMenuItems.length} elements with role="menuitem"`);
    
    // Log all menu items for debugging
    const menuTexts = [];
    for (const item of allMenuItems) {
      const text = (item.textContent || '').trim().substring(0, 50);
      menuTexts.push(text);
    }
    console.log('[RETRY-DEBUG] Menu items:', menuTexts.join(' | '));
    
    // Search for retry/reuse/undo options
    for (const item of allMenuItems) {
      const text = item.textContent || '';
      const lowerText = text.toLowerCase();
      
      // Vietnamese options
      if (text.includes('Thử lại') || text.includes('Sử dụng lại câu lệnh') ||
          lowerText.includes('khôi phục') || lowerText.includes('hoàn tác')) {
        const rect = item.getBoundingClientRect();
        return {
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          text: text.substring(0, 50),
          type: 'retry'
        };
      }
      
      // English options
      if (lowerText.includes('retry') || lowerText.includes('reuse') ||
          lowerText.includes('undo') || lowerText.includes('restore')) {
        const rect = item.getBoundingClientRect();
        return {
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          text: text.substring(0, 50),
          type: 'retry'
        };
      }
    }
    
    return { found: false };
  });

  if (menuResult.found) {
    console.log(`[RETRY] ✅ Found retry option: "${menuResult.text}"`);
    
    // Click the retry/reuse button
    await flow.page.mouse.move(menuResult.x, menuResult.y);
    await flow.page.waitForTimeout(200);
    await flow.page.mouse.down();
    await flow.page.waitForTimeout(100);
    await flow.page.mouse.up();
    await flow.page.waitForTimeout(1500);

    // For "Sử dụng lại câu lệnh", need to submit again
    const submitBtn = await flow.page.evaluate(() => {
      const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
      if (!textbox) return { found: false };
      let container = textbox;
      for (let i = 0; i < 5; i++) {
        container = container.parentElement;
      }
      const buttons = container.querySelectorAll('button');
      for (const btn of buttons) {
        const icon = btn.querySelector('i.google-symbols');
        if (icon && icon.textContent.includes('arrow_forward') && !btn.disabled) {
          const rect = btn.getBoundingClientRect();
          return {
            found: true,
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
          };
        }
      }
      return { found: false };
    });

    if (submitBtn.found) {
      console.log('[RETRY] 🖱️  Clicking submit button after reusing command...');
      await flow.page.mouse.move(submitBtn.x, submitBtn.y);
      await flow.page.waitForTimeout(100);
      await flow.page.mouse.down();
      await flow.page.waitForTimeout(50);
      await flow.page.mouse.up();
    }

    return { success: true };
  }

  // METHOD 2: Look for Undo button directly on the tile (not in context menu)
  console.log('[RETRY] 🔍 Looking for Undo button on error tile...');
  const undoResult = await flow.page.evaluate((href) => {
    // Find the error tile by href
    const link = document.querySelector(`a[href="${href}"]`);
    if (!link) return { found: false };
    
    // Find the parent tile container
    let tile = link.closest('[data-tile-id]');
    if (!tile) {
      tile = link.closest('[data-index]');
    }
    if (!tile) {
      // Try finding by traversing up
      tile = link;
      for (let i = 0; i < 10; i++) {
        tile = tile.parentElement;
        if (tile && tile.querySelector('button')) break;
      }
    }
    
    if (!tile) return { found: false };
    
    // Look for Undo button (could be icon button or text button)
    const buttons = tile.querySelectorAll('button');
    for (const btn of buttons) {
      const text = (btn.textContent || '').toLowerCase();
      const icon = btn.querySelector('i.google-symbols');
      const iconText = icon ? icon.textContent : '';
      
      // Check for undo/restore icon or text
      if (text.includes('undo') || text.includes('hoàn tác') ||
          iconText.includes('undo') || iconText.includes('restore') ||
          iconText.includes('replay') || iconText.includes('refresh')) {
        const rect = btn.getBoundingClientRect();
        return {
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          text: btn.textContent?.substring(0, 30) || iconText
        };
      }
    }
    
    return { found: false };
  }, targetHref);

  if (undoResult.found) {
    console.log(`[RETRY] ✅ Found Undo button: "${undoResult.text}"`);
    await flow.page.mouse.move(undoResult.x, undoResult.y);
    await flow.page.waitForTimeout(200);
    await flow.page.mouse.down();
    await flow.page.waitForTimeout(100);
    await flow.page.mouse.up();
    await flow.page.waitForTimeout(2000);
    return { success: true };
  }

  // METHOD 3: Close context menu and try clicking on the error indicator
  console.log('[RETRY] 🔍 Looking for error indicator to click...');
  
  // Close context menu by clicking elsewhere
  await flow.page.mouse.move(100, 100);
  await flow.page.waitForTimeout(200);
  await flow.page.mouse.click(100, 100);
  await flow.page.waitForTimeout(500);

  // Look for error icon/warning on the tile
  const errorClickResult = await flow.page.evaluate((href) => {
    const link = document.querySelector(`a[href="${href}"]`);
    if (!link) return { found: false };
    
    // Find parent tile
    let tile = link.closest('[data-tile-id]') || link.closest('[data-index]');
    if (!tile) {
      tile = link.parentElement?.parentElement?.parentElement;
    }
    
    if (!tile) return { found: false };
    
    // Look for warning icon
    const warningIcon = tile.querySelector('i.google-symbols');
    if (warningIcon && warningIcon.textContent.includes('warning')) {
      const rect = warningIcon.getBoundingClientRect();
      return {
        found: true,
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        type: 'warning_icon'
      };
    }
    
    // Look for "Không thành công" text
    const allText = tile.textContent || '';
    if (allText.includes('Không thành công') || allText.includes('thất bại')) {
      const rect = link.getBoundingClientRect();
      return {
        found: true,
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        type: 'error_tile'
      };
    }
    
    return { found: false };
  }, targetHref);

  if (errorClickResult.found) {
    console.log(`[RETRY] 🖱️  Clicking on ${errorClickResult.type}...`);
    await flow.page.mouse.move(errorClickResult.x, errorClickResult.y);
    await flow.page.waitForTimeout(200);
    await flow.page.mouse.click(errorClickResult.x, errorClickResult.y);
    await flow.page.waitForTimeout(1000);
    
    // After clicking error, look for retry option
    const retryAfterError = await flow.page.evaluate(() => {
      const items = document.querySelectorAll('[role="menuitem"], button');
      for (const item of items) {
        const text = (item.textContent || '').toLowerCase();
        if (text.includes('thử lại') || text.includes('retry') || 
            text.includes('khôi phục') || text.includes('undo')) {
          const rect = item.getBoundingClientRect();
          return {
            found: true,
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2),
            text: item.textContent?.substring(0, 30)
          };
        }
      }
      return { found: false };
    });
    
    if (retryAfterError.found) {
      console.log(`[RETRY] ✅ Found retry option after error click: "${retryAfterError.text}"`);
      await flow.page.mouse.move(retryAfterError.x, retryAfterError.y);
      await flow.page.waitForTimeout(200);
      await flow.page.mouse.click(retryAfterError.x, retryAfterError.y);
      await flow.page.waitForTimeout(2000);
      return { success: true };
    }
  }

  console.log('[RETRY] ❌ Could not find any retry mechanism');
  return { success: false };
}
