import fs from 'fs';
import path from 'path';
import { getKeyManager } from '../utils/keyManager.js';

const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Helper: Encode image to base64
function encodeImageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

// Helper: Get image MIME type
function getImageMimeType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

// Main analysis function with URL support
async function analyzeWithGemini(imagePath, prompt, options = {}) {
  const model = options.model || 'gemini-2.0-flash-exp';
  const keyManager = getKeyManager('google');
  const keyInfo = keyManager.getNextKey();
  const apiKey = keyInfo.key;

  console.log(`   📦 Model: ${model}`);

  let imagePart;
  
  // Gemini supports both URL and base64, prefer URL
  if (options.imageUrl) {
    console.log(`   🌐 Using cloud URL`);
    
    // For Gemini, we need to fetch and convert URL to base64
    // because Gemini API doesn't directly support external URLs
    const fetch = (await import('node-fetch')).default;
    const imageResponse = await fetch(options.imageUrl);
    const imageBuffer = await imageResponse.buffer();
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image
      }
    };
  } else {
    console.log(`   📁 Using base64 encoding`);
    const base64Image = encodeImageToBase64(imagePath);
    const mimeType = getImageMimeType(imagePath);
    
    imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image
      }
    };
  }

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          imagePart
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096
    }
  };

  const fetch = (await import('node-fetch')).default;

  const response = await fetch(
    `${GOOGLE_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      timeout: 60000
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    
    // Check for rate limit
    if (response.status === 429 || errorText.includes('quota')) {
      keyManager.markKeyFailed(keyInfo.name, new Error('Rate limited'));
    }
    
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Invalid response format from Gemini');
  }

  const result = data.candidates[0].content.parts[0].text;
  console.log(`   ✅ Response received (${result.length} chars)`);

  return result;
}

export { analyzeWithGemini };
