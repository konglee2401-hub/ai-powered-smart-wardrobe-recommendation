import dotenv from 'dotenv';
import googleGeminiService from './services/googleGeminiService.js';
import fireworksVisionService from './services/fireworksVisionService.js';
import * as byteplusService from './services/byteplusService.js';

dotenv.config();

console.log('\n' + '='.repeat(80));
console.log('📊 LIST ALL AVAILABLE AI MODELS');
console.log('='.repeat(80) + '\n');

async function listAllModels() {
  const allModels = [];

  // 1. Google Gemini Models
  console.log('🔍 Checking Google Gemini models...');
  try {
    const geminiModels = await googleGeminiService.getAvailableGeminiModels();
    console.log(`   Found ${geminiModels.length} Gemini models`);
    
    geminiModels.forEach(m => {
      allModels.push({
        provider: 'Google',
        name: m.name,
        id: m.id,
        type: 'Vision + Text',
        free: m.free || false,
        available: true
      });
    });
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
  }

  // 2. Fireworks Vision Models
  console.log('\n🔍 Checking Fireworks Vision models...');
  try {
    const fireworksModels = await fireworksVisionService.getAvailableFireworksModels();
    console.log(`   Found ${fireworksModels.length} Fireworks models`);
    
    fireworksModels.forEach(m => {
      allModels.push({
        provider: 'Fireworks',
        name: m.name,
        id: m.id,
        type: m.type || 'Vision',
        free: false,
        available: true
      });
    });
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
  }

  // 3. BytePlus Models
  console.log('\n🔍 Checking BytePlus models...');
  try {
    const byteplusModels = await byteplusService.getAvailableModels();
    console.log(`   Found ${byteplusModels.length} BytePlus models`);
    
    byteplusModels.forEach(m => {
      allModels.push({
        provider: 'BytePlus',
        name: m.name,
        id: m.id,
        type: m.type || 'Vision',
        free: false,
        available: true
      });
    });
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
  }

  // 4. Anthropic Models (static)
  console.log('\n🔍 Checking Anthropic models...');
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  console.log(`   ${hasAnthropic ? '✅' : '❌'} API key ${hasAnthropic ? 'configured' : 'not found'}`);
  
  if (hasAnthropic) {
    allModels.push(
      { provider: 'Anthropic', name: 'Claude 3.5 Sonnet', id: 'claude-3-5-sonnet-20241022', type: 'Vision + Text', free: false, available: true },
      { provider: 'Anthropic', name: 'Claude 3 Opus', id: 'claude-3-opus-20240229', type: 'Vision + Text', free: false, available: true },
      { provider: 'Anthropic', name: 'Claude 3 Haiku', id: 'claude-3-haiku-20240307', type: 'Vision + Text', free: false, available: true }
    );
    console.log('   Added 3 models');
  }

  // 5. OpenAI Models (static)
  console.log('\n🔍 Checking OpenAI models...');
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  console.log(`   ${hasOpenAI ? '✅' : '❌'} API key ${hasOpenAI ? 'configured' : 'not found'}`);
  
  if (hasOpenAI) {
    allModels.push(
      { provider: 'OpenAI', name: 'GPT-4o', id: 'gpt-4o', type: 'Vision + Text', free: false, available: true },
      { provider: 'OpenAI', name: 'GPT-4 Turbo', id: 'gpt-4-turbo', type: 'Vision + Text', free: false, available: true },
      { provider: 'OpenAI', name: 'GPT-4 Vision', id: 'gpt-4-vision-preview', type: 'Vision', free: false, available: true }
    );
    console.log('   Added 3 models');
  }

  // 6. Z.AI Chat (static)
  console.log('\n🔍 Checking Z.AI Chat...');
  const hasZAI = !!process.env.ZAI_SESSION;
  console.log(`   ${hasZAI ? '✅' : '❌'} Session ${hasZAI ? 'configured' : 'not found'}`);
  
  if (hasZAI) {
    allModels.push(
      { provider: 'Z.AI', name: 'Z.AI Chat (LLaVA)', id: 'zai-llava-1.6', type: 'Vision + Text', free: true, available: true }
    );
    console.log('   Added 1 model');
  }

  // 7. Grok (static)
  console.log('\n🔍 Checking Grok (xAI)...');
  const hasGrok = !!(process.env.GROK_SSO || process.env.GROK_USER_ID);
  console.log(`   ${hasGrok ? '✅' : '❌'} Credentials ${hasGrok ? 'configured' : 'not found'}`);
  
  if (hasGrok) {
    allModels.push(
      { provider: 'xAI', name: 'Grok-3', id: 'grok-3', type: 'Vision + Text', free: false, available: true },
      { provider: 'xAI', name: 'Grok-2 Vision', id: 'grok-2-vision', type: 'Vision', free: false, available: true }
    );
    console.log('   Added 2 models');
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 MODEL SUMMARY');
  console.log('='.repeat(80));
  
  const byProvider = {};
  allModels.forEach(m => {
    if (!byProvider[m.provider]) byProvider[m.provider] = 0;
    byProvider[m.provider]++;
  });

  console.log('\nBy Provider:');
  Object.entries(byProvider).forEach(([provider, count]) => {
    console.log(`   ${provider}: ${count}`);
  });

  const freeModels = allModels.filter(m => m.free);
  const paidModels = allModels.filter(m => !m.free);
  
  console.log(`\n📊 Total: ${allModels.length} models`);
  console.log(`   🆓 Free: ${freeModels.length}`);
  console.log(`   💰 Paid: ${paidModels.length}`);

  // Detailed list
  console.log('\n' + '='.repeat(80));
  console.log('📋 DETAILED MODEL LIST');
  console.log('='.repeat(80) + '\n');

  allModels.sort((a, b) => a.provider.localeCompare(b.provider));
  
  let idx = 1;
  allModels.forEach(m => {
    const badge = m.free ? '🆓' : '💰';
    console.log(`${idx}. ${badge} ${m.name}`);
    console.log(`   Provider: ${m.provider}`);
    console.log(`   ID: ${m.id}`);
    console.log(`   Type: ${m.type}`);
    console.log('');
    idx++;
  });

  console.log('='.repeat(80) + '\n');
}

listAllModels().catch(console.error);
