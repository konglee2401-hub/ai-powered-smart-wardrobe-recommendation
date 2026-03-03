#!/usr/bin/env node

/**
 * Grok Session Setup Guide
 * 
 * Shows how to properly set up Grok session management
 * Following the ChatGPT pattern for persistent profile usage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../.sessions/grok-session-complete.json');
const PROFILE_DIR = path.join(__dirname, '../data/grok-profile');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🚀 GROK SESSION SETUP - PERSISTENT PROFILE APPROACH');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📋 Current Status:\n');

  // Check session file
  let hasSession = false;
  if (fs.existsSync(SESSION_FILE)) {
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const isValid = new Date(data.expiresAt) > new Date();
    console.log(`✅ Session file exists: ${SESSION_FILE}`);
    console.log(`   - Cookies: ${data.cookies?.length || 0}`);
    console.log(`   - Valid: ${isValid ? '✅ Yes' : '❌ Expired'}`);
    hasSession = isValid;
  } else {
    console.log(`❌ No session file found`);
  }

  // Check persistent profile
  let hasProfile = false;
  if (fs.existsSync(PROFILE_DIR)) {
    const contents = fs.readdirSync(PROFILE_DIR);
    console.log(`✅ Persistent profile exists: ${PROFILE_DIR}`);
    console.log(`   - Subdirs: ${contents.length > 0 ? contents.join(', ') : '(empty)'}`);
    hasProfile = contents.length > 0;
  } else {
    console.log(`❌ No persistent profile found (will be created on first run)`);
  }

  console.log('\n📖 HOW IT WORKS:\n');
  console.log('1️⃣  FIRST RUN (Session Capture):');
  console.log('    node scripts/grok-session-capture.js --mode capture');
  console.log('    → Browser opens to Grok.com');
  console.log('    → User logs in manually (email or X account)');
  console.log('    → User may need to verify Cloudflare checkbox = 1 time only');
  console.log('    → Press ENTER in terminal');
  console.log('    → Session saved to: .sessions/grok-session-complete.json');
  console.log('    → Chrome saves to persistent profile: data/grok-profile/\n');

  console.log('2️⃣  SUBSEQUENT RUNS (Auto-Session Loading):');
  console.log('    GrokServiceV2.initialize() or scripts using grok:');
  console.log('    → Chrome auto-restores from persistent profile');
  console.log('    → cf_clearance cookie auto-loaded by Chrome');
  console.log('    → NO Cloudflare challenge = instant access ✅\n');

  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!hasSession) {
    console.log('⚠️  ACTION REQUIRED: Session file missing!\n');
    console.log('Run this command to set up session:');
    console.log('  node scripts/grok-session-capture.js --mode capture\n');
    
    const confirm = await askQuestion('Ready to proceed? (y/n): ');
    if (confirm.toLowerCase() === 'y') {
      console.log('\n🚀 Starting session capture...\n');
      // Note: In real usage, would exec the capture script here
      console.log('Please run: node scripts/grok-session-capture.js --mode capture');
    }
  } else if (!hasProfile) {
    console.log('✅ Session file exists!\n');
    console.log('📝 Next time you run GrokServiceV2:');
    console.log('   → Session will be loaded automatically');
    console.log('   → Persistent Chrome profile will be created/populated');
    console.log('   → cf_clearance will be saved for future runs\n');
    console.log('💡 Persistent profile location:');
    console.log(`   ${PROFILE_DIR}\n`);
  } else {
    console.log('✅ All set! Grok session is configured:\n');
    console.log(`✅ Session file: ${hasSession ? 'Valid' : 'Empty'}`);
    console.log(`✅ Persistent profile: Ready (${fs.readdirSync(PROFILE_DIR).length} subdirs)\n`);
    console.log('🚀 Ready to use with GrokServiceV2!');
    console.log('   No repeated Cloudflare challenges on subsequent runs\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
