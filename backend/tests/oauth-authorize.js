/**
 * Google Drive OAuth Authorization Helper
 * Completes the OAuth flow and saves the token
 * 
 * Usage: node oauth-authorize.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const clientId = process.env.OAUTH_CLIENT_ID;
const clientSecret = process.env.OAUTH_CLIENT_SECRET;
const redirectUri = 'http://localhost:5000/api/drive/auth-callback';
const tokenPath = path.join(__dirname, '../config/drive-token.json');

console.log('🔐 Google Drive OAuth Authorization Helper\n');

if (!clientId || !clientSecret) {
  console.error('❌ OAuth credentials not found in .env');
  process.exit(1);
}

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
});

console.log('📍 Authorization URL:');
console.log(authUrl);
console.log('');
console.log('🌐 Opening browser... Please authorize the app when prompted.');
console.log('');

// Step 2: Start a simple HTTP server to receive the callback
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:5000`);
    
    if (url.pathname === '/api/drive/auth-callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      
      if (error) {
        console.error(`\n❌ Authorization error: ${error}`);
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization Failed</h1><p>Please check the console for details.</p>');
        process.exit(1);
      }
      
      if (code) {
        console.log('\n✅ Authorization code received!');
        console.log('   Exchanging code for tokens...');
        
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        
        // Save tokens
        fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
        
        console.log('✅ Token saved!');
        console.log(`   Location: ${tokenPath}`);
        console.log('   Tokens have been saved and will be automatically used for future requests.');
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <h1>✅ Authorization Successful!</h1>
          <p>The app has been authorized to access your Google Drive.</p>
          <p>You can close this window and return to the terminal.</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            To test image generation with Google Drive uploads, run:<br>
            <code>npm start</code>
          </p>
        `);
        
        console.log('');
        console.log('🎉 Authorization complete!');
        console.log('   You can now use Google Drive upload features.');
        
        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  } catch (error) {
    console.error('\n❌ Error during authorization:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Error</h1><p>${error.message}</p>`);
    process.exit(1);
  }
});

server.listen(5000, 'localhost', () => {
  console.log('🔗 Waiting for authorization...');
  console.log('   Callback URL: http://localhost:5000/api/drive/auth-callback');
  console.log('');
  console.log('📌 Browser should open automatically in a few seconds.');
  console.log('   If not, manually visit the URL above.');
  console.log('');
  
  // Try to open browser using cross-platform method
  const open = async () => {
    try {
      const platform = process.platform;
      let cmd;
      
      if (platform === 'darwin') {
        cmd = `open "${authUrl}"`;
      } else if (platform === 'win32') {
        cmd = `start "${authUrl}"`;
      } else {
        cmd = `xdg-open "${authUrl}"`;
      }
      
      const { exec } = await import('child_process');
      exec(cmd);
    } catch (e) {
      // Silently fail if we can't open browser
    }
  };
  
  open();
});

// Handle timeout
setTimeout(() => {
  console.error('\n❌ Authorization timeout (5 minutes)');
  process.exit(1);
}, 5 * 60 * 1000);

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error('Port 5000 is already in use. Please close other processes and try again.');
  }
  process.exit(1);
});
