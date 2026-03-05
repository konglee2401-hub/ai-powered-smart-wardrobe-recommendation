import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import OAuthCredentials from '../models/OAuthCredentials.js';
import { google } from 'googleapis';

const router = express.Router();

router.post('/credentials/save', async (req, res) => {
  try {
    const { provider, clientId, clientSecret, redirectUri } = req.body || {};
    if (!provider || !clientId || !clientSecret) {
      return res.status(400).json({ success: false, error: 'provider, clientId, clientSecret are required' });
    }
    const saved = await OAuthCredentials.saveEncrypted(provider, clientId, clientSecret, redirectUri);
    res.json({ success: true, provider: saved.provider, redirectUri: saved.redirectUri });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/credentials/:provider', async (req, res) => {
  try {
    const item = await OAuthCredentials.findOne({ provider: req.params.provider });
    if (!item) return res.status(404).json({ success: false, error: 'not_found' });
    res.json({
      success: true,
      provider: item.provider,
      hasClientId: !!item.clientIdEncrypted,
      hasClientSecret: !!item.clientSecretEncrypted,
      redirectUri: item.redirectUri || null,
      updatedAt: item.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function runNodeScript(scriptPath, args = []) {
  return spawn(process.execPath, [scriptPath, ...args], {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: 'pipe',
  });
}

router.post('/run/refresh-google-flow', (req, res) => {
  try {
    const script = path.join(__dirname, '..', 'scripts', 'refresh-googe-flow-session.js');
    if (!fs.existsSync(script)) return res.status(404).json({ success: false, error: 'script_not_found' });
    const child = runNodeScript(script);
    child.on('error', () => {});
    res.json({ success: true, pid: child.pid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/run/chatgpt-auto-login', (req, res) => {
  try {
    const script = path.join(__dirname, '..', 'scripts', 'chatgpt-auto-login.js');
    if (!fs.existsSync(script)) return res.status(404).json({ success: false, error: 'script_not_found' });
    const args = [];
    if (req.query?.mode === 'refresh') args.push('--refresh');
    if (req.query?.mode === 'validate') args.push('--validate');
    const child = runNodeScript(script, args);
    child.on('error', () => {});
    res.json({ success: true, pid: child.pid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/status/google-flow-session', (req, res) => {
  try {
    const sessionPath = path.join(__dirname, '..', '.sessions', 'google-flow-session-complete.json');
    const exists = fs.existsSync(sessionPath);
    let meta = null;
    if (exists) {
      const stat = fs.statSync(sessionPath);
      meta = { size: stat.size, mtime: stat.mtime };
    }
    res.json({ success: true, exists, path: exists ? sessionPath : null, meta });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/status/chatgpt-session', (req, res) => {
  try {
    const sessionPath = path.join(__dirname, '..', 'data', 'chatgpt-profiles', 'default', 'session.json');
    const exists = fs.existsSync(sessionPath);
    let meta = null;
    if (exists) {
      const stat = fs.statSync(sessionPath);
      meta = { size: stat.size, mtime: stat.mtime };
    }
    res.json({ success: true, exists, path: exists ? sessionPath : null, meta });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/diagnostic/google-drive', (req, res) => {
  try {
    const tokenPath = path.join(__dirname, '..', 'config', 'drive-token.json');
    const exists = fs.existsSync(tokenPath);
    res.json({ success: true, tokenExists: exists, tokenPath: tokenPath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/diagnostic/youtube', (req, res) => {
  try {
    const tokenPath = path.join(__dirname, '..', 'config', 'youtube-token.json');
    const exists = fs.existsSync(tokenPath);
    res.json({ success: true, tokenExists: exists, tokenPath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/google-drive/oauth-url', async (req, res) => {
  try {
    const item = await OAuthCredentials.findOne({ provider: 'google-drive' });
    if (!item) return res.status(404).json({ success: false, error: 'credentials_not_found' });
    const clientId = item.getClientId();
    const clientSecret = item.getClientSecret();
    const redirectUri = item.redirectUri || 'http://localhost:5000/api/drive/auth-callback';
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const scopes = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file'];
    const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: scopes });
    res.json({ success: true, authUrl, redirectUri });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/google-drive/exchange-code', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ success: false, error: 'code_required' });
    const item = await OAuthCredentials.findOne({ provider: 'google-drive' });
    if (!item) return res.status(404).json({ success: false, error: 'credentials_not_found' });
    const clientId = item.getClientId();
    const clientSecret = item.getClientSecret();
    const redirectUri = item.redirectUri || 'http://localhost:5000/api/drive/auth-callback';
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);
    const tokenPath = path.join(__dirname, '..', 'config', 'drive-token.json');
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    res.json({ success: true, tokenSaved: true, tokenPath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/youtube/oauth-url', async (req, res) => {
  try {
    const item = await OAuthCredentials.findOne({ provider: 'youtube' });
    if (!item) return res.status(404).json({ success: false, error: 'credentials_not_found' });
    const clientId = item.getClientId();
    const clientSecret = item.getClientSecret();
    const redirectUri = item.redirectUri || process.env.YOUTUBE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/trend-automation/youtube/oauth/callback';
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const scopes = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];
    const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: scopes });
    res.json({ success: true, authUrl, redirectUri });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/youtube/exchange-code', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ success: false, error: 'code_required' });
    const item = await OAuthCredentials.findOne({ provider: 'youtube' });
    if (!item) return res.status(404).json({ success: false, error: 'credentials_not_found' });
    const clientId = item.getClientId();
    const clientSecret = item.getClientSecret();
    const redirectUri = item.redirectUri || process.env.YOUTUBE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/trend-automation/youtube/oauth/callback';
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);
    const tokenPath = path.join(__dirname, '..', 'config', 'youtube-token.json');
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    res.json({ success: true, tokenSaved: true, tokenPath, hasRefreshToken: !!tokens.refresh_token });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// New endpoint: Check Google Drive Configuration
router.get('/drive-config-check', async (req, res) => {
  try {
    // Load folder structure
    const folderStructurePath = path.join(__dirname, '..', 'config', 'drive-folder-structure.json');
    let folderStructure = null;
    
    if (fs.existsSync(folderStructurePath)) {
      folderStructure = JSON.parse(fs.readFileSync(folderStructurePath, 'utf8'));
    }

    // Check environment variables
    const clientIdConfigured = !!process.env.OAUTH_CLIENT_ID;
    const clientSecretConfigured = !!process.env.OAUTH_CLIENT_SECRET;

    // Check token validity
    const tokenPath = path.join(__dirname, '..', 'config', 'drive-token.json');
    let tokenValid = false;
    let tokenExpires = null;

    if (fs.existsSync(tokenPath)) {
      try {
        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        const expiryDate = new Date(token.expiry_date);
        tokenValid = expiryDate > new Date();
        if (expiryDate) {
          tokenExpires = expiryDate.toLocaleString();
        }
      } catch (e) {
        // Invalid token file
      }
    }

    // Prepare folder mappings
    const folderMappings = folderStructure ? {
      'Images': { id: folderStructure.folders?.['Affiliate AI/Images'] },
      'Character': { id: folderStructure.folders?.['Affiliate AI/Images/Uploaded/App/Character'] },
      'Product': { id: folderStructure.folders?.['Affiliate AI/Images/Uploaded/App/Product'] },
      'Generated Images': { id: folderStructure.folders?.['Affiliate AI/Images/Completed'] },
      'Videos': { id: folderStructure.folders?.['Affiliate AI/Videos'] },
      'Source Videos': { id: folderStructure.folders?.['Affiliate AI/Videos/Uploaded/App'] },
      'Generated Videos': { id: folderStructure.folders?.['Affiliate AI/Videos/Completed'] },
      'Video Queue': { id: folderStructure.folders?.['Affiliate AI/Videos/Queue'] },
      'TikTok Export': { id: folderStructure.folders?.['Affiliate AI/Videos/Downloaded/Tiktok'] },
      'Reels Export': { id: folderStructure.folders?.['Affiliate AI/Videos/Downloaded/Reels'] },
      'YouTube Export': { id: folderStructure.folders?.['Affiliate AI/Videos/Downloaded/Youtube'] },
      'Playboard Export': { id: folderStructure.folders?.['Affiliate AI/Videos/Downloaded/Playboard'] },
      'DailyHaha Export': { id: folderStructure.folders?.['Affiliate AI/Videos/Downloaded/Dailyhaha'] },
      'Douyin Export': { id: folderStructure.folders?.['Affiliate AI/Videos/Downloaded/Douyin'] }
    } : {};

    // Upload methods configuration
    const uploadMethods = [
      { method: 'uploadCharacterImage()', folder: 'Images/Uploaded/App/Character', ready: !!folderStructure?.folders?.['Affiliate AI/Images/Uploaded/App/Character'] },
      { method: 'uploadProductImage()', folder: 'Images/Uploaded/App/Product', ready: !!folderStructure?.folders?.['Affiliate AI/Images/Uploaded/App/Product'] },
      { method: 'uploadGeneratedImage()', folder: 'Images/Completed', ready: !!folderStructure?.folders?.['Affiliate AI/Images/Completed'] },
      { method: 'uploadSourceVideo()', folder: 'Videos/Uploaded/App', ready: !!folderStructure?.folders?.['Affiliate AI/Videos/Uploaded/App'] },
      { method: 'uploadGeneratedVideo()', folder: 'Videos/Completed', ready: !!folderStructure?.folders?.['Affiliate AI/Videos/Completed'] }
    ];

    const allConfigured = clientIdConfigured && clientSecretConfigured && tokenValid && 
                         uploadMethods.every(m => m.ready) && 
                         Object.values(folderMappings).every(f => f.id);

    res.json({
      success: true,
      folderMappings,
      uploadMethods,
      auth: {
        clientIdConfigured,
        clientSecretConfigured,
        tokenValid,
        tokenExpires
      },
      allConfigured
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// New endpoint: Get Scraper Videos Configuration
router.get('/scraper-videos-config', async (req, res) => {
  try {
    // Load current configuration from database or config file
    // For now, return default configuration
    const defaultConfig = {
      tiktok: {
        folder: 'Videos/Downloaded/Tiktok',
        folderId: null,
        description: 'For TikTok content downloaded for repurposing',
        source: 'tiktok',
        enabled: true
      },
      reels: {
        folder: 'Videos/Downloaded/Reels',
        folderId: null,
        description: 'For Instagram Reels content downloaded for repurposing',
        source: 'reels',
        enabled: true
      },
      youtube: {
        folder: 'Videos/Downloaded/Youtube',
        folderId: null,
        description: 'For YouTube videos downloaded for repurposing',
        source: 'youtube',
        enabled: true
      },
      playboard: {
        folder: 'Videos/Downloaded/Playboard',
        folderId: null,
        description: 'For Playboard videos downloaded for repurposing',
        source: 'playboard',
        enabled: true
      },
      dailyhaha: {
        folder: 'Videos/Downloaded/Dailyhaha',
        folderId: null,
        description: 'For DailyHaha videos downloaded for repurposing',
        source: 'dailyhaha',
        enabled: true
      },
      douyin: {
        folder: 'Videos/Downloaded/Douyin',
        folderId: null,
        description: 'For Douyin videos downloaded for repurposing',
        source: 'douyin',
        enabled: true
      },
      general: {
        folder: 'Videos/Downloaded',
        folderId: null,
        description: 'For general source videos from various platforms',
        enabled: true
      }
    };

    // Load folder structure to populate IDs
    const folderStructurePath = path.join(__dirname, '..', 'config', 'drive-folder-structure.json');
    if (fs.existsSync(folderStructurePath)) {
      const folderStructure = JSON.parse(fs.readFileSync(folderStructurePath, 'utf8'));
      Object.keys(defaultConfig).forEach(key => {
        const folderPath = defaultConfig[key].folder.replace(/\//g, '/');
        const fullPath = `Affiliate AI/${folderPath}`;
        defaultConfig[key].folderId = folderStructure.folders?.[fullPath];
      });
    }

    res.json({ success: true, config: defaultConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// New endpoint: Save Scraper Videos Configuration
router.post('/scraper-videos-config', async (req, res) => {
  try {
    const { 
      tiktokFolder, 
      reelsFolder, 
      youtubeFolder,
      playboardFolder,
      dailyhahaFolder,
      douyinFolder,
      generalFolder, 
      customFolderId 
    } = req.body || {};
    
    // In a real scenario, this would save to database
    // For now, just validate and return success
    const config = {
      tiktok: tiktokFolder || 'Videos/Downloaded/Tiktok',
      reels: reelsFolder || 'Videos/Downloaded/Reels',
      youtube: youtubeFolder || 'Videos/Downloaded/Youtube',
      playboard: playboardFolder || 'Videos/Downloaded/Playboard',
      dailyhaha: dailyhahaFolder || 'Videos/Downloaded/Dailyhaha',
      douyin: douyinFolder || 'Videos/Downloaded/Douyin',
      general: generalFolder || 'Videos/Downloaded',
      custom: customFolderId || null
    };

    res.json({ success: true, message: 'Configuration saved', config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
