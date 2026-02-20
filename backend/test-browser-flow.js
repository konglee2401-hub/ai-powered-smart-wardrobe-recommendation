import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function testBrowserAutomationFlow() {
  console.log('🧪 Testing Browser Automation Flow\n');

  try {
    // 1. Prepare test images
    const characterImagePath = path.resolve('./test-images/anh-nhan-vat.jpeg');
    const productImagePath = path.resolve('./test-images/anh-san-pham.png');

    if (!fs.existsSync(characterImagePath)) {
      console.error(`❌ Character image not found at: ${characterImagePath}`);
      return;
    }

    if (!fs.existsSync(productImagePath)) {
      console.error(`❌ Product image not found at: ${productImagePath}`);
      return;
    }

    console.log('✅ Test images found');
    console.log(`   - Character: ${characterImagePath}`);
    console.log(`   - Product: ${productImagePath}\n`);

    // 2. Create form data
    const formData = new FormData();
    formData.append('characterImage', fs.createReadStream(characterImagePath));
    formData.append('productImage', fs.createReadStream(productImagePath));
    formData.append('prompt', 'Create a professional fashion image of the character wearing the clothing');
    formData.append('negativePrompt', 'blurry, distorted, watermark');
    formData.append('analysisProvider', 'grok.com');
    formData.append('imageGenProvider', 'image.z.ai');

    // 3. Call API
    console.log('📤 Sending request to /browser-automation/generate-image...');
    const response = await axios.post(
      `${API_BASE_URL}/browser-automation/generate-image`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 300000, // 5 minutes
      }
    );

    console.log('\n✅ SUCCESS! Response received:\n');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.data?.images?.length > 0) {
      console.log('\n🎉 Image Generated Successfully!');
      console.log(`   URL: ${response.data.data.images[0].url}`);
      console.log(`   Path: ${response.data.data.images[0].path}`);
    }

    if (response.data.data?.analysis) {
      console.log(`\n📝 Analysis:\n${response.data.data.analysis}`);
    }

  } catch (error) {
    console.error('\n❌ ERROR:\n');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('Cannot connect to server. Is it running on port 5000?');
    } else {
      console.error(error.message);
    }
  }
}

testBrowserAutomationFlow();
