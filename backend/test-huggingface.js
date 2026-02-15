import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

const MODELS_TO_TEST = [
  // Using router.huggingface.co for all models
  { id: 'black-forest-labs/FLUX.1-schnell', steps: 4, guidance: 0, name: 'FLUX.1 Schnell' },
  { id: 'stabilityai/stable-diffusion-xl-base-1.0', steps: 20, guidance: 7.5, name: 'SDXL Base' },
  { id: 'runwayml/stable-diffusion-v1-5', steps: 25, guidance: 7.5, name: 'SD 1.5' },
  { id: 'stabilityai/stable-diffusion-2-1-base', steps: 25, guidance: 7.5, name: 'SD 2.1 Base' },
  { id: 'Lykon/DreamShaper', steps: 25, guidance: 7, name: 'DreamShaper' },
];

const TEST_PROMPT = 'A young Vietnamese woman wearing elegant black fashion outfit, studio lighting, professional photography';

async function testModel(model) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TESTING: ${model.name}`);
  console.log(`📦 Model ID: ${model.id}`);
  console.log('='.repeat(80));
  console.log(`📡 URL: https://router.huggingface.co/hf-inference/models/${model.id}`);
  console.log(`🔑 Key: ${HF_API_KEY.substring(0, 10)}...`);
  console.log(`⚙️  Steps: ${model.steps}, Guidance: ${model.guidance}`);
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(
      `https://router.huggingface.co/hf-inference/models/${model.id}`,
      {
        inputs: TEST_PROMPT,
        parameters: {
          num_inference_steps: model.steps,
          guidance_scale: model.guidance,
          width: 512,
          height: 512,
          seed: 42
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'image/png',
          'x-use-cache': 'false'
        },
        responseType: 'arraybuffer',
        timeout: 180000
      }
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const size = response.data.byteLength;
    
    console.log(`✅ SUCCESS in ${duration}s`);
    console.log(`📦 Size: ${size} bytes`);
    
    // Save test image
    const filename = `test-${model.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    const filepath = path.join('uploads', 'test', filename);
    await fs.mkdir(path.join('uploads', 'test'), { recursive: true });
    await fs.writeFile(filepath, response.data);
    console.log(`💾 Saved: ${filepath}`);
    
    return { success: true, duration, size, model: model.name, id: model.id };
    
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    
    if (error.response?.status) {
      console.log(`📄 Status: ${error.response.status}`);
    }
    
    if (error.response?.data) {
      const errorText = Buffer.from(error.response.data).toString('utf-8');
      console.log(`📄 Error: ${errorText.substring(0, 300)}`);
    }
    
    return { success: false, error: error.message, model: model.name, id: model.id };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 HUGGING FACE MODEL TESTING (Using router.huggingface.co)');
  console.log('='.repeat(80));
  console.log(`Testing ${MODELS_TO_TEST.length} models...`);
  
  const results = [];
  
  for (const model of MODELS_TO_TEST) {
    const result = await testModel(model);
    results.push(result);
    
    // Wait 3 seconds between tests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Working Models:');
    successful.forEach(r => {
      console.log(`   • ${r.model} (${r.duration}s, ${r.size} bytes)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Models:');
    failed.forEach(r => {
      console.log(`   • ${r.model}: ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
}

runTests().catch(console.error);
