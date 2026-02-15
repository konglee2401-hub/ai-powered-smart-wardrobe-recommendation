import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import FormData from 'form-data';

// ==================== BYTEPLUS API CONFIGURATION ====================

const BYTEPLUS_CONFIG = {
  // API Endpoints (official API)
  apiBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  
  // Legacy console API (for backward compatibility)
  consoleApiBaseUrl: 'https://modelark-api.console.byteplus.com/ark/bff/api/ap-southeast-1/2024',
  storageUrl: 'https://ark-common-storage-prod-ap-southeast-1.tos-ap-southeast-1.volces.com',
  
  // Vision Models (for analysis)
  visionModels: {
    'doubao-vision-pro': {
      name: 'Doubao Vision Pro',
      endpoint: 'ep-20241230185605-vxkxc',
      type: 'vision',
      priority: 1,
      recommended: true,
      description: 'High-quality vision analysis'
    },
    'doubao-vision-lite': {
      name: 'Doubao Vision Lite',
      endpoint: 'ep-20241230185605-lite',
      type: 'vision',
      priority: 2,
      description: 'Fast vision analysis'
    },
    'seed-1.8': {
      name: 'ByteDance Seed 1.8',
      endpoint: 'ep-20250213-seed18',
      type: 'vision',
      priority: 3,
      recommended: true,
      description: 'Specialized vision model'
    }
  },
  
  // Image Generation Models
  generationModels: {
    'seedream-5-0': {
      name: 'SeeDream 5.0',
      endpoint: 'seedream-5-0-260128',
      type: 'image-to-image',
      maxPromptLength: 3500,
      supportsImageInput: true
    },
    'seedream-4-5': {
      name: 'SeeDream 4.5',
      endpoint: 'seedream-4-5-251128',
      type: 'image-to-image',
      maxPromptLength: 3500,
      supportsImageInput: true
    }
  }
};

// ==================== ANALYZE WITH BYTEPLUS VISION (OFFICIAL API) ====================

export async function analyzeWithByteplusVision(imagePath, prompt, modelId = 'doubao-vision-pro') {
  const BYTEPLUS_API_KEY = process.env.BYTEPLUS_API_KEY;
  
  // Try official API first
  if (BYTEPLUS_API_KEY) {
    return await analyzeWithOfficialAPI(imagePath, prompt, modelId);
  }
  
  // Fall back to legacy console API
  return await analyzeWithLegacyAPI(imagePath, prompt, modelId);
}

