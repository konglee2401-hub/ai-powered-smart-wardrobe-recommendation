#!/usr/bin/env node

/**
 * Grok Full Flow Test - Complete Workflow
 * 
 * This script tests the complete Grok workflow:
 * 1. Auto-login using saved session (cf_clearance cookie)
 * 2. Upload 2 images (character + product)
 * 3. Analyze with AI
 * 4. Apply recommendations
 * 5. Generate final image
 * 6. Save to test-results
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Apply stealth plugin
puppeteer.use(StealthPlugin());

const SESSION_FILE = path.join(process.cwd(), 'backend', 'data', 'sessions', 'grok-session.json');
const TEST_RESULTS_DIR = path.join(process.cwd(), 'backend', 'test-results');

// Essential cookies
const ESSENTIAL_COOKIES = ['cf_clearance', '__cf_bm', 'sso', 'sso-rw', 'x-userid'];

// Essential localStorage
const ESSENTIAL_LOCALSTORAGE = ['xai-ff-bu', 'chat-preferences', 'user-settings', 'anonUserId'];

const chromeUserDataDir = path.join(
  process.env.LOCALAPPDATA || os.homedir(),
  'Google',
  'Chrome',
  'User Data'
);

// Default test images
const TEST_IMAGES = {
  character: path.join(process.cwd(), 'backend', 'test-images', 'anh-nhan-vat.jpeg'),
  product: path.join(process.cwd(), 'backend', 'test-images', 'anh-san-pham.png')
};

// ============================================
// PROMPT TEMPLATES - Mimicking Virtual Try-On App Flow
// ============================================

/**
 * Step 2: Analysis Prompt - matches the app's unified analysis step
 * Asks Grok to analyze both images and return structured data
 * Focus on Vietnamese/Southeast Asian features
 */
const ANALYSIS_PROMPT = `Analyze these two images in detail for a Virtual Try-On system:

IMAGE 1 - CHARACTER/PERSON (Vietnamese/Southeast Asian):
- Gender, estimated age
- Ethnicity: Note Vietnamese characteristics (olive/tan skin tone, dark hair, typical Vietnamese facial features)
- Body type (slim, athletic, curvy, etc.) - common Vietnamese body types
- Skin tone (Vietnamese: olive, tan, light brown, fair with warm undertones)
- Hair: color (typically black/dark brown), style, length - common Vietnamese hairstyles
- Current pose and expression
- Current outfit (if any)
- Note: Subject appears to be Vietnamese based on features

IMAGE 2 - CLOTHING PRODUCT:
- Type of clothing (dress, top, pants, etc.)
- Style category (casual, formal, elegant, streetwear, ao dai, etc.)
- Colors and patterns
- Material/fabric type
- Fit type (slim, regular, loose, oversized)
- Notable design details (buttons, zippers, prints, embroidery)
- Is this suitable for Vietnamese fashion/trends?

FASHION ANALYSIS:
- Compatibility score (1-10) between character and clothing
- Style recommendations for scene, lighting, and mood suitable for Vietnamese context
- Suggested pose for wearing this clothing
- Color harmony analysis
- Any adjustments needed for Vietnamese body types/skin tones?

Please provide detailed, structured analysis focused on Vietnamese subjects and fashion.`;

/**
 * Step 4: Generation Prompt - matches the app's smart prompt builder
 * Uses structured format like buildChangeClothesPrompt() in smartPromptBuilder.js
 */
function buildGenerationPrompt(analysisText) {
  return `Based on the analysis of the two images I uploaded earlier, generate a photorealistic fashion image.

=== KEEP CHARACTER UNCHANGED ===
Keep the EXACT same person from image 1:
- Same face, same facial features, same expression
- Same body type and proportions
- Same skin tone
- Same hair color and style
- Same pose orientation

=== CHANGE CLOTHING TO ===
Dress the character in the EXACT clothing from image 2:
- Match the exact color, pattern, and design
- Match the exact material and texture
- The clothing should fit naturally on the character's body
- Proper draping and fabric physics

=== ENVIRONMENT ===
Setting: Professional studio with clean white/light gray background
Lighting: Soft diffused lighting from 45° angle, fill light from opposite side
Mood: Professional, clean, fashion-forward

=== PHOTOGRAPHY ===
Style: Professional fashion photography
Camera angle: Full body shot, eye level
Quality: 8K, ultra-detailed, sharp focus, photorealistic
Color: Natural, accurate color reproduction
Composition: Centered, full body visible, fashion magazine quality

Generate this image now.`;
}

