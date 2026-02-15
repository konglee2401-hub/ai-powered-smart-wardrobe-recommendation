import fs from 'fs';
import path from 'path';
import { executeWithKeyRotation } from '../utils/keyManager.js';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';

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
async function analyzeWithClaude(imagePath, prompt, options = {}) {
  const model = options.model || 'claude-3-5-sonnet-20241022';

  return executeWithKeyRotation('anthropic', async (apiKey) => {
    console.log(`   📦 Model: ${model}`);

    let imageContent;
    
    // Prefer URL if available (better for large images)
    if (options.imageUrl) {
      console.log(`   🌐 Using cloud URL`);
      imageContent = {
        type: 'image',
        source: {
          type: 'url',
          url: options.imageUrl
        }
      };
    } else {
      console.log(`   📁 Using base64 encoding`);
      const base64Image = encodeImageToBase64(imagePath);
      const mimeType = getImageMimeType(imagePath);
      
      imageContent = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType,
          data: base64Image
        }
      };
    }

    const requestBody = {
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            imageContent
          ]
        }
      ]
    };

    const fetch = (await import('node-fetch')).default;

    const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      timeout: 60000
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Anthropic API error: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {
        errorMessage += ` - ${errorText.slice(0, 200)}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Anthropic');
    }

    const result = data.content[0].text;
    console.log(`   ✅ Response received (${result.length} chars)`);

    return result;
  });
}

export { analyzeWithClaude };
