#!/usr/bin/env node
/**
 * Google Drive Setup Status Check
 * Verifies all components are configured and ready
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║              📊 Google Drive Setup Status Report               ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);

// Check 1: Environment variables
console.log('1️⃣  Environment Variables:');
const clientId = process.env.OAUTH_CLIENT_ID;
const clientSecret = process.env.OAUTH_CLIENT_SECRET;
const driveApiKey = process.env.DRIVE_API_KEY;

if (clientId && clientSecret) {
  console.log('   ✅ OAUTH_CLIENT_ID configured');
  console.log('   ✅ OAUTH_CLIENT_SECRET configured');
} else {
  console.log('   ❌ OAuth credentials missing');
}

if (driveApiKey) {
  console.log('   ✅ DRIVE_API_KEY configured');
} else {
  console.log('   ⚠️  DRIVE_API_KEY not configured (optional)');
}

// Check 2: Token file
console.log('\n2️⃣  Google Drive Token:');
const tokenPath = path.join(__dirname, 'config/drive-token.json');
const tokenExists = fs.existsSync(tokenPath);

if (tokenExists) {
  try {
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const expiryDate = token.expiry_date ? new Date(token.expiry_date) : null;
    const isExpired = expiryDate && expiryDate < new Date();
    
    if (isExpired) {
      console.log('   ⚠️  Token exists but expired');
      console.log(`      Expired: ${expiryDate.toLocaleString()}`);
      console.log('      Action: Re-run authorization');
    } else {
      console.log('   ✅ Valid token stored');
      if (expiryDate) {
        console.log(`      Expires: ${expiryDate.toLocaleString()}`);
      }
    }
  } catch (e) {
    console.log('   ⚠️  Token file exists but is invalid');
  }
} else {
  console.log('   ℹ️  No token file (authorization not yet completed)');
  console.log('      Run: node backend/setup-drive-auth.js');
}

// Check 3: Config directory
console.log('\n3️⃣  Configuration Directory:');
const configDir = path.join(__dirname, 'config');
if (fs.existsSync(configDir)) {
  console.log('   ✅ Config directory exists');
  const files = fs.readdirSync(configDir);
  files.forEach(f => {
    console.log(`      📄 ${f}`);
  });
} else {
  console.log('   ℹ️  Config directory will be created on first auth');
}

// Check 4: Database availability
console.log('\n4️⃣  Database:');
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  console.log('   ✅ MongoDB configured');
  console.log(`      URI: ${mongoUri.substring(0, 40)}...`);
} else {
  console.log('   ❌ MongoDB not configured');
}

// Summary
console.log('\n' + '═'.repeat(64));
console.log('\n📋 Setup Status Summary:\n');

const isReady = clientId && clientSecret && tokenExists && !fs.existsSync(tokenPath) || (
  clientId && clientSecret && tokenExists && !JSON.parse(fs.readFileSync(tokenPath, 'utf8')).expiry_date || 
  (clientId && clientSecret && tokenExists && new Date(JSON.parse(fs.readFileSync(tokenPath, 'utf8')).expiry_date) > new Date())
);

if (clientId && clientSecret && tokenExists) {
  try {
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    if (!token.expiry_date || new Date(token.expiry_date) > new Date()) {
      console.log('✅ All systems ready! Google Drive uploads enabled.\n');
      console.log('   You can start the app and generate images.');
      console.log('   Images will automatically upload to Google Drive.\n');
    } else {
      console.log('⚠️  Token expired. Please re-authorize:\n');
      console.log('   node backend/setup-drive-auth.js\n');
    }
  } catch (e) {
    console.log('⚠️  Setup not complete. Missing authorization.\n');
    console.log('   1. Run: node backend/setup-drive-auth.js');
    console.log('   2. Grant Google Drive access\n');
  }
} else if (clientId && clientSecret) {
  console.log('⚠️  Setup not complete. Missing authorization.\n');
  console.log('   1. Run: node backend/setup-drive-auth.js');
  console.log('   2. Sign in with Google Account');
  console.log('   3. Grant permission for Drive access\n');
} else {
  console.log('❌ OAuth credentials not configured in .env\n');
  console.log('   Add OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET to backend/.env\n');
}

// Quick commands
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║ Quick Commands                                                 ║');
console.log('╠════════════════════════════════════════════════════════════════╣');
console.log('║ Authorize Google Drive:                                        ║');
console.log('║   node backend/setup-drive-auth.js                            ║');
console.log('║                                                                ║');
console.log('║ Test Google Drive upload:                                      ║');
console.log('║   node backend/tests/test-google-drive-upload.js              ║');
console.log('║                                                                ║');
console.log('║ Start the app:                                                 ║');
console.log('║   npm start                                                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

process.exit(0);