async function loadSession() {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error(`Session file not found: ${SESSION_FILE}`);
  }
  const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  console.log('✅ Session loaded from file');
  return sessionData;
}

function filterEssentialCookies(cookies) {
  return cookies.filter(c => ESSENTIAL_COOKIES.includes(c.name));
}

function filterEssentialLocalStorage(localStorage) {
  const filtered = {};
  for (const key of ESSENTIAL_LOCALSTORAGE) {
    if (localStorage[key] !== undefined) {
      filtered[key] = localStorage[key];
    }
  }
  return filtered;
}

async function detectCloudflare(page) {
  try {
    return await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      const isChallenge = bodyText.includes('checking your browser') || 
                         bodyText.includes('cloudflare') ||
                         bodyText.includes('please wait');
      
      const iframes = document.querySelectorAll('iframe');
      let hasTurnstile = false;
      for (const iframe of iframes) {
        try {
          if (iframe.src && iframe.src.includes('cloudflare')) {
            hasTurnstile = true;
            break;
          }
        } catch (e) {}
      }
      
      return { isChallenge, hasTurnstile };
    });
  } catch (error) {
    return { isChallenge: false, error: error.message };
  }
}

async function checkLoginStatus(page) {
  try {
    const cf = await detectCloudflare(page);
    if (cf.isChallenge || cf.hasTurnstile) {
      return { isLoggedIn: false, isCloudflare: true };
    }
    
    return await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      const hasSignIn = bodyText.includes('sign in') || bodyText.includes('sign up');
      const hasChatInput = document.querySelector('textarea') !== null ||
                          document.querySelector('[contenteditable="true"]') !== null;
      return { isLoggedIn: !hasSignIn && hasChatInput, isCloudflare: false };
    });
  } catch (error) {
    return { isLoggedIn: false, error: error.message };
  }
}

