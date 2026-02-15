import fs from 'fs';
import path from 'path';
import { executeWithKeyRotation } from '../utils/keyManager.js';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

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
async function analyzeWithGPT4Vision(imagePath, prompt, options = {}) {
  const model = options.model || 'gpt-4o';

  return executeWithKeyRotation('openai', async (apiKey) => {
    console.log(`   📦 Model: ${model}`);

    let imageUrl;
    
    // Prefer URL (OpenAI recommends URL over base64)
    if (options.imageUrl) {
      console.log(`   🌐 Using cloud URL`);
      imageUrl = options.imageUrl;
    } else {
      console.log(`   📁 Using base64 encoding`);
      const base64Image = encodeImageToBase64(imagePath);
      const mimeType = getImageMimeType(imagePath);
      imageUrl = `data:${mimeType};base64,${base64Image}`;
    }

    const requestBody = {
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: options.detail || 'high' // high, low, auto
              }
            }
          ]
        }
      ],
      max_tokens: 4096
    };

    const fetch = (await import('node-fetch')).default;

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      timeout: 60000
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenAI API error: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {
        errorMessage += ` - ${errorText.slice(0, 200)}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI');
    }

    const result = data.choices[0].message.content;
    console.log(`   ✅ Response received (${result.length} chars)`);

    return result;
  });
}

export { analyzeWithGPT4Vision };
