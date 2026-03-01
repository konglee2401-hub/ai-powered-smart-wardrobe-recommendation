#!/usr/bin/env node

/**
 * Grok Configuration Helper
 * 
 * Shows current configuration and demonstrates how to change project URLs
 * Usage: node backend/scripts/grok-config-helper.js [action] [value]
 */

import { grokConfig, getProjectUrl, setProjectUrl, getSessionPath } from '../config/grokConfig.js';
import fs from 'fs';
import path from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function showCurrentConfig() {
  log(colors.bright + colors.cyan, '\n📋 CURRENT GROK CONFIGURATION\n');
  
  // Project URL info
  log(colors.cyan, '🎯 Project URL Settings:');
  log(colors.green, `   Current Project: ${getProjectUrl()}`);
  log(colors.green, `   Fallback URL:    ${grokConfig.fallbackUrl}`);
  
  // Session info
  log(colors.cyan, '\n💾 Session Settings:');
  log(colors.green, `   Storage Dir:     ${grokConfig.session.dir}`);
  log(colors.green, `   Session File:    ${grokConfig.session.filename}`);
  log(colors.green, `   Full Path:       ${getSessionPath()}`);
  
  // Check if session file exists
  const sessionPath = getSessionPath();
  if (fs.existsSync(sessionPath)) {
    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    log(colors.green, `   ✅ Session File: EXISTS (${Object.keys(sessionData).length} items)`);
  } else {
    log(colors.yellow, `   ⚠️  Session File: NOT FOUND`);
  }
  
  log(colors.green, `   Refresh Threshold: ${grokConfig.session.refreshThreshold} hours`);
  log(colors.green, `   Max Age:           ${grokConfig.session.maxAge} days`);
  
  // Browser settings
  log(colors.cyan, '\n🔷 Browser Settings:');
  log(colors.green, `   Mode:               ${grokConfig.browser.headless}`);
  log(colors.green, `   Navigation Timeout: ${grokConfig.browser.navigationTimeout / 1000}s`);
  log(colors.green, `   Element Wait:       ${grokConfig.browser.elementWaitTimeout / 1000}s`);
  log(colors.dim, `   Launch Args:        ${grokConfig.browser.args.length} arguments`);
  
  // Cloudflare settings
  log(colors.cyan, '\n☁️  Cloudflare Bypass Settings:');
  log(colors.green, `   Max Attempts:       ${grokConfig.cloudflare.maxAttempts}`);
  log(colors.green, `   Retry Delay:        ${grokConfig.cloudflare.retryDelay}ms`);
  log(colors.green, `   Challenge Timeout:  ${grokConfig.cloudflare.challengeTimeout / 1000}s`);
  
  // Generation settings
  log(colors.cyan, '\n🖼️  Image Generation Settings:');
  log(colors.green, `   Default Model:      ${grokConfig.generation.model}`);
  log(colors.green, `   Generation Timeout: ${grokConfig.generation.timeout / 1000}s`);
  log(colors.green, `   Retries:            ${grokConfig.generation.retries}`);
  
  // Logging
  log(colors.cyan, '\n📝 Logging Settings:');
  log(colors.green, `   Level:              ${grokConfig.logging.level}`);
  log(colors.green, `   Save to File:       ${grokConfig.logging.saveToFile}`);
  if (grokConfig.logging.saveToFile) {
    log(colors.green, `   Log Directory:      ${grokConfig.logging.logDir}`);
  }
}

async function changeProjectUrl(newUrl) {
  if (!newUrl) {
    log(colors.red, '\n❌ Error: Project URL is required');
    showUsage();
    process.exit(1);
  }
  
  if (!newUrl.includes('grok.com')) {
    log(colors.red, '\n❌ Error: URL must be a grok.com project URL');
    process.exit(1);
  }
  
  try {
    setProjectUrl(newUrl);
    log(colors.green, '\n✅ Project URL updated successfully!');
    log(colors.green, `   New URL: ${newUrl}`);
    log(colors.dim, '\n💡 Changes applied to:');
    log(colors.dim, '   • Current config object');
    log(colors.dim, '   • All new GrokServiceV2 instances');
    log(colors.dim, '\n⚠️  Note: Changes to grokConfig.js will affect future runs');
  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

async function showUsageExamples() {
  log(colors.bright + colors.cyan, '\n📚 USAGE EXAMPLES\n');
  
  log(colors.cyan, 'Change Project URL (permanent in config):');
  log(colors.dim, '  1. Edit: backend/config/grokConfig.js');
  log(colors.dim, '  2. Change projectUrl value');
  log(colors.dim, '  3. Save and restart\n');
  
  log(colors.cyan, 'Change Project URL (this session):');
  log(colors.dim, `  $ node backend/scripts/grok-config-helper.js set <NEW_URL>\n`);
  
  log(colors.cyan, 'Change Project URL (environment variable):');
  log(colors.dim, '  Linux/Mac:');
  log(colors.dim, '    export GROK_PROJECT_URL="https://grok.com/project/NEW_ID"');
  log(colors.dim, '    npm run start\n');
  
  log(colors.dim, '  Windows PowerShell:');
  log(colors.dim, '    $env:GROK_PROJECT_URL="https://grok.com/project/NEW_ID"');
  log(colors.dim, '    npm run start\n');
  
  log(colors.cyan, 'In Your Code:');
  log(colors.dim, `  import { getProjectUrl, setProjectUrl } from './config/grokConfig.js';
  
  // Get current URL
  const url = getProjectUrl();
  
  // Change URL
  setProjectUrl('https://grok.com/project/NEW_ID');
  
  // In GrokServiceV2
  const service = new GrokServiceV2({
    projectUrl: 'https://grok.com/project/NEW_ID'
  });
  
  // Change at runtime
  service.setProjectUrl('https://grok.com/project/NEW_ID');\n`);
}

function showUsage() {
  log(colors.bright + colors.yellow, '\n📖 GROK CONFIGURATION HELPER\n');
  log(colors.yellow, 'Usage: node grok-config-helper.js [action] [value]\n');
  
  log(colors.cyan, 'Actions:');
  log(colors.green, '  show      Show current configuration (default)');
  log(colors.green, '  set <url> Set new project URL');
  log(colors.green, '  help      Show usage examples');
  
  log(colors.cyan, '\nExamples:');
  log(colors.dim, '  node grok-config-helper.js show');
  log(colors.dim, '  node grok-config-helper.js set https://grok.com/project/abc123');
  log(colors.dim, '  node grok-config-helper.js help\n');
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'show';
  const value = args[1];
  
  try {
    switch (action.toLowerCase()) {
      case 'show':
      case '--show':
      case '-s':
        await showCurrentConfig();
        break;
        
      case 'set':
      case '--set':
      case '-s':
        await changeProjectUrl(value);
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showUsage();
        await showUsageExamples();
        break;
        
      default:
        log(colors.red, `\n❌ Unknown action: ${action}`);
        showUsage();
        process.exit(1);
    }
  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
