// Smoke test cho pipeline với template support
// Chạy fake: cd backend && SET USE_FAKE_AI=1&& node tests/pipelineSmokeTest.js
// Chạy thật: cd backend && node tests/pipelineSmokeTest.js
//
// Test template flow:
// 1. Get templates từ DB
// 2. Preview template với sample data
// 3. Run vision analysis
// 4. Build prompt từ template
// 5. Generate image

import dotenv from 'dotenv';
dotenv.config();

// Import và kết nối DB FIRST - before any model imports
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildPromptFromTemplate, fillTemplate } from '../services/promptBuilder.js';
import imageGenService from '../services/imageGenService.js';
import videoGenService from '../services/videoGenService.js';
import visionService from '../services/visionService.js';
import PromptTemplate from '../models/PromptTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    // Connect to MongoDB explicitly
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    console.log('\n🔧 Pipeline Smoke Test - Template Flow\n');

    // ===== Step 1: Get Templates =====
    console.log('📋 Step 1: Lấy templates từ DB...');
    const templates = await PromptTemplate.find({ isActive: true, isSystem: true }).lean();
    console.log(`✅ Tìm thấy ${templates.length} templates:`);
    templates.forEach((t) => console.log(`   - ${t.name} (${t.provider})`));

    // ===== Step 2: Test Template Preview =====
    console.log('\n🖊️  Step 2: Test template preview...');
    if (templates.length > 0) {
      const sampleData = {
        description: 'Áo thun trắng basic, quần jeans xanh navy',
        top: { type: 'áo thun', material: 'cotton', color: 'trắng' },
        bottom: { type: 'quần jeans', color: 'xanh navy' },
        scene: 'studio trắng',
        style: 'lookbook',
        durationSeconds: 10,
        motionStyle: 'smooth',
      };

      const template = templates[0];
      const filledPrompt = fillTemplate(template.content, sampleData);
      console.log('✅ Template preview (Fashion Lookbook):');
      console.log(filledPrompt.substring(0, 200) + '...\n');
    }

    // ===== Step 3: Vision Analysis (nếu có ảnh) =====
    console.log('📸 Step 3: Test vision analysis...');
    const testImagePath = path.join(__dirname, 'test-product.jpg');
    let analysis;

    if (fs.existsSync(testImagePath) && process.env.USE_FAKE_AI !== '1') {
      const imageBuffer = fs.readFileSync(testImagePath);
      const imageBase64 = imageBuffer.toString('base64');
      analysis = await visionService.analyzeProductImage({
        imageBase64,
        mimeType: 'image/jpeg',
        provider: 'gemini',
      });
      console.log('✅ Gemini Analysis:\n', JSON.stringify(analysis, null, 2), '\n');
    } else {
      analysis = {
        description: 'Áo thun trắng basic, quần jeans xanh navy, giày thể thao trắng.',
        top: { type: 'áo thun', material: 'cotton', color: 'trắng', pattern: 'trơn' },
        bottom: { type: 'quần jeans', material: 'denim', color: 'xanh navy' },
        shoes: { type: 'sneaker', color: 'trắng' },
      };
      console.log('✅ Fake Analysis (USE_FAKE_AI=1):\n', JSON.stringify(analysis, null, 2), '\n');
    }

    // ===== Step 4: Generate Image =====
    console.log('🖼️  Step 4: Test generate image...');
    const imagePrompt = fillTemplate(templates[0].content, { ...analysis, scene: 'studio trắng', style: 'lookbook' });
    console.log('📝 Image Prompt:\n', imagePrompt.substring(0, 150) + '...\n');

    const imageResult = await imageGenService.generateImage({
      prompt: imagePrompt,
      provider: 'flow-fake',
      referenceImages: [],
    });
    console.log('✅ Image Result URL:', imageResult.url, '\n');

    // ===== Step 5: Generate Video =====
    console.log('🎬 Step 5: Test generate video...');
    const videoTemplate = templates.find((t) => t.type === 'video') || templates[0];
    const videoPrompt = fillTemplate(videoTemplate.content, {
      ...analysis,
      scene: 'dance studio',
      motionStyle: 'lookbook',
      durationSeconds: 10,
    });
    console.log('📝 Video Prompt:\n', videoPrompt.substring(0, 150) + '...\n');

    const videoResult = await videoGenService.generateVideo({
      prompt: videoPrompt,
      provider: 'video-fake',
      referenceImages: [imageResult.url],
    });
    console.log('✅ Video Result URL:', videoResult.url, '\n');

    console.log('✅ Pipeline smoke test OK!\n');

    // Disconnect
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  } catch (error) {
    console.error('❌ Pipeline test error:', error);
    process.exit(1);
  }
}

run();
