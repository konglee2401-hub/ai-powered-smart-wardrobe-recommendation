import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeWithKeyRotation } from '../utils/keyManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Z.AI Official API Configuration
const ZAI_API_BASE = 'https://open.bigmodel.cn/api/paas/v4';

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

// Main analysis function with multi-key support
async function analyzeWithZAI(imagePath, prompt, options = {}) {
  const model = options.model || 'glm-4v-flash'; // FREE vision model

  return executeWithKeyRotation('zai', async (apiKey) => {
    console.log(`   📦 Model: ${model}`);

    let imageUrl;
    
    // Z.AI supports both, prefer URL for better performance
    if (options.imageUrl) {
      console.log(`   🌐 Using cloud URL`);
      imageUrl = options.imageUrl;
    } else {
      console.log(`   📁 Using base64 encoding`);
      const base64Image = encodeImageToBase64(imagePath);
      const mimeType = getImageMimeType(imagePath);
      imageUrl = `data:${mimeType};base64,${base64Image}`;
    }

    // Prepare request body (OpenAI-compatible format)
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
                url: imageUrl
              }
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 4096
    };

    // Dynamic import fetch
    const fetch = (await import('node-fetch')).default;

    // Make API request
    const response = await fetch(`${ZAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      timeout: 60000 // 60 seconds timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Z.AI API error: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch (e) {
        errorMessage += ` - ${errorText.slice(0, 200)}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Extract response
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Z.AI');
    }

    const result = data.choices[0].message.content;
    console.log(`   ✅ Response received (${result.length} chars)`);

    return result;
  });
}

export { analyzeWithZAI };