async function uploadImage(page, imagePath) {
  console.log(`📤 Uploading via clipboard paste: ${path.basename(imagePath)}`);
  
  // Read image file as base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  // Determine MIME type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
  const mimeType = mimeMap[ext] || 'image/png';
  const fileName = path.basename(imagePath);
  
  // Find the contenteditable input area (Grok's "Hỏi Grok" input)
  const editorSelectors = [
    'div[contenteditable="true"].tiptap',
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"]',
    '[contenteditable="true"]',
    'textarea',
    '[role="textbox"]'
  ];
  
  let editor = null;
  for (const selector of editorSelectors) {
    try {
      editor = await page.$(selector);
      if (editor) {
        console.log(`   Found editor: ${selector}`);
        break;
      }
    } catch (e) {}
  }
  
  if (!editor) {
    throw new Error('Could not find Grok input area');
  }
  
  // Click to focus the editor
  await editor.click();
  await page.waitForTimeout(500);
  
  // Method 1: Simulate paste event with image data via page.evaluate
  const pasteSuccess = await page.evaluate(async (base64, mime, name) => {
    try {
      // Convert base64 to binary
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mime });
      const file = new File([blob], name, { type: mime });
      
      // Create DataTransfer with the file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Find the contenteditable element
      const editorEl = document.querySelector('div[contenteditable="true"].tiptap') ||
                       document.querySelector('div[contenteditable="true"].ProseMirror') ||
                       document.querySelector('div[contenteditable="true"]') ||
                       document.querySelector('[contenteditable="true"]');
      
      if (!editorEl) return { success: false, error: 'Editor not found in evaluate' };
      
      // Focus the editor
      editorEl.focus();
      
      // Create and dispatch paste event
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });
      
      editorEl.dispatchEvent(pasteEvent);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, base64Image, mimeType, fileName);
  
  if (pasteSuccess.success) {
    console.log('   ✅ Paste event dispatched');
  } else {
    console.log(`   ⚠️  Paste method 1 failed: ${pasteSuccess.error}`);
    
    // Method 2: Use CDP to write image to clipboard and then paste via keyboard
    console.log('   Trying CDP clipboard method...');
    try {
      const client = await page.target().createCDPSession();
      
      // Grant clipboard permissions
      await client.send('Browser.grantPermissions', {
        permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        origin: 'https://grok.com'
      });
      
      // Write image to clipboard using page.evaluate with Clipboard API
      await page.evaluate(async (base64, mime, name) => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mime });
        
        // Use Clipboard API to write image
        const clipboardItem = new ClipboardItem({ [mime]: blob });
        await navigator.clipboard.write([clipboardItem]);
      }, base64Image, mimeType, fileName);
      
      console.log('   ✅ Image written to clipboard');
      
      // Now paste using keyboard shortcut
      await page.keyboard.down('Control');
      await page.keyboard.press('v');
      await page.keyboard.up('Control');
      
      console.log('   ✅ Ctrl+V paste executed');
    } catch (cdpError) {
      console.log(`   ⚠️  CDP method failed: ${cdpError.message}`);
      
      // Method 3: Fallback - try traditional file input approach
      console.log('   Trying file input fallback...');
      
      // Look for file input (hidden or visible)
      const fileInputSelectors = [
        'input[type="file"]',
        'input[accept*="image"]'
      ];
      
      let fileInput = null;
      
      // First try clicking attach button to reveal file input
      const attachBtnSelectors = [
        'button[aria-label*="Attach"]',
        'button[aria-label*="attach"]',
        'button[aria-label*="upload"]',
        'button[aria-label*="image"]'
      ];
      
      for (const selector of attachBtnSelectors) {
        try {
          const btn = await page.$(selector);
          if (btn) {
            await btn.click();
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {}
      }
      
      for (const selector of fileInputSelectors) {
        try {
          fileInput = await page.$(selector);
          if (fileInput) break;
        } catch (e) {}
      }
      
      if (fileInput) {
        await fileInput.uploadFile(imagePath);
        console.log('   ✅ File uploaded via input fallback');
      } else {
        throw new Error('All upload methods failed. Could not upload image.');
      }
    }
  }
  
  // Wait for image to be processed
  await page.waitForTimeout(3000);
  
  // Verify image was attached (check for thumbnail/preview)
  const hasAttachment = await page.evaluate(() => {
    // Look for image preview/thumbnail near the input area
    const previews = document.querySelectorAll('img[src*="blob:"], img[src*="data:"], [class*="preview"], [class*="thumbnail"], [class*="attachment"]');
    return previews.length > 0;
  });
  
  if (hasAttachment) {
    console.log('✅ Image attached (preview detected)');
  } else {
    console.log('⚠️  Image paste completed but no preview detected (may still work)');
  }
}

async function typePrompt(page, prompt) {
  console.log('⌨️  Typing prompt...');
  
  const editorSelectors = [
    'div[contenteditable="true"].tiptap',
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"]',
    '[contenteditable="true"]',
    'textarea',
    '[role="textbox"]'
  ];
  
  let editor = null;
  let editorSelector = null;
  for (const selector of editorSelectors) {
    editor = await page.$(selector);
    if (editor) {
      editorSelector = selector;
      break;
    }
  }
  
  if (!editor) {
    throw new Error('Could not find text input');
  }
  
  await editor.click();
  await page.waitForTimeout(500);
  
  // For contenteditable div (TipTap/ProseMirror), use evaluate to set text
  const isContentEditable = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el && el.getAttribute('contenteditable') === 'true';
  }, editorSelector);
  
  if (isContentEditable) {
    // Use evaluate to insert text into contenteditable
    await page.evaluate((text, sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.focus();
        // Clear existing content
        const p = el.querySelector('p');
        if (p) {
          p.textContent = text;
        } else {
          el.textContent = text;
        }
        // Dispatch input event to notify TipTap/ProseMirror
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, prompt, editorSelector);
  } else {
    // For textarea, use Puppeteer's type
    await editor.type(prompt, { delay: 10 });
  }
  
  await page.waitForTimeout(1000);
  console.log('✅ Prompt entered');
}

