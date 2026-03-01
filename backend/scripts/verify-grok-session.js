#!/usr/bin/env node

/**
 * Quick verification of Grok session file
 * No dependencies required
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../.sessions/grok-session-complete.json');

function verifySession() {
  console.log('\n' + '═'.repeat(80));
  console.log('✅ GROK SESSION VERIFICATION');
  console.log('═'.repeat(80) + '\n');

  if (!fs.existsSync(SESSION_FILE)) {
    console.log('❌ Session file not found: ' + SESSION_FILE);
    console.log('\n💡 Run: node scripts/grok-session-capture.js --mode capture\n');
    return false;
  }

  try {
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    
    const capturedTime = new Date(sessionData.timestamp);
    const expiresTime = new Date(sessionData.expiresAt);
    const now = new Date();
    const isExpired = now > expiresTime;
    const hoursLeft = Math.round((expiresTime - now) / (60 * 60 * 1000));
    const daysLeft = Math.round(hoursLeft / 24);

    console.log('📊 SESSION STATUS');
    console.log('─'.repeat(80));
    console.log(`  📂 File: ${SESSION_FILE}`);
    console.log(`  📅 Captured: ${capturedTime.toLocaleString()}`);
    console.log(`  ⏰ Expires: ${expiresTime.toLocaleString()}`);
    console.log(`  ${isExpired ? '❌' : '✅'} Status: ${isExpired ? 'EXPIRED' : `Valid (${daysLeft} days, ${hoursLeft % 24}h remaining)`}\n`);

    console.log('📋 COMPONENTS');
    console.log('─'.repeat(80));
    console.log(`  🍪 Cookies: ${sessionData.cookies?.length || 0}`);
    console.log(`  💾 LocalStorage: ${Object.keys(sessionData.localStorage || {}).length} items`);
    console.log(`  🔐 SessionStorage: ${Object.keys(sessionData.sessionStorage || {}).length} items`);
    console.log(`  🔑 Auth Tokens: ${Object.keys(sessionData.authTokens || {}).length} tokens\n`);

    // Check critical elements
    console.log('🔐 CRITICAL ELEMENTS');
    console.log('─'.repeat(80));
    
    const criticalCookies = ['cf_clearance', 'sso', 'sso-rw', '__cf_bm'];
    const foundCookies = (sessionData.cookies || []).filter(c => criticalCookies.includes(c.name));
    
    console.log(`\n  🍪 Critical Cookies (${foundCookies.length}/${criticalCookies.length}):`);
    for (const cookieName of criticalCookies) {
      const cookie = sessionData.cookies?.find(c => c.name === cookieName);
      if (cookie) {
        const expires = new Date(cookie.expires * 1000);
        const isValid = now < expires;
        console.log(`     ${isValid ? '✅' : '⚠️'} ${cookieName} (expires ${expires.toLocaleDateString()})`);
      } else {
        console.log(`     ❌ ${cookieName} - MISSING`);
      }
    }

    console.log(`\n  💾 Critical Storage (localStorage):`);
    const criticalStorage = ['anonUserId', 'anonPrivateKey', 'age-verif'];
    for (const key of criticalStorage) {
      const value = sessionData.localStorage?.[key];
      if (value) {
        console.log(`     ✅ ${key}`);
      } else {
        console.log(`     ❌ ${key} - MISSING`);
      }
    }

    // Summary
    console.log('\n' + '─'.repeat(80));
    
    if (isExpired) {
      console.log('⚠️  SESSION EXPIRED - Please capture a new session:');
      console.log('   node scripts/grok-session-capture.js --mode capture\n');
      return false;
    }

    if (foundCookies.length < criticalCookies.length) {
      console.log(`⚠️  Missing ${criticalCookies.length - foundCookies.length} critical cookies\n`);
    }

    console.log('✅ SESSION READY FOR USE\n');
    console.log('💡 Next steps:');
    console.log('   1. node scripts/test-grok-session-workflow.js');
    console.log('   2. Integration in GrokServiceV2 will use this session automatically\n');

    console.log('═'.repeat(80) + '\n');
    return true;

  } catch (error) {
    console.error('❌ Error reading session:', error.message);
    return false;
  }
}

// Run verification
const success = verifySession();
process.exit(success ? 0 : 1);
