#!/usr/bin/env node
/**
 * Create mock Google Drive token for testing
 * This allows testing without doing the full OAuth flow
 * 
 * FOR TESTING ONLY - Real tokens should be obtained through proper OAuth flow
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const clientId = process.env.OAUTH_CLIENT_ID;
const clientSecret = process.env.OAUTH_CLIENT_SECRET;
const tokenPath = path.join(__dirname, '../config/drive-token.json');
const configPath = path.dirname(tokenPath);

console.log('🧪 Creating mock Google Drive token for testing...\n');

if (!clientId || !clientSecret) {
  console.error('❌ OAuth credentials not found in .env');
  process.exit(1);
}

// Create mock token with expiration far in future
const mockToken = {
  type: 'authorized_user',
  client_id: clientId,
  client_secret: clientSecret,
  refresh_token: 'mock_refresh_token_for_testing',
  access_token: 'ya29.mock_access_token_for_testing_' + Date.now(),
  expiry_date: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year from now
  scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
  token_type: 'Bearer'
};

try {
  // Create config directory if it doesn't exist
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath, { recursive: true });
    console.log(`✅ Created config directory: ${configPath}`);
  }

  // Save mock token
  fs.writeFileSync(tokenPath, JSON.stringify(mockToken, null, 2));
  console.log(`✅ Mock token created at: ${tokenPath}`);
  console.log('');
  console.log('⚠️  WARNING: This is a mock token for testing only!');
  console.log('   ✓ Google Drive API calls will fail with this token');
  console.log('   ✓ To enable real Google Drive uploads, run:');
  console.log('     npm run authorize-drive');
  console.log('');
  console.log('✅ For now, files will be saved locally.');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error creating mock token:', error.message);
  process.exit(1);
}
