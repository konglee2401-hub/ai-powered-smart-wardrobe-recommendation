import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadImageToCloud, getUploadStats, displayUploadConfig } from './services/imageUploadService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testImageUpload() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 IMAGE UPLOAD SERVICE TEST');
  console.log('='.repeat(80) + '\n');

  // Display configuration
  displayUploadConfig();

  // Find test image
  const possiblePaths = [
    path.join(__dirname, '../../test-images', 'anh-nhan-vat.jpeg'),
    path.join(__dirname, '../../test-images', 'anh-san-pham.png'),
    path.join(__dirname, 'temp', 'test-image.jpg')
  ];

  let testImagePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      testImagePath = p;
      break;
    }
  }

  if (!testImagePath) {
    console.log('❌ No test image found at:');
    possiblePaths.forEach(p => console.log(`   - ${p}`));
    process.exit(1);
  }

  console.log(`✅ Test image: ${path.relative(__dirname, testImagePath)}`);
  
  const stats = fs.statSync(testImagePath);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('');

  // Test upload
  try {
    const result = await uploadImageToCloud(testImagePath, {
      name: 'test-upload',
      folder: 'test'
    });

    console.log('✅ UPLOAD SUCCESSFUL\n');
    console.log('📋 Upload Details:');
    console.log(`   Provider: ${result.provider}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Size: ${result.size ? (result.size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
    console.log(`   Dimensions: ${result.width}x${result.height}`);
    console.log(`   Duration: ${result.uploadDuration}s`);
    console.log(`   Key used: ${result.keyUsed}`);
    console.log('');

    // Display final stats
    const finalStats = getUploadStats();
    console.log('📊 FINAL STATISTICS');
    console.log('='.repeat(80));
    finalStats.providers.forEach(p => {
      if (p.available && p.totalKeys) {
        console.log(`${p.name}: ${p.availableKeys}/${p.totalKeys} keys available`);
      }
    });
    console.log('='.repeat(80) + '\n');

    console.log('✅ TEST PASSED\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ UPLOAD FAILED');
    console.error(`Error: ${error.message}\n`);
    
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('1. Check that you have at least one provider configured in .env');
    console.log('2. Verify API keys are correct');
    console.log('3. Check internet connection');
    console.log('4. Try different provider\n');
    
    process.exit(1);
  }
}

testImageUpload();