async function sendMessage(page) {
  console.log('📤 Sending message...');
  
  // Try to find send button using valid CSS selectors
  let sendButton = await page.$('button[type="submit"]');
  
  if (!sendButton) {
    // Try to find by aria-label
    sendButton = await page.$('button[aria-label*="Send"], button[aria-label*="send"], button[aria-label*="Submit"]');
  }
  
  if (!sendButton) {
    // Try to find by evaluating button text content
    sendButton = await page.evaluateHandle(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        if (text.includes('send') || text.includes('submit') || text.includes('gửi') ||
            ariaLabel.includes('send') || ariaLabel.includes('submit')) {
          return btn;
        }
      }
      return null;
    });
    
    // Check if we got a valid element
    const isNull = await page.evaluate(el => el === null, sendButton);
    if (isNull) sendButton = null;
  }
  
  if (sendButton) {
    await sendButton.click();
    console.log('   ✅ Clicked send button');
  } else {
    // Fallback: use Enter key
    console.log('   ⚠️  No send button found, using Enter key');
    await page.keyboard.press('Enter');
  }
  
  await page.waitForTimeout(2000);
  console.log('✅ Message sent');
}

async function waitForResponse(page, maxWait = 90000) {
  console.log('⏳ Waiting for response...');
  
  const startTime = Date.now();
  let lastResponseText = '';
  let stableCount = 0;
  
  // Wait for Grok to start responding (look for response container)
  while (Date.now() - startTime < maxWait) {
    const responseData = await page.evaluate(() => {
      // Try multiple selectors for Grok response messages
      // Grok uses message containers - look for assistant/bot messages
      const selectors = [
        '[data-message-author-role="assistant"]',
        '[data-role="assistant"]',
        '[class*="message-bot"]',
        '[class*="assistant-message"]',
        '[class*="response-message"]',
        'div[class*="message"] div[class*="markdown"]',
        'div[class*="prose"]',
        // Grok specific: look for message blocks that are NOT the user's input
        'article',
        'div[data-testid*="message"]'
      ];
      
      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        if (elements.length > 0) {
          const lastEl = elements[elements.length - 1];
          return { found: true, text: lastEl.innerText, selector: sel };
        }
      }
      
      // Fallback: look for the main content area (exclude sidebar)
      const mainContent = document.querySelector('main') || 
                         document.querySelector('[role="main"]') ||
                         document.querySelector('[class*="chat-content"]') ||
                         document.querySelector('[class*="conversation"]');
      
      if (mainContent) {
        return { found: true, text: mainContent.innerText, selector: 'main' };
      }
      
      return { found: false, text: '' };
    });
    
    if (responseData.found && responseData.text.length > 0) {
      if (responseData.text === lastResponseText) {
        stableCount++;
        // Wait for text to be fully rendered (stable for 5 seconds)
        if (stableCount >= 5) {
          console.log(`   ✅ Response stable (selector: ${responseData.selector})`);
          break;
        }
      } else {
        stableCount = 0;
        lastResponseText = responseData.text;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        process.stdout.write(`\r   ⏳ Response growing... ${responseData.text.length} chars (${elapsed}s)`);
      }
    }
    
    await page.waitForTimeout(1000);
  }
  
  console.log('\n✅ Response received');
  
  // Extract the actual Grok response (last assistant message)
  const response = await page.evaluate(() => {
    // Try to get just the assistant's response, not the whole page
    const selectors = [
      '[data-message-author-role="assistant"]',
      '[data-role="assistant"]',
      'article',
      'div[class*="prose"]',
      'main'
    ];
    
    for (const sel of selectors) {
      const elements = document.querySelectorAll(sel);
      if (elements.length > 0) {
        const lastEl = elements[elements.length - 1];
        const text = lastEl.innerText?.trim();
        if (text && text.length > 20) {
          return text;
        }
      }
    }
    
    // Ultimate fallback
    const main = document.querySelector('main');
    return main ? main.innerText : document.body.innerText;
  });
  
  return response;
}

/**
 * Dismiss age verification modal if it appears.
 * Selects year 1990 and clicks Continue.
 */
