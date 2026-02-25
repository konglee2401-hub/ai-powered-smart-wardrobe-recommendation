/**
 * Test Prompt Template System Integration
 * Verifies that templates are seeded and can be rendered properly
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n🧪 Testing Prompt Template System\n');
  console.log(`API Base: ${API_BASE}\n`);

  try {
    // Test 1: Fetch all templates
    console.log('📋 Test 1: Fetching all templates...');
    const templatesRes = await axios.get(`${API_BASE}/api/prompt-templates`);
    let templates = templatesRes.data;
    
    // Handle both direct array and wrapped response
    if (templates && typeof templates === 'object' && !Array.isArray(templates)) {
      templates = templates.data || templates.templates || [];
    }
    
    if (!Array.isArray(templates)) {
      console.log('   Response:', JSON.stringify(templates, null, 2));
      throw new Error('Invalid template response format');
    }
    
    console.log(`✅ Found ${templates.length} templates`);
    templates.forEach(t => console.log(`   - ${t.name} (${t.useCase})`));

    if (templates.length === 0) {
      console.error('❌ No templates found. Please run: npm run seed:templates');
      process.exit(1);
    }

    // Test 2: Fetch templates by use case (image-generation)
    console.log('\n🔍 Test 2: Fetching image-generation templates...');
    const imageTemplatesRes = await axios.get(`${API_BASE}/api/prompt-templates/usecase/image-generation`);
    let imageTemplates = imageTemplatesRes.data;
    if (imageTemplates && typeof imageTemplates === 'object' && !Array.isArray(imageTemplates)) {
      imageTemplates = imageTemplates.data || imageTemplates.templates || [];
    }
    console.log(`✅ Found ${(imageTemplates || []).length} image templates`);

    // Test 3: Fetch templates by use case (video-generation)
    console.log('\n🔍 Test 3: Fetching video-generation templates...');
    const videoTemplatesRes = await axios.get(`${API_BASE}/api/prompt-templates/usecase/video-generation`);
    let videoTemplates = videoTemplatesRes.data;
    if (videoTemplates && typeof videoTemplates === 'object' && !Array.isArray(videoTemplates)) {
      videoTemplates = videoTemplates.data || videoTemplates.templates || [];
    }
    console.log(`✅ Found ${(videoTemplates || []).length} video templates`);

    // Test 4: Get template by ID and render it
    if (templates.length > 0) {
      const template = templates[0];
      console.log(`\n🎨 Test 4: Rendering template "${template.name}"...`);
      
      const fieldValues = {};
      if (template.fields && Array.isArray(template.fields)) {
        template.fields.forEach(field => {
          fieldValues[field.id] = field.defaultValue || 'test-value';
        });
      }

      const renderRes = await axios.post(
        `${API_BASE}/api/prompt-templates/${template._id}/render`,
        { fieldValues }
      );

      let renderedPrompt = renderRes.data?.renderedPrompt || renderRes.data?.data?.renderedPrompt || renderRes.data;
      if (typeof renderedPrompt === 'object') {
        renderedPrompt = JSON.stringify(renderedPrompt);
      }
      
      console.log(`✅ Template rendered successfully`);
      console.log(`   Length: ${String(renderedPrompt).length} characters`);
      console.log(`   Preview: ${String(renderedPrompt).substring(0, 100)}...`);
    }

    // Test 5: Get core templates
    console.log('\n⭐ Test 5: Fetching core templates...');
    const coreRes = await axios.get(`${API_BASE}/api/prompt-templates/core`);
    const coreTemplates = coreRes.data;
    console.log(`✅ Found ${coreTemplates.length} core templates`);

    // Test 6: Check template by page
    console.log('\n📄 Test 6: Fetching templates by page (image-generation)...');
    const pageTemplatesRes = await axios.get(`${API_BASE}/api/prompt-templates/page/image-generation`);
    const pageTemplates = pageTemplatesRes.data;
    console.log(`✅ Found ${pageTemplates.length} templates for image-generation page`);

    console.log('\n✨ All tests passed! Template system is working correctly.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

runTests();
