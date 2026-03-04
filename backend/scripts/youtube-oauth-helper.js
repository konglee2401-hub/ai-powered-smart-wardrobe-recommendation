#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

// Load .env
dotenv.config({ path: path.join(backendRoot, '../.env') });

const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;
const redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/shorts-reels/youtube/oauth/callback';
const tokenPath = path.join(backendRoot, 'config/youtube-token.json');

async function main() {
  const cmd = process.argv[2];

  if (cmd === 'auth-url') {
    // Generate authorization URL
    if (!clientId || !clientSecret) {
      console.error('❌ Missing OAuth credentials');
      console.error(`   YOUTUBE_OAUTH_CLIENT_ID: ${clientId ? '✓' : '✗'}`);
      console.error(`   YOUTUBE_OAUTH_CLIENT_SECRET: ${clientSecret ? '✓' : '✗'}`);
      process.exit(1);
    }

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];

    const authUrl = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });

    console.log('🔐 YouTube OAuth Authorization URL\n');
    console.log('📌 Step 1: Open this URL in your browser:\n');
    console.log(authUrl);
    console.log('\n📌 Step 2: Approve the permissions\n');
    console.log('📌 Step 3: You will see a redirect with ?code=... parameter\n');
    console.log('📌 Step 4: Run this command with the code:\n');
    console.log(`   node scripts/youtube-oauth-helper.js exchange YOUR_CODE_HERE\n`);
  } else if (cmd === 'exchange') {
    // Exchange code for token
    const code = process.argv[3];
    if (!code) {
      console.error('❌ Authorization code is required');
      console.error('Usage: node scripts/youtube-oauth-helper.js exchange YOUR_CODE_HERE');
      process.exit(1);
    }

    if (!clientId || !clientSecret) {
      console.error('❌ Missing OAuth credentials');
      process.exit(1);
    }

    try {
      const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2.getToken(code);

      await fs.mkdir(path.dirname(tokenPath), { recursive: true });
      await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2), 'utf-8');

      console.log('✅ Token saved successfully!');
      console.log(`   Path: ${tokenPath}`);
      console.log(`   Has access_token: ${!!tokens.access_token}`);
      console.log(`   Has refresh_token: ${!!tokens.refresh_token}`);
      console.log('\n✨ You can now run: node scripts/trend-automation/test-dailyhaha-youtube-upload.js\n');
    } catch (error) {
      console.error('❌ Token exchange failed:');
      console.error(`   ${error.message}`);
      process.exit(1);
    }
  } else if (cmd === 'status') {
    // Check token status
    try {
      const tokenText = await fs.readFile(tokenPath, 'utf-8');
      const token = JSON.parse(tokenText);

      console.log('📋 YouTube Token Status\n');
      console.log(`   Location: ${tokenPath}`);
      console.log(`   Has access_token: ${!!token.access_token}`);
      console.log(`   Has refresh_token: ${!!token.refresh_token}`);
      console.log(`   Expires: ${token.expiry_date ? new Date(token.expiry_date).toISOString() : 'N/A'}`);

      if (token.expiry_date) {
        const isExpired = token.expiry_date < Date.now();
        console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
      }
    } catch (error) {
      console.error('❌ No token found');
      console.error(`   Path: ${tokenPath}`);
      console.error('\n   Run: node scripts/youtube-oauth-helper.js auth-url\n');
    }
  } else {
    console.log('YouTube OAuth Helper\n');
    console.log('Usage:');
    console.log('   node scripts/youtube-oauth-helper.js auth-url    - Get authorization URL');
    console.log('   node scripts/youtube-oauth-helper.js exchange CODE - Exchange code for token');
    console.log('   node scripts/youtube-oauth-helper.js status      - Check token status\n');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