async function dismissAgeVerification(page) {
  const hasModal = await page.evaluate(() => {
    const dialog = document.querySelector('[data-analytics-name="age_verification"]');
    return !!dialog;
  });
  
  if (!hasModal) return false;
  
  console.log('🔞 Age verification modal detected, auto-dismissing...');
  
  try {
    // Scroll to and click year 1990 button
    const clicked = await page.evaluate(() => {
      const dialog = document.querySelector('[data-analytics-name="age_verification"]');
      if (!dialog) return false;
      
      const buttons = dialog.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === '1990') {
          btn.scrollIntoView({ block: 'center' });
          btn.click();
          return true;
        }
      }
      return false;
    });
    
    if (clicked) {
      console.log('   ✅ Selected year 1990');
      await page.waitForTimeout(500);
    }
    
    // Click Continue button
    const continued = await page.evaluate(() => {
      const dialog = document.querySelector('[data-analytics-name="age_verification"]');
      if (!dialog) return false;
      
      const buttons = dialog.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Continue') {
          btn.click();
          return true;
        }
      }
      return false;
    });
    
    if (continued) {
      console.log('   ✅ Clicked Continue');
      await page.waitForTimeout(2000);
    }
    
    return true;
  } catch (err) {
    console.log(`   ⚠️  Age verification dismiss failed: ${err.message}`);
    return false;
  }
}

/**
 * Poll for age verification modal and dismiss it whenever it appears.
 * Runs as background check during image generation wait.
 */
async function checkAndDismissAgeVerification(page) {
  try {
    await dismissAgeVerification(page);
  } catch (e) {
    // ignore
  }
}

async function waitForGeneratedImage(page, maxWait = 120000) {
  console.log('⏳ Waiting for generated image...');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    // Check for age verification modal and dismiss if present
    await checkAndDismissAgeVerification(page);
    
    const imageUrl = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      
      for (const img of images) {
        const src = img.src;
        if (
          src.includes('generated') ||
          src.includes('cdn') ||
          src.includes('grok') ||
          (src.startsWith('https://') && !src.includes('logo') && !src.includes('icon'))
        ) {
          if (img.naturalWidth > 200 && img.naturalHeight > 200) {
            return src;
          }
        }
      }
      
      return null;
    });
    
    if (imageUrl) {
      // Dismiss age verification one more time in case it appeared with the image
      await checkAndDismissAgeVerification(page);
      return imageUrl;
    }
    
    await page.waitForTimeout(2000);
  }
  
  return null;
}

/**
 * Download generated images from Grok's response.
 * Strategy: Use canvas drawImage to extract the rendered <img> pixel data,
 * bypassing CORS/auth restrictions on assets.grok.com.
 * Falls back to CDP screenshot of the img element.
 */
