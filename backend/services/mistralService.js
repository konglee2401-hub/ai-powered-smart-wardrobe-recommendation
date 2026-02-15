import fs from 'fs';
import path from 'path';
import { executeWithKeyRotation } from '../utils/keyManager.js';

const MISTRAL_API_BASE = 'https://api.mistral.ai/v1';

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

// Main analysis function
async function analyzeWithMistral(imagePath, prompt, options = {}) {
  const model = options.model || 'pixtral-12b-2409';

  return executeWithKeyRotation('mistral', async (apiKey) => {
    console.log(`   📦 Model: ${model}`);

    let imageUrl;
    
    if (options.imageUrl) {
      console.log(`   🌐 Using cloud URL`);
      imageUrl = options.imageUrl;
    } else {
      console.log(`   📁 Using base64 encoding`);
      const base64Image = encodeImageToBase64(imagePath);
      const mimeType = getImageMimeType(imagePath);
      imageUrl = `data:${mimeType};base64,${base64Image}`;
    }

    // Prepare request body
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
      max_tokens: 4096,
      temperature: 0.7
    };

    // Dynamic import fetch
    const fetch = (await import('node-fetch')).default;

    // Make API request
    const response = await fetch(`${MISTRAL_API_BASE}/chat/completions`, {
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
      let errorMessage = `Mistral API error: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch (e) {
        errorMessage += ` - ${errorText.slice(0, 200)}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Mistral');
    }

    const result = data.choices[0].message.content;
    console.log(`   ✅ Response received (${result.length} chars)`);

    return result;
  });
}

export { analyzeWithMistral };
