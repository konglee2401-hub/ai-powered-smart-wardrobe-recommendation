#!/usr/bin/env node
/**
 * Test ChatGPT Analysis Only - Focus on Quality
 * Shows the full analysis output from ChatGPT
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE = 'http://localhost:5001/api/flows';
const TEST_CHAR = path.join(__dirname, '../../test-images/anh-nhan-vat.jpeg');
const TEST_PROD = path.join(__dirname, '../../test-images/anh-san-pham.png');

async function testChatGPTAnalysis() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 ChatGPT ANALYSIS TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const form = new FormData();
    form.append('characterImage', fs.createReadStream(TEST_CHAR));
    form.append('productImage', fs.createReadStream(TEST_PROD));
    form.append('useCase', 'change-clothes');
    form.append('productFocus', 'full-outfit');
    form.append('analysisProvider', 'chatgpt-browser');
    form.append('scene', 'studio');
    form.append('lighting', 'soft-diffused');
    form.append('mood', 'confident');
    form.append('style', 'minimalist');
    form.append('colorPalette', 'neutral');
    form.append('cameraAngle', 'eye-level');
    form.append('aspectRatio', '16:9');

    console.log('⏳ Requesting ChatGPT analysis... this will take 30-60 seconds\n');
    const startTime = Date.now();

    const response = await axios.post(`${API_BASE}/analyze`, form, {
      headers: form.getHeaders(),
      timeout: 300000
    });

    const duration = (Date.now() - startTime) / 1000;

    if (!response.data.success && !response.data.data) {
      throw new Error('Invalid response');
    }

    const analysisData = response.data.data || response.data;
    
    console.log(`✅ Analysis completed in ${duration.toFixed(2)} seconds\n`);
    
    console.log('📊 CHARACTER PROFILE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const char = analysisData.analysis?.character || {};
    console.log(`  Gender: ${char.gender || 'N/A'}`);
    console.log(`  Body Type: ${char.bodyType || 'N/A'}`);
    console.log(`  Skin Tone: ${char.skinTone || 'N/A'}`);
    console.log(`  Hair Style: ${char.hairStyle || 'N/A'}`);
    console.log(`  Face Shape: ${char.faceShape || 'N/A'}`);

    console.log('\n👗 PRODUCT DETAILS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const prod = analysisData.analysis?.product || {};
    console.log(`  Type: ${prod.garmentType || 'N/A'}`);
    console.log(`  Style: ${prod.styleCategory || 'N/A'}`);
    console.log(`  Color: ${prod.primaryColor || 'N/A'}`);
    console.log(`  Pattern: ${prod.pattern || 'N/A'}`);
    console.log(`  Details: ${prod.keyDetails || 'N/A'}`);

    console.log('\n⭐ COMPATIBILITY & RECOMMENDATIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const compat = analysisData.analysis?.compatibility || {};
    console.log(`  Fit: ${compat.fit || 'N/A'}`);
    console.log(`  Color Harmony: ${compat.colorHarmony || 'N/A'}`);
    console.log(`  Style Match: ${compat.styleMatch || 'N/A'}`);

    console.log('\n📝 STYLING NOTES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const notes = analysisData.analysis?.stylingNotes || {};
    console.log(`  Pose: ${notes.pose || 'N/A'}`);
    console.log(`  Camera Angle: ${notes.cameraAngle || 'N/A'}`);
    console.log(`  Lighting Tips: ${notes.lighting || 'N/A'}`);
    console.log(`  Accessories: ${notes.accessories || 'N/A'}`);

    console.log('\n💡 FULL ANALYSIS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(analysisData.analysis, null, 2).substring(0, 1500));
    
    console.log('\n\n✅ SUCCESS: ChatGPT completed full 1-Click analysis!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data).substring(0, 500));
    }
    if (error.config?.url) {
      console.error('URL:', error.config.url);
    }
    process.exit(1);
  }
}

testChatGPTAnalysis();
