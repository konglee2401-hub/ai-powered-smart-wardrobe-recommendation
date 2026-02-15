import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';

/**
 * Fireworks AI Models
 */
const FIREWORKS_MODELS = {
  'fireworks-playground-v2.5': {
    id: 'accounts/fireworks/models/playground-v2-5-1024px-aesthetic',
    name: 'Playground v2.5',
    type: 'image_to_image'
  },
  'fireworks-flux-kontext': {
    id: 'accounts/fireworks/models/flux-1-kontext-max',
    name: 'FLUX.1 Kontext Max',
    type: 'image_to_image'
  },
  'fireworks-sdxl': {
    id: 'accounts/fireworks/models/stable-diffusion-xl-1024-v1-0',
    name: 'Stable Diffusion XL',
    type: 'image_to_image'
  }
};

/**
 * Generate image using Fireworks AI
 */
export async function generateWithFireworks(prompt, seed, characterImagePath, modelKey = 'fireworks-playground-v2.5') {
  const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;
  
  if (!FIREWORKS_API_KEY) {
    throw new Error('Fireworks API key not configured');
  }

  const model = FIREWORKS_MODELS[modelKey];
  
  if (!model) {
    throw new Error(`Unknown Fireworks model: ${modelKey}`);
  }

  console.log(`   🔥 Using Fireworks ${model.name}...`);
  console.log(`   📡 Model: ${model.id}`);
  console.log(`   🔑 API Key: ${FIREWORKS_API_KEY.substring(0, 10)}...`);
  console.log(`   🎨 Seed: ${seed}`);

  try {
    // Read character image
    const imageBuffer = await fs.readFile(characterImagePath);
    
    // Create form data
    const formData = new FormData();
    formData.append('init_image', imageBuffer, {
      filename: path.basename(characterImagePath),
      contentType: 'image/jpeg'
    });
    formData.append('prompt', prompt);
    formData.append('init_image_mode', 'IMAGE_STRENGTH');
    formData.append('image_strength', '0.5');
    formData.append('cfg_scale', '7');
    formData.append('seed', seed.toString());
    formData.append('steps', '30');
    formData.append('safety_check', 'true');
    
    console.log(`   📤 Sending request to Fireworks...`);
    
    const response = await axios.post(
      `https://api.fireworks.ai/inference/v1/image_generation/${model.id}/image_to_image`,
      formData,
      {
        headers: {
          'Accept': 'image/jpeg',
          'Authorization': `Bearer ${FIREWORKS_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer',
        timeout: 120000
      }
    );

    console.log(`   ✅ Image generated successfully`);
    console.log(`   📦 Response size: ${response.data.byteLength} bytes`);

    // Save image
    const filename = `fireworks-${modelKey}-${Date.now()}-${seed}.jpg`;
    const filepath = path.join('uploads', 'generated', filename);
    
    await fs.mkdir(path.join('uploads', 'generated'), { recursive: true });
    await fs.writeFile(filepath, response.data);

    console.log(`   💾 Saved to: ${filepath}`);

    return {
      url: `/uploads/generated/${filename}`,
      seed: seed,
      format: 'jpg',
      provider: 'fireworks',
      model: model.name
    };

  } catch (error) {
    console.error(`   ❌ Fireworks generation failed:`, error.message);
    
    if (error.response?.status) {
      console.error(`   📄 Status: ${error.response.status}`);
    }
    
    if (error.response?.data) {
      const errorText = Buffer.from(error.response.data).toString('utf-8');
      console.error(`   📄 Error: ${errorText.substring(0, 200)}`);
    }
    
    throw error;
  }
}

/**
 * Check if Fireworks API is available
 */
export async function isFireworksAvailable() {
  const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;
  return !!FIREWORKS_API_KEY;
}
