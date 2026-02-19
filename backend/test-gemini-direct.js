import { analyzeUnified } from './services/unifiedAnalysisService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { syncModelsWithDB } from './scripts/modelSync.js';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') }); 

async function testGeminiDeepAnalysis() {
  try {
    console.log('🔌 Connecting to DB...');
    await connectDB();
    
    console.log('🔄 Syncing models...');
    await syncModelsWithDB();

    console.log('🧪 Starting Gemini DEEP Analysis Test...');
    
    // Ensure test images exist
    const charPath = path.join(__dirname, 'test-images/anh nhan vat.jpeg');
    const prodPath = path.join(__dirname, 'test-images/anh-san-pham.png');

    if (!fs.existsSync(charPath) || !fs.existsSync(prodPath)) {
        console.error('❌ Test images missing in backend/test-images/');
        process.exit(1);
    }

    console.log(`   👤 Character: ${charPath}`);
    console.log(`   👗 Product: ${prodPath}`);

    const result = await analyzeUnified(charPath, prodPath, {
      useCase: 'change-clothes',
      productFocus: 'full-outfit'
    });

    if (result.success) {
      console.log('\n✅ ANALYSIS SUCCESSFUL');
      console.log('---------------------------------------------------');
      console.log(`Provider: ${result.metadata.provider}`);
      console.log(`Model: ${result.metadata.model}`);
      
      const data = result.data;
      
      console.log('\n🔍 VERIFYING DEEP EXTRACTION FIELDS:');
      
      let passed = true;
      const verify = (label, value, condition = true) => {
          const isPresent = value && value !== 'unknown' && value !== 'N/A';
          const isValid = isPresent && condition;
          console.log(`- ${label.padEnd(25)}: ${isValid ? '✅ ' + (typeof value === 'object' ? JSON.stringify(value) : value) : '❌ MISSING/INVALID'}`);
          if (!isValid) passed = false;
      };

      // 1. Verify Character Details
      console.log('\n   👤 Character Details:');
      verify('Gender', data.character?.gender);
      verify('Age Range', data.character?.age);
      verify('Body Type', data.character?.bodyType);
      verify('Skin Tone', data.character?.skinTone);
      verify('Hair Color', data.character?.hair?.color);
      
      // 2. Verify Product Details
      console.log('\n   👗 Product Details:');
      verify('Category', data.product?.category);
      verify('Type', data.product?.type);
      
      // strict check for detailed description length
      const desc = data.product?.detailedDescription || '';
      verify('Detailed Description', desc.substring(0, 50) + '...', desc.length > 50);
      
      verify('Technical Details', data.product?.technicalDetails, !!data.product?.technicalDetails);
      if (data.product?.technicalDetails) {
          verify('  > Fabric', data.product.technicalDetails.fabric);
          verify('  > Fit', data.product.technicalDetails.fit);
          verify('  > Neckline', data.product.technicalDetails.neckline);
      }

      // 3. Verify Styling & Compatibility
      console.log('\n   ✨ Styling & Compatibility:');
      verify('Compatibility Score', data.compatibility?.score);
      verify('Styling Notes', data.stylingNotes, !!data.stylingNotes);

      console.log('---------------------------------------------------');

      if (passed) {
          console.log('\n🎉 TEST PASSED: All deep analysis fields extracted correctly!');
      } else {
          console.log('\n⚠️  TEST PASSED (Technically) BUT DATA QUALITY CHECK FAILED.');
          console.log('    See ❌ marks above for missing fields.');
      }

    } else {
      console.error('\n❌ TEST FAILED: Analysis failed.');
      console.error('Error:', result.error);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error);
    process.exit(1);
  }
}

testGeminiDeepAnalysis();