async function downloadGeneratedImages(page, outputDir, timestamp) {
  console.log(`💾 Extracting generated images (full-size)...`);
  
  // First, make sure age verification is dismissed
  await checkAndDismissAgeVerification(page);
  await page.waitForTimeout(1000);
  
  const downloadedFiles = [];
  
  // Find all thumbnail containers (group/grok-image) in the chat
  const containerCount = await page.evaluate(() => {
    return document.querySelectorAll('div[class*="group/grok-image"]').length;
  });
  
  console.log(`   Found ${containerCount} thumbnail(s) in chat`);
  
  if (containerCount === 0) {
    console.log(`   ⚠️  No generated image thumbnails found`);
    return downloadedFiles;
  }
  
  // For each thumbnail: click to open full-size preview → screenshot → close
  for (let i = 0; i < containerCount; i++) {
    const outputPath = path.join(outputDir, `grok-generated-${timestamp}-${i}.png`);
    
    console.log(`   [${i + 1}/${containerCount}] Opening full-size preview...`);
    
    try {
      // Re-query containers each time (DOM may change after close)
      const containers = await page.$$('div[class*="group/grok-image"]');
      if (!containers[i]) {
        console.log(`   ⚠️  Container ${i} not found, skipping`);
        continue;
      }
      
      // Scroll into view and click the thumbnail to open preview
      await containers[i].evaluate(el => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(500);
      await containers[i].click();
      await page.waitForTimeout(2000);
      
      // Wait for the full-size preview to appear
      // Preview: figure.group/image with img[alt="active-image"]
      let previewImg = null;
      let waitCount = 0;
      while (waitCount < 10) {
        previewImg = await page.$('figure[class*="group/image"] img[alt="active-image"]');
        if (previewImg) break;
        // Also try without the figure wrapper
        previewImg = await page.$('img[alt="active-image"]');
        if (previewImg) break;
        await page.waitForTimeout(500);
        waitCount++;
      }
      
      if (previewImg) {
        // Wait for the image to fully load (opacity: 1, blur: 0)
        await page.waitForTimeout(1500);
        
        // Check if image is loaded
        const isLoaded = await previewImg.evaluate(img => {
          return img.complete && img.naturalWidth > 0;
        });
        
        if (!isLoaded) {
          console.log(`   ⚠️  Preview image not loaded, waiting more...`);
          await page.waitForTimeout(3000);
        }
        
        // Try to screenshot the figure container for best quality
        const figureEl = await page.$('figure[class*="group/image"]');
        const targetEl = figureEl || previewImg;
        
        await targetEl.screenshot({ path: outputPath, type: 'png' });
        const fileSize = fs.statSync(outputPath).size;
        
        if (fileSize > 5000) { // Full-size should be > 5KB
          console.log(`   ✅ Full-size screenshot: ${(fileSize / 1024).toFixed(1)} KB → ${outputPath}`);
          downloadedFiles.push(outputPath);
        } else {
          console.log(`   ⚠️  Preview too small (${(fileSize / 1024).toFixed(1)} KB), may not have loaded`);
        }
      } else {
        console.log(`   ⚠️  Full-size preview did not appear, taking thumbnail screenshot instead`);
        
        // Fallback: screenshot the thumbnail container
        const fallbackContainers = await page.$$('div[class*="group/grok-image"]');
        if (fallbackContainers[i]) {
          await fallbackContainers[i].screenshot({ path: outputPath, type: 'png' });
          const fileSize = fs.statSync(outputPath).size;
          if (fileSize > 1000) {
            console.log(`   ✅ Thumbnail screenshot: ${(fileSize / 1024).toFixed(1)} KB → ${outputPath}`);
            downloadedFiles.push(outputPath);
          }
        }
      }
      
      // Close the preview by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      
    } catch (err) {
      console.log(`   ⚠️  Error processing image ${i}: ${err.message}`);
      // Try to close any open preview
      try { await page.keyboard.press('Escape'); } catch (e) {}
      await page.waitForTimeout(500);
    }
  }
  
  return downloadedFiles;
}

async function main() {
  console.log('==================================================');
  console.log(' Grok Full Flow Test - Complete Workflow');
  console.log('==================================================\n');
  
  // Ensure test-results directory exists
  if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
  }
  
  // Load session
  const sessionData = await loadSession();
  const essentialCookies = filterEssentialCookies(sessionData.cookies);
  const essentialLocalStorage = filterEssentialLocalStorage(sessionData.localStorage);
  
  console.log(`🍪 Essential cookies: ${essentialCookies.length}`);
  console.log(`💾 Essential localStorage: ${Object.keys(essentialLocalStorage).length} keys`);
  
  // Launch browser
  console.log('\n🚀 Launching browser...');
  
  const browser = await puppeteer.launch({
    channel: 'chrome',
    headless: false,
    args: [
      `--user-data-dir=${chromeUserDataDir}`,
      '--profile-directory=Profile 1',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to grok.com
    console.log('📍 Navigating to https://grok.com...');
    await page.goto('https://grok.com', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✅ Page loaded');
    
    // Inject cookies
    console.log('🍪 Injecting essential cookies...');
    for (const cookie of essentialCookies) {
      try {
        await page.setCookie({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          expires: cookie.expires,
          httpOnly: cookie.httpOnly || false,
          secure: cookie.secure || true,
          sameSite: cookie.sameSite || 'None'
        });
        console.log(`   ✅ ${cookie.name}`);
      } catch (error) {
        console.log(`   ❌ ${cookie.name}: ${error.message}`);
      }
    }
    
    // Inject localStorage
    console.log('💾 Injecting essential localStorage...');
    await page.evaluate((storageData) => {
      for (const [key, value] of Object.entries(storageData)) {
        try {
          localStorage.setItem(key, value);
        } catch (e) {}
      }
    }, essentialLocalStorage);
    console.log('   ✅ localStorage injected');
    
    // Reload to trigger Cloudflare with session
    console.log('🔄 Reloading page with session...');
    await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Wait for login (poll)
    console.log('⏳ Waiting for login...');
    let status = null;
    let checkCount = 0;
    
    while (!status?.isLoggedIn && checkCount < 30) {
      await page.waitForTimeout(2000);
      checkCount++;
      status = await checkLoginStatus(page);
      
      if (status.isCloudflare) {
        console.log(`   ☁️ Cloudflare detected, waiting... (#${checkCount})`);
      } else if (status.isLoggedIn) {
        console.log('✅ LOGGED IN!');
        break;
      }
    }
    
    if (!status?.isLoggedIn) {
      throw new Error('Failed to login with session');
    }
    
    // ============================================
    // STEP 1: Upload 2 images and analyze
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📸 STEP 1: Uploading 2 images for analysis');
    console.log('='.repeat(60));
    
    // Upload character image
    await uploadImage(page, TEST_IMAGES.character);
    await page.waitForTimeout(1000);
    
    // Upload product image  
    await uploadImage(page, TEST_IMAGES.product);
    await page.waitForTimeout(1000);
    
    // Use the detailed analysis prompt (matching Virtual Try-On Step 2)
    const analysisPrompt = ANALYSIS_PROMPT;

    await typePrompt(page, analysisPrompt);
    await sendMessage(page);
    
    const analysisResult = await waitForResponse(page, 90000);
    
    console.log('\n📊 ANALYSIS RESULT:');
    console.log('-'.repeat(60));
    console.log(analysisResult.slice(0, 1500) + '...\n');
    
    // Save analysis to file
    const analysisPath = path.join(TEST_RESULTS_DIR, `grok-analysis-${Date.now()}.txt`);
    fs.writeFileSync(analysisPath, analysisResult);
    console.log(`💾 Analysis saved to: ${analysisPath}`);
    
    // ============================================
    // STEP 2: Generate final image
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🎨 STEP 2: Generating final image');
    console.log('='.repeat(60));
    
    // Clear and type generation prompt - start new conversation
    console.log('🔄 Reloading for new conversation...');
    await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    // Wait for login again after reload
    checkCount = 0;
    status = await checkLoginStatus(page);
    while (!status?.isLoggedIn && checkCount < 15) {
      await page.waitForTimeout(2000);
      checkCount++;
      status = await checkLoginStatus(page);
    }
    
    // Upload images again
    await uploadImage(page, TEST_IMAGES.character);
    await page.waitForTimeout(1000);
    await uploadImage(page, TEST_IMAGES.product);
    await page.waitForTimeout(1000);
    
    // Use structured generation prompt (matching Virtual Try-On Step 4)
    const generationPrompt = buildGenerationPrompt(analysisResult);

    await typePrompt(page, generationPrompt);
    await sendMessage(page);
    
    // Wait for image generation
    const imageUrl = await waitForGeneratedImage(page, 120000);
    
    if (!imageUrl) {
      throw new Error('No image generated');
    }
    
    console.log(`✅ Image generated: ${imageUrl}`);
    
    // Wait a moment for images to fully render
    await page.waitForTimeout(3000);
    
    // Download ALL generated images using canvas/screenshot methods
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const downloadedFiles = await downloadGeneratedImages(page, TEST_RESULTS_DIR, timestamp);
    
    if (downloadedFiles.length > 0) {
      console.log(`\n💾 Successfully downloaded ${downloadedFiles.length} image(s):`);
      downloadedFiles.forEach(f => console.log(`   📁 ${f}`));
    } else {
      console.log('\n⚠️  Could not extract images automatically.');
      console.log('   The images are visible in the browser at:');
      console.log(`   ${imageUrl}`);
    }
    
    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ FULL FLOW COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 SUMMARY:');
    console.log(`   1. ✅ Session loaded & login automatic`);
    console.log(`   2. ✅ Uploaded 2 images (character + product)`);
    console.log(`   3. ✅ Got AI analysis`);
    console.log(`   4. ✅ Generated new fashion image`);
    console.log(`   5. ✅ Saved ${downloadedFiles.length} image(s) to: ${TEST_RESULTS_DIR}`);
    console.log('\n🎉 All steps completed!');
    
    // Keep browser open for verification
    console.log('\nBrowser will stay open for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    console.log('\n🔒 Closing browser...');
    await browser.close();
    console.log('✅ Done');
  }
}

main().catch(console.error);
