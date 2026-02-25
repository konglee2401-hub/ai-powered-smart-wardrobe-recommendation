#!/usr/bin/env node
/**
 * Google Drive Authorization Setup Script
 * Guides user through OAuth flow to enable Google Drive uploads
 * 
 * Usage: npm run authorize-drive
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { google } from 'googleapis';
import http from 'http';
import url from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const clientId = process.env.OAUTH_CLIENT_ID;
const clientSecret = process.env.OAUTH_CLIENT_SECRET;
const callbackPort = 5000;
const redirectUri = `http://localhost:${callbackPort}/api/drive/auth-callback`;
const tokenPath = path.join(__dirname, 'config/drive-token.json');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║         🔐 Google Drive Upload Authorization Setup             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);

if (!clientId || !clientSecret) {
  console.error('❌ ERROR: OAuth credentials not found!');
  console.error('');
  console.error('Please add these to backend/.env:');
  console.error('  OAUTH_CLIENT_ID=your_client_id');
  console.error('  OAUTH_CLIENT_SECRET=your_client_secret');
  console.error('');
  console.error('Get credentials from: https://console.cloud.google.com/');
  process.exit(1);
}

console.log('✅ OAuth credentials found in .env\n');

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);

// Step 1: Generate authorization URL
const scopes = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent' // Force consent screen to get refresh token
});

console.log('📍 Authorization URL has been generated.\n');
console.log('To enable Google Drive uploads, you need to:');
console.log('  1. Visit the URL below in your browser');
console.log('  2. Sign in with your Google account');
console.log('  3. Grant permission for the app to access Google Drive');
console.log('  4. You will be redirected back to localhost\n');

// Step 2: Start HTTP server
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new url.URL(req.url, `http://localhost:${callbackPort}`).pathname;
    const searchParams = new url.URL(req.url, `http://localhost:${callbackPort}`).searchParams;
    
    if (pathname === '/api/drive/auth-callback') {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (error) {
        console.error(`\n❌ Authorization error: ${error}`);
        console.error(`   Description: ${searchParams.get('error_description') || 'Unknown'}\n`);
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <head><title>Authorization Failed</title></head>
            <body style="font-family: Arial; padding: 20px;">
              <h1>❌ Authorization Failed</h1>
              <p>Error: <strong>${error}</strong></p>
              <p>${searchParams.get('error_description') || ''}</p>
              <p><a href="javascript:window.close()">Close this window</a></p>
            </body>
          </html>
        `);
        
        setTimeout(() => {
          process.exit(1);
        }, 3000);
        return;
      }
      
      if (code) {
        console.log('\n✅ Authorization code received!');
        console.log('   Exchanging code for tokens...\n');
        
        try {
          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          
          // Create config directory
          const configDir = path.dirname(tokenPath);
          if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
          }
          
          // Save tokens
          fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
          console.log(`✅ Tokens saved to: ${tokenPath}\n`);
          
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <head><title>Authorization Successful</title></head>
              <body style="font-family: Arial; padding: 20px; text-align: center;">
                <h1>✅ Authorization Successful!</h1>
                <p style="font-size: 18px; margin: 30px 0;">
                  Your Google Drive is now connected to Smart Wardrobe.
                </p>
                <div style="background: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>🎉 You can now:</strong></p>
                  <ul style="text-align: left; display: inline-block;">
                    <li>✓ Generate images with automatic Google Drive uploads</li>
                    <li>✓ Access images from any device</li>
                    <li>✓ Download images directly from Google Drive</li>
                  </ul>
                </div>
                <p style="color: #666;">You can close this window and return to the app.</p>
              </body>
            </html>
          `);
          
          console.log(`🎉 Google Drive authorization complete!\n`);
          console.log('✨ You can now generate images and they will automatically upload to Google Drive.\n');
          
          setTimeout(() => {
            server.close();
            process.exit(0);
          }, 1000);
        } catch (tokenError) {
          console.error('\n❌ Error exchanging authorization code:', tokenError.message);
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <head><title>Error</title></head>
              <body style="font-family: Arial; padding: 20px;">
                <h1>❌ Error</h1>
                <p>${tokenError.message}</p>
              </body>
            </html>
          `);
          process.exit(1);
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>❌ Missing authorization code</h1>');
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Not Found</h1>');
    }
  } catch (error) {
    console.error('\n❌ Server error:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server Error: ' + error.message);
    process.exit(1);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${callbackPort} is already in use!`);
    console.error('   Please close other applications using port 5000 and try again.');
    process.exit(1);
  } else {
    console.error(`\n❌ Server error: ${error.message}`);
    process.exit(1);
  }
});

// Start server
server.listen(callbackPort, 'localhost', () => {
  console.log('🔗 Waiting for authorization...\n');
  console.log(`📌 Callback URL: http://localhost:${callbackPort}/api/drive/auth-callback\n`);
  
  console.log('🌐 Opening your browser in 2 seconds...\n');
  console.log('------- Authorization URL -------\n');
  console.log(authUrl);
  console.log('\n------- End Authorization URL -------\n');
  
  // Try to open browser
  setTimeout(async () => {
    try {
      const { exec } = await import('child_process');
      const platform = process.platform;
      
      if (platform === 'darwin') {
        exec(`open "${authUrl}"`);
      } else if (platform === 'win32') {
        exec(`start "" "${authUrl}"`);
      } else {
        exec(`xdg-open "${authUrl}"`);
      }
    } catch (e) {
      console.log('If browser did not open, please manually visit the URL above.\n');
    }
  }, 2000);
});

// Handle timeout
setTimeout(() => {
  console.error('\n❌ Authorization timeout (10 minutes)');
  console.error('   Please try again by running: npm run authorize-drive\n');
  process.exit(1);
}, 10 * 60 * 1000);

console.log('(Waiting for you to authorize in your browser...)\n');
