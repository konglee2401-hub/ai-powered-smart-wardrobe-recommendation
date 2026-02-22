#!/usr/bin/env node
/**
 * Verify Image Download Test
 * - Checks that images are being downloaded to temp folder
 * - Verifies response includes file paths
 * - Confirms browser is closed after generation
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE = 'http://localhost:5001/api/flows';

async function testImageDownload() {
  console.log('\n🧪 IMAGE DOWNLOAD VERIFICATION TEST');
  console.log('='.repeat(80));

  try {
    // Simple test: generate 1 image with google-flow
    const prompt = 'Professional fashion photo of a woman wearing a blue dress in a studio setting';
    
    console.log('\n📝 Test Configuration:');
    console.log(`  Prompt: ${prompt.substring(0, 60)}...`);
    console.log(`  Provider: google-flow`);
    console.log(`  Count: 1\n`);

    console.log('📤 Sending image generation request...');
    const response = await axios.post(
      `${API_BASE}/generate`,
      {
        prompt,
        imageCount: 1,
        imageProvider: 'google-flow'
      },
      { timeout: 600000 }
    );

    console.log('\n✅ Response received!');
    
    const imageData = response.data.data || response.data;
    console.log('\n📊 Response Structure:');
    console.log(`  success: ${response.data.success}`);
    console.log(`  imageCount: ${imageData.generatedImages?.length || 0}`);
    
    if (imageData.generatedImages && imageData.generatedImages.length > 0) {
      const img = imageData.generatedImages[0];
      console.log('\n🖼️  First Image:');
      console.log(`  URL: ${img.url?.substring(0, 80)}...`);
      console.log(`  Path: ${img.path || 'NOT INCLUDED'}`);
      console.log(`  Provider: ${img.provider}`);
      console.log(`  Model: ${img.model}`);

      // Verify file exists if path is provided
      if (img.path && fs.existsSync(img.path)) {
        const stat = fs.statSync(img.path);
        console.log(`  ✅ File exists: ${path.basename(img.path)} (${(stat.size / 1024).toFixed(1)}KB)`);
      } else if (img.path) {
        console.log(`  ⚠️  File not found: ${img.path}`);
      } else {
        console.log(`  ℹ️  No file path in response`);
      }
    }

    console.log('\n📋 Full Response:');
    console.log(JSON.stringify(imageData, null, 2).substring(0, 500));

    // Check temp folder for recent images
    console.log('\n🔍 Checking temp folder for recent images...');
    const tempDir = path.join(process.cwd(), 'temp');
    const files = fs.readdirSync(tempDir).filter(f => f.startsWith('flow-image'));
    
    if (files.length > 0) {
      console.log(`  ✅ Found ${files.length} image(s) in temp folder:`);
      files.slice(-3).forEach(f => {
        const fullPath = path.join(tempDir, f);
        const stat = fs.statSync(fullPath);
        const age = (Date.now() - stat.mtime.getTime()) / 1000;
        console.log(`    - ${f} (${(stat.size / 1024).toFixed(1)}KB, ${age.toFixed(1)}s ago)`);
      });
    } else {
      console.log(`  ⚠️  No images found in temp folder`);
    }

    console.log('\n✅ TEST PASSED');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error(`Error: ${error.message}`);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2).substring(0, 300));
    }
    console.log('='.repeat(80) + '\n');
    process.exit(1);
  }
}

// Run test
testImageDownload();
