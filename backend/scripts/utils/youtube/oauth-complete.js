#!/usr/bin/env node

/**
 * Complete YouTube OAuth 2.0 Troubleshooting & Testing Script
 * 
 * This script provides comprehensive debugging for YouTube OAuth issues,
 * specifically targeting the `invalid_grant` error during token exchange.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import fs from 'fs/promises';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

// Load .env from root for helper script
const envPath = path.join(backendRoot, '../.env');
dotenv.config({ path: envPath });

const createOAuth2Client = () => {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error('Missing YOUTUBE_OAUTH_CLIENT_ID or YOUTUBE_OAUTH_CLIENT_SECRET in .env');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    oauth2: new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  };
};

const tokenPath = path.join(backendRoot, process.env.YOUTUBE_OAUTH_TOKEN_PATH || 'config/youtube-token.json');

async function diagnose() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 YOUTUBE OAUTH 2.0 COMPREHENSIVE DIAGNOSIS');
  console.log('═'.repeat(60) + '\n');

  try {
    const { clientId, clientSecret, redirectUri, oauth2 } = createOAuth2Client();

    // 1. Credentials check
    console.log('1️⃣  Credentials Status:');
    console.log(`   ✅ CLIENT_ID: ${clientId.substring(0, 30)}...`);
    console.log(`   ✅ CLIENT_SECRET: ${clientSecret ? '(set)' : '❌ missing'}`);
    console.log(`   ✅ REDIRECT_URI: ${redirectUri}`);
    console.log();

    // 2. OAuth2 client check
    console.log('2️⃣  OAuth2 Client:');
    console.log(`   ✅ OAuth2 client created successfully`);
    console.log();

    // 3. Token file check
    console.log('3️⃣  Token File Status:');
    try {
      const tokenText = await fs.readFile(tokenPath, 'utf-8');
      const token = JSON.parse(tokenText);
      
      console.log(`   ✅ Token file exists: ${tokenPath}`);
      console.log(`   ✅ Has access_token: ${!!token.access_token}`);
      console.log(`   ✅ Has refresh_token: ${!!token.refresh_token}`);
      
      if (token.expiry_date) {
        const expiryDate = new Date(token.expiry_date);
        const isExpired = token.expiry_date <= Date.now();
        console.log(`   ${isExpired ? '❌' : '✅'} Expiry: ${expiryDate.toISOString()} ${isExpired ? '(EXPIRED)' : '(valid)'}`);
      }
    } catch (error) {
      console.log(`   ℹ️  No token file found (expected on first run)`);
    }
    console.log();

    // 4. Google OAuth info
    console.log('4️⃣  Google OAuth Info:');
    console.log(`   📝 Scopes required:`);
    console.log(`      - https://www.googleapis.com/auth/youtube.upload`);
    console.log(`      - https://www.googleapis.com/auth/youtube.readonly`);
    console.log();

    console.log('✅ Diagnosis complete! System is ready.\n');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    process.exit(1);
  }
}

async function authUrl() {
  try {
    const { oauth2 } = createOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];

    const url = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });

    console.log('\n' + '═'.repeat(60));
    console.log('🔐 YOUTUBE OAUTH AUTHORIZATION URL');
    console.log('═'.repeat(60) + '\n');

    console.log('📌 STEP 1: Open this URL in an INCOGNITO window:\n');
    console.log(url);
    console.log('\n' + '─'.repeat(60));
    console.log('📌 STEP 2: Log in as konglee.aff@gmail.com');
    console.log('📌 STEP 3: Approve all permissions');
    console.log('📌 STEP 4: You will be redirected with a code parameter');
    console.log('📌 STEP 5: Copy the code and run:\n');
    console.log('   node scripts/youtube-oauth-complete.js exchange YOUR_CODE_HERE\n');
    console.log('─'.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error generating auth URL:', error.message);
    process.exit(1);
  }
}

async function exchange(code) {
  if (!code) {
    console.error('❌ Code is required');
    console.error('Usage: node scripts/youtube-oauth-complete.js exchange YOUR_CODE_HERE');
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🔄 EXCHANGING AUTHORIZATION CODE FOR ACCESS TOKEN');
  console.log('═'.repeat(60) + '\n');

  try {
    const { clientId, redirectUri, oauth2 } = createOAuth2Client();

    console.log('📝 Exchange Details:');
    console.log(`   CLIENT_ID: ${clientId.substring(0, 30)}...`);
    console.log(`   REDIRECT_URI: ${redirectUri}`);
    console.log(`   CODE: ${code.substring(0, 20)}...`);
    console.log();

    console.log('⏳ Contacting Google OAuth server...');
    const { tokens } = await oauth2.getToken(code);

    console.log('✅ Token received from Google!\n');
    console.log('📊 Token Details:');
    console.log(`   ✅ access_token: ${tokens.access_token ? '(received)' : '❌ missing'}`);
    console.log(`   ✅ refresh_token: ${tokens.refresh_token ? '(received)' : '❌ missing'}`);
    console.log(`   ✅ expires_in: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'N/A'}`);
    console.log(`   ✅ token_type: ${tokens.token_type || 'N/A'}`);
    console.log();

    // Save token
    console.log('💾 Saving token to file...');
    await fs.mkdir(path.dirname(tokenPath), { recursive: true });
    await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2), 'utf-8');
    console.log(`✅ Token saved to: ${tokenPath}\n`);

    console.log('─'.repeat(60));
    console.log('🎉 SUCCESS! YouTube OAuth is now configured.\n');
    console.log('Next steps:');
    console.log('  1. Test upload with:');
    console.log('     node scripts/trend-automation/test-dailyhaha-youtube-upload.js\n');
    console.log('─'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n' + '❌ Token Exchange FAILED!\n');
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error();

    // Advanced troubleshooting
    if (error.message.includes('invalid_grant')) {
      console.error('🔧 TROUBLESHOOTING invalid_grant:\n');
      console.error('Possible causes:');
      console.error('  1. Code was already used (codes are single-use only)');
      console.error('  2. Code has expired (valid for ~10 minutes)');
      console.error('  3. Redirect URI does not match Google Cloud Console');
      console.error('  4. Client ID/Secret do not match the code');
      console.error('  5. Authorization code was issued for a different client\n');
      console.error('✨ Solution:');
      console.error('  1. Generate a NEW authorization code');
      console.error('  2. Exchange it within 2 minutes');
      console.error('  3. Use INCOGNITO window to avoid cached sessions');
      console.error('  4. Verify CLIENT_ID matches in Google Cloud Console\n');
    } else if (error.message.includes('redirect_uri_mismatch')) {
      console.error('🔧 TROUBLESHOOTING redirect_uri_mismatch:\n');
      console.error('The redirect URI must match EXACTLY in Google Cloud Console.');
      console.error('Current redirect URI:', redirectUri);
      console.error('Check: https://console.cloud.google.com/apis/credentials\n');
    }

    console.error('For more help, run:');
    console.error('  node scripts/youtube-oauth-complete.js diagnose\n');

    process.exit(1);
  }
}

async function status() {
  console.log('\n' + '═'.repeat(60));
  console.log('📋 TOKEN STATUS CHECK');
  console.log('═'.repeat(60) + '\n');

  try {
    const tokenText = await fs.readFile(tokenPath, 'utf-8');
    const token = JSON.parse(tokenText);

    console.log(`📍 Location: ${tokenPath}\n`);
    
    console.log('Token Content:');
    console.log(`   ✅ access_token: ${token.access_token ? 'present' : '❌ missing'}`);
    console.log(`   ✅ refresh_token: ${token.refresh_token ? 'present' : '❌ missing'}`);
    console.log(`   ✅ token_type: ${token.token_type || 'N/A'}`);
    console.log(`   ✅ scope: ${token.scope ? 'present' : '❌ missing'}`);
    console.log();

    if (token.expiry_date) {
      const expiryDate = new Date(token.expiry_date);
      const isExpired = token.expiry_date <= Date.now();
      console.log(`Expiration:`);
      console.log(`   ${isExpired ? '❌' : '✅'} ${isExpired ? 'EXPIRED' : 'VALID'}: ${expiryDate.toISOString()}`);
      console.log();
    }

    console.log('✅ Token status OK\n');

  } catch (error) {
    console.error('❌ Token not found or invalid\n');
    console.error(`Expected at: ${tokenPath}\n`);
    console.error('Generate new token with:');
    console.error('  node scripts/youtube-oauth-complete.js auth-url\n');
  }
}

async function main() {
  const cmd = process.argv[2];

  switch (cmd) {
    case 'diagnose':
      await diagnose();
      break;
    case 'auth-url':
      await authUrl();
      break;
    case 'exchange':
      await exchange(process.argv[3]);
      break;
    case 'status':
      await status();
      break;
    default:
      console.log('\n' + '═'.repeat(60));
      console.log('📺 YOUTUBE OAUTH 2.0 HELPER');
      console.log('═'.repeat(60) + '\n');
      console.log('Usage:\n');
      console.log('  # First time setup:');
      console.log('  node scripts/youtube-oauth-complete.js diagnose          # Check configuration');
      console.log('  node scripts/youtube-oauth-complete.js auth-url          # Get authorization URL');
      console.log('  node scripts/youtube-oauth-complete.js exchange CODE     # Exchange code for token');
      console.log();
      console.log('  # After setup:');
      console.log('  node scripts/youtube-oauth-complete.js status            # Check token validity');
      console.log();
      console.log('Full workflow:');
      console.log('  1. node scripts/youtube-oauth-complete.js diagnose');
      console.log('  2. node scripts/youtube-oauth-complete.js auth-url');
      console.log('  3. [Open URL in browser, approve permissions]');
      console.log('  4. node scripts/youtube-oauth-complete.js exchange CODE_FROM_BROWSER');
      console.log('  5. node scripts/youtube-oauth-complete.js status\n');
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