async function analyzeWithOfficialAPI(imagePath, prompt, modelId = 'doubao-vision-pro') {
  const BYTEPLUS_API_KEY = process.env.BYTEPLUS_API_KEY;
  
  const model = BYTEPLUS_CONFIG.visionModels[modelId];
  
  if (!model) {
    throw new Error(`Unknown BytePlus vision model: ${modelId}`);
  }

  console.log(`   👁️  Analyzing with BytePlus ${model.name} (Official API)...`);
  console.log(`   📝 ${model.description}`);

  try {
    // Read and encode image
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mediaType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    // Call BytePlus Vision API
    const response = await axios.post(
      `${BYTEPLUS_CONFIG.apiBaseUrl}/chat/completions`,
      {
        model: model.endpoint,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64Image}`
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${BYTEPLUS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const analysis = response.data.choices[0].message.content;
    
    console.log(`   ✅ Analysis complete (${analysis.length} chars)`);
    
    if (response.data.usage) {
      console.log(`   📊 Tokens used: ${response.data.usage.total_tokens}`);
    }

    return analysis;

  } catch (error) {
    console.error(`   ❌ BytePlus ${model.name} failed:`, error.message);
    
    if (error.response?.status === 401) {
      throw new Error('BytePlus authentication failed. Check API key.');
    }
    
    if (error.response?.status === 404) {
      throw new Error(`Model endpoint not found. Check endpoint ID: ${model.endpoint}`);
    }
    
    if (error.response?.data) {
      console.error(`   📄 Response:`, JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

async function analyzeWithLegacyAPI(imagePath, prompt, modelId = 'seed-1.8') {
  const BYTEPLUS_CSRF_TOKEN = process.env.BYTEPLUS_CSRF_TOKEN;
  const BYTEPLUS_COOKIES = process.env.BYTEPLUS_COOKIES;
  const BYTEPLUS_ACCOUNT_ID = process.env.BYTEPLUS_ACCOUNT_ID;
  
  if (!BYTEPLUS_CSRF_TOKEN || !BYTEPLUS_COOKIES || !BYTEPLUS_ACCOUNT_ID) {
    throw new Error('BytePlus credentials not configured. Please set BYTEPLUS_API_KEY in .env');
  }

  console.log(`   👁️  Analyzing with ByteDance ${modelId} (Legacy API)...`);

  try {
    // Upload image using legacy method
    const imageData = await uploadImageToByteplus(
      imagePath,
      BYTEPLUS_ACCOUNT_ID,
      BYTEPLUS_CSRF_TOKEN,
      BYTEPLUS_COOKIES
    );
    
    // Call vision API
    const response = await axios.post(
      `${BYTEPLUS_CONFIG.consoleApiBaseUrl}/VisionChat`,
      {
        Model: modelId,
        EndpointId: 'seed-1.8-vision',
        Messages: [
          {
            Role: 'user',
            Content: [
              {
                Type: 'text',
                Text: prompt
              },
              {
                Type: 'image_url',
                ImageUrl: {
                  Url: imageData.Url
                }
              }
            ]
          }
        ],
        Temperature: 0.7,
        MaxTokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': BYTEPLUS_CSRF_TOKEN,
          'Cookie': BYTEPLUS_COOKIES
        },
        timeout: 60000
      }
    );
    
    if (response.data.code !== 200) {
      throw new Error(`Seed 1.8 API error: ${response.data.message}`);
    }
    
    const analysis = response.data.data.Choices[0].Message.Content;
    
    console.log(`   ✅ Analysis complete (${analysis.length} chars)`);
    
    return analysis;
    
  } catch (error) {
    console.error(`   ❌ Analysis failed:`, error.message);
    throw error;
  }
}

// ==================== UPLOAD IMAGE TO BYTEPLUS (LEGACY) ====================

async function uploadImageToByteplus(imagePath, accountId, csrfToken, cookies) {
  console.log(`   📤 Uploading image to BytePlus: ${imagePath}`);
  
  try {
    const imageBuffer = await fs.readFile(imagePath);
    const filename = path.basename(imagePath);
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // Step 1: Get upload URL
    const uploadUrlResponse = await axios.post(
      `${BYTEPLUS_CONFIG.consoleApiBaseUrl}/GetUploadUrl`,
      {
        FileName: filename,
        AccountId: accountId,
        Folder: `experience_video/${accountId}/0/${timestamp}`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          'Cookie': cookies
        }
      }
    );
    
    const uploadUrl = uploadUrlResponse.data.data.UploadUrl;
    const objectKey = uploadUrlResponse.data.data.ObjectKey;
    const bucketName = uploadUrlResponse.data.data.BucketName;
    
    console.log(`   ✅ Got upload URL: ${uploadUrl.substring(0, 80)}...`);
    
    // Step 2: Upload image
    await axios.put(uploadUrl, imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });
    
    console.log(`   ✅ Image uploaded successfully`);
    
    // Step 3: Get signed URL
    const signedUrlResponse = await axios.post(
      `${BYTEPLUS_CONFIG.consoleApiBaseUrl}/GetSignedUrl`,
      {
        BucketName: bucketName,
        ObjectKey: objectKey
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          'Cookie': cookies
        }
      }
    );
    
    const signedUrl = signedUrlResponse.data.data.Url;
    
    console.log(`   ✅ Got signed URL`);
    
    return {
      BucketName: bucketName,
      ObjectKey: objectKey,
      Url: signedUrl
    };
    
  } catch (error) {
    console.error(`   ❌ Upload failed:`, error.message);
    throw error;
  }
}

// ==================== GENERATE WITH SEEDREAM ====================

export async function generateWithSeeDream(
  prompt, 
  characterImagePath, 
  modelId = 'seedream-5-0',
  seed = -1,
  ratio = '1:1',
  size = '2048x2048'
) {
  // Try official API first
  if (process.env.BYTEPLUS_API_KEY) {
    return await generateWithOfficialAPI(prompt, characterImagePath, modelId, seed, size);
  }
  
  // Fall back to legacy console API
  return await generateWithLegacyAPI(prompt, characterImagePath, modelId, seed, ratio, size);
}

async function generateWithOfficialAPI(prompt, characterImagePath, modelId = 'seedream-5-0', seed = -1, size = '1024x1024') {
  const BYTEPLUS_API_KEY = process.env.BYTEPLUS_API_KEY;
  
  const model = BYTEPLUS_CONFIG.generationModels[modelId];
  
  if (!model) {
    throw new Error(`Unknown BytePlus generation model: ${modelId}`);
  }

  console.log(`   🎨 Using BytePlus ${model.name} (Official API)...`);
  console.log(`   📏 Prompt length: ${prompt.length}/${model.maxPromptLength} chars`);
  
  if (prompt.length > model.maxPromptLength) {
    console.log(`   ⚠️  Prompt too long, truncating...`);
    prompt = prompt.substring(0, model.maxPromptLength - 100) + '...';
  }

  try {
    // Read and encode reference image if provided
    let imageBase64 = null;
    let mediaType = 'image/jpeg';
    
    if (characterImagePath) {
      console.log(`   📸 Encoding reference image...`);
      const imageBuffer = await fs.readFile(characterImagePath);
      imageBase64 = imageBuffer.toString('base64');
      mediaType = characterImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    }
    
    // Create generation request
    console.log(`   🎨 Creating generation request...`);
    
    const messages = [];
    
    // Add image if available
    if (imageBase64) {
      messages.push({
        type: 'image_url',
        image_url: {
          url: `data:${mediaType};base64,${imageBase64}`
        }
      });
    }
    
    // Add prompt
    messages.push({
      type: 'text',
      text: prompt
    });
    
    const requestBody = {
      model: model.endpoint,
      prompt: prompt,
      size: size,
      n: 1,
      response_format: 'url'
    };
    
    if (seed !== -1) {
      requestBody.seed = seed;
    }
    
    const response = await axios.post(
      `${BYTEPLUS_CONFIG.apiBaseUrl}/images/generations`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${BYTEPLUS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );
    
    if (!response.data.data || response.data.data.length === 0) {
      throw new Error('No image generated');
    }
    
    const imageUrl = response.data.data[0].url;
    console.log(`   ✅ Generation complete`);
    
    // Download image
    console.log(`   📥 Downloading image...`);
    
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    console.log(`   ✅ Downloaded: ${imageResponse.data.byteLength} bytes`);
    
    // Save image
    const filename = `byteplus-${modelId}-${Date.now()}-${seed}.jpg`;
    const filepath = path.join('uploads', 'generated', filename);
    
    await fs.mkdir(path.join('uploads', 'generated'), { recursive: true });
    await fs.writeFile(filepath, imageResponse.data);
    
    console.log(`   💾 Saved to: ${filepath}`);
    
    return {
      url: `/uploads/generated/${filename}`,
      seed: seed,
      format: 'jpg',
      provider: 'byteplus',
      model: model.name,
      supportsImageInput: true
    };
    
  } catch (error) {
    console.error(`   ❌ BytePlus generation failed:`, error.message);
    
    if (error.response?.status === 401) {
      console.error(`   🔐 Authentication failed! Check BytePlus API key`);
    }
    
    if (error.response?.data) {
      console.error(`   📄 Response:`, JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

async function generateWithLegacyAPI(prompt, characterImagePath, modelId = 'seedream-5-0', seed = -1, ratio = '1:1', size = '2048x2048') {
  const BYTEPLUS_CSRF_TOKEN = process.env.BYTEPLUS_CSRF_TOKEN;
  const BYTEPLUS_COOKIES = process.env.BYTEPLUS_COOKIES;
  const BYTEPLUS_ACCOUNT_ID = process.env.BYTEPLUS_ACCOUNT_ID;
  
  if (!BYTEPLUS_CSRF_TOKEN || !BYTEPLUS_COOKIES || !BYTEPLUS_ACCOUNT_ID) {
    throw new Error('BytePlus credentials not configured. Please set BYTEPLUS_API_KEY or legacy credentials in .env');
  }

  const model = BYTEPLUS_CONFIG.generationModels[modelId];
  
  if (!model) {
    throw new Error(`Unknown BytePlus model: ${modelId}`);
  }

  console.log(`   🎨 Using BytePlus ${model.name} (Legacy API)...`);
  console.log(`   📏 Prompt length: ${prompt.length}/${model.maxPromptLength} chars`);
  
  if (prompt.length > model.maxPromptLength) {
    console.log(`   ⚠️  Prompt too long, truncating...`);
    prompt = prompt.substring(0, model.maxPromptLength - 100) + '...';
  }

  try {
    // Step 1: Upload reference image
    let imageData = null;
    
    if (characterImagePath) {
      console.log(`   📸 Uploading reference image...`);
      imageData = await uploadImageToByteplus(
        characterImagePath,
        BYTEPLUS_ACCOUNT_ID,
        BYTEPLUS_CSRF_TOKEN,
        BYTEPLUS_COOKIES
      );
    }
    
    // Step 2: Create generation request
    console.log(`   🎨 Creating generation request...`);
    
    const requestBody = {
      From: 'pc',
      Model: modelId,
      EndpointId: model.endpoint,
      Type: 'group',
      Prompt: prompt,
      Ratio: ratio,
      Size: size,
      Seed: seed,
      Watermark: false,
      OutputFormat: 'jpeg',
      ImageSequence: 1
    };
    
    if (imageData) {
      requestBody.Images = [imageData];
    }
    
    const response = await axios.post(
      `${BYTEPLUS_CONFIG.consoleApiBaseUrl}/CreateImageGeneration`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': BYTEPLUS_CSRF_TOKEN,
          'Cookie': BYTEPLUS_COOKIES
        },
        timeout: 10000
      }
    );
    
    if (response.data.code !== 200) {
      throw new Error(`BytePlus API error: ${response.data.message}`);
    }
    
    const taskId = response.data.data.TaskId;
    console.log(`   🆔 Task ID: ${taskId}`);
    
    // Step 3: Poll for result
    console.log(`   ⏳ Waiting for generation...`);
    
    let attempts = 0;
    const maxAttempts = 60;
    let imageUrl = null;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const statusResponse = await axios.post(
        `${BYTEPLUS_CONFIG.consoleApiBaseUrl}/GetImageGenerationResult`,
        {
          TaskId: taskId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': BYTEPLUS_CSRF_TOKEN,
            'Cookie': BYTEPLUS_COOKIES
          }
        }
      );
      
      if (statusResponse.data.code === 200) {
        const result = statusResponse.data.data;
        
        if (result.Status === 'success' && result.Images && result.Images.length > 0) {
          imageUrl = result.Images[0].Url;
          console.log(`   ✅ Generation complete after ${attempts} seconds`);
          break;
        } else if (result.Status === 'failed') {
          throw new Error(`Generation failed: ${result.Message}`);
        }
      }
      
      if (attempts % 5 === 0) {
        console.log(`   ⏳ Still waiting... (${attempts}/${maxAttempts})`);
      }
    }
    
    if (!imageUrl) {
      throw new Error('Timeout waiting for image generation');
    }
    
    // Step 4: Download image
    console.log(`   📥 Downloading image...`);
    
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    console.log(`   ✅ Downloaded: ${imageResponse.data.byteLength} bytes`);
    
    // Step 5: Save image
    const filename = `byteplus-${modelId}-${Date.now()}-${seed}.jpg`;
    const filepath = path.join('uploads', 'generated', filename);
    
    await fs.mkdir(path.join('uploads', 'generated'), { recursive: true });
    await fs.writeFile(filepath, imageResponse.data);
    
    console.log(`   💾 Saved to: ${filepath}`);
    
    return {
      url: `/uploads/generated/${filename}`,
      seed: seed,
      format: 'jpg',
      provider: 'byteplus',
      model: model.name,
      supportsImageInput: true
    };
    
  } catch (error) {
    console.error(`   ❌ BytePlus generation failed:`, error.message);
    
    if (error.response?.status === 401) {
      console.error(`   🔐 Authentication failed! Please update BytePlus credentials in .env`);
    }
    
    if (error.response?.data) {
      console.error(`   📄 Response:`, JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

// ==================== ANALYZE IMAGE WITH SEED 1.8 ====================

export async function analyzeImageWithSeed18(imagePath, prompt = 'Analyze this image in detail') {
  return await analyzeWithByteplusVision(imagePath, prompt, 'seed-1.8');
}

// ==================== GET AVAILABLE VISION MODELS ====================

export function getByteplusVisionModels() {
  const BYTEPLUS_API_KEY = process.env.BYTEPLUS_API_KEY;
  const BYTEPLUS_CSRF_TOKEN = process.env.BYTEPLUS_CSRF_TOKEN;
  const BYTEPLUS_COOKIES = process.env.BYTEPLUS_COOKIES;
  
  if (!BYTEPLUS_API_KEY && !(BYTEPLUS_CSRF_TOKEN && BYTEPLUS_COOKIES)) {
    return [];
  }
  
  return Object.entries(BYTEPLUS_CONFIG.visionModels).map(([id, model]) => ({
    id: `byteplus-${id}`,
    name: model.name,
    provider: 'byteplus',
    priority: model.priority + 10,
    recommended: model.recommended || false,
    description: model.description
  }));
}

// ==================== GET AVAILABLE GENERATION MODELS ====================

export function getByteplusGenerationModels() {
  const BYTEPLUS_API_KEY = process.env.BYTEPLUS_API_KEY;
  const BYTEPLUS_CSRF_TOKEN = process.env.BYTEPLUS_CSRF_TOKEN;
  const BYTEPLUS_COOKIES = process.env.BYTEPLUS_COOKIES;
  
  if (!BYTEPLUS_API_KEY && !(BYTEPLUS_CSRF_TOKEN && BYTEPLUS_COOKIES)) {
    return [];
  }
  
  return Object.entries(BYTEPLUS_CONFIG.generationModels).map(([id, model]) => ({
    id: `byteplus-${id}`,
    name: model.name,
    provider: 'byteplus',
    category: model.type,
    supportsImageInput: model.supportsImageInput,
    maxPromptLength: model.maxPromptLength
  }));
}

// ==================== CHECK AVAILABILITY ====================

export function isByteplusAvailable() {
  return !!(
    process.env.BYTEPLUS_API_KEY ||
    (process.env.BYTEPLUS_CSRF_TOKEN && process.env.BYTEPLUS_COOKIES && process.env.BYTEPLUS_ACCOUNT_ID)
  );
}

// ==================== GET SETUP INSTRUCTIONS ====================

export function getByteplusSetupInstructions() {
  return `
╔════════════════════════════════════════════════════════════════╗
║                  BYTEPLUS API SETUP GUIDE                    ║
╚════════════════════════════════════════════════════════════════╝

BytePlus provides official API access for vision analysis and image generation.

📝 STEP-BY-STEP INSTRUCTIONS:

1. Go to https://console.byteplus.com/
2. Sign up or login to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key
6. Add to your .env file:

   BYTEPLUS_API_KEY=your_api_key_here

7. Restart your backend server

⚠️  IMPORTANT NOTES:
- Use official API (not browser automation)
- API key format: starts with "sk-"
- Keep API key secure and private
- FREE credits available for new accounts

✅ FEATURES:
- Vision Analysis (Doubao Vision Pro, Doubao Vision Lite, Seed 1.8)
- Image Generation (SeeDream 5.0, SeeDream 4.5)
- Image-to-Image support
- High quality output (up to 2048x2048)
- Official API endpoints

🎨 VISION MODELS:
1. Doubao Vision Pro (Best quality)
2. Doubao Vision Lite (Fast)
3. ByteDance Seed 1.8 (Specialized)

🖼️  GENERATION MODELS:
1. SeeDream 5.0 (Latest)
2. SeeDream 4.5 (Stable)

📚 DOCUMENTATION:
- Vision API: https://docs.byteplus.com/en/docs/ModelArk/1362931
- Image Generation: https://docs.byteplus.com/en/docs/ModelArk/1824121

💡 TIP: Use Doubao Vision Pro for best analysis quality!

═══════════════════════════════════════════════════════════════════

LEGACY SETUP (if you don't have API key):

1. Go to https://www.byteplus.com/en/ai-playground/media
2. Login with your account
3. Open Developer Tools (F12)
4. Go to Network tab
5. Generate an image in the playground
6. Find the "CreateImageGeneration" request
7. Copy from Request Headers:
   - x-csrf-token
   - Cookie (entire string)
8. Copy your Account ID from the request body
9. Add to your .env file:

   BYTEPLUS_CSRF_TOKEN=your_csrf_token_here
   BYTEPLUS_COOKIES=your_cookie_string_here
   BYTEPLUS_ACCOUNT_ID=your_account_id_here
`;
}
