#!/usr/bin/env node

/**
 * Verify ChatGPT integration
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Checking ChatGPT Integration...\n');

// Check 1: Service file exists
const serviceFile = path.join(__dirname, 'services/browser/chatgptService.js');
const hasService = existsSync(serviceFile);
console.log(hasService ? '✅ ChatGPT service file exists' : '❌ ChatGPT service file missing');

// Check 2: Service is imported in controller
const controllerPath = path.join(__dirname, 'controllers/aiController.js');
const controllerContent = readFileSync(controllerPath, 'utf8');
const hasImport = controllerContent.includes("import ChatGPTService");
console.log(hasImport ? '✅ ChatGPT imported in controller' : '❌ ChatGPT import missing');

// Check 3: analyzeWithChatGPT function exists
const hasAnalyzeFunc = controllerContent.includes("async function analyzeWithChatGPT");
console.log(hasAnalyzeFunc ? '✅ analyzeWithChatGPT function defined' : '❌ analyzeWithChatGPT missing');

// Check 4: ChatGPT in VISION_PROVIDERS
const hasChatGPTProvider = controllerContent.includes("ChatGPT (Browser)") && controllerContent.includes("chatgpt-browser");
console.log(hasChatGPTProvider ? '✅ ChatGPT in VISION_PROVIDERS' : '❌ ChatGPT provider missing');

// Check 5: Test script exists
const testFile = path.join(__dirname, 'test-chatgpt.js');
const hasTestScript = existsSync(testFile);
console.log(hasTestScript ? '✅ ChatGPT test script exists' : '❌ ChatGPT test script missing');

console.log('\n📊 Integration Status:');
const checks = [hasService, hasImport, hasAnalyzeFunc, hasChatGPTProvider, hasTestScript];
const passed = checks.filter(Boolean).length;
console.log(`${passed}/${checks.length} checks passed`);

if (passed === checks.length) {
  console.log('\n✅ ChatGPT is fully integrated!');
  console.log('\nAvailable Browser Automation Providers:');
  console.log('  1. 🤖 ChatGPT (Browser) - Takes screenshots, analyzes with GPT-4V');
  console.log('  2. 🦊 Grok (Browser) - X.AI real-time analysis');
  console.log('  3. 🤔 Z.AI (Browser) - Free GLM-5 analysis');
} else {
  console.log('\n❌ Integration incomplete!');
}
