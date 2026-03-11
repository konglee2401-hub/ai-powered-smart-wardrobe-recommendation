import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import OAuthCredentials from '../models/OAuthCredentials.js';
import { google } from 'googleapis';
import LogStreamingService from '../services/logs/LogStreamingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Helper: admin API key enforcement
function checkAdminKey(req, res) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return true; // no admin key configured -> allow
  const provided = req.headers['x-admin-key'] || req.headers['x-api-key'];
  if (!provided || provided !== adminKey) {
    res.status(403).json({ success: false, error: 'admin_key_required' });
    return false;
  }
  return true;
}

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
    const script = path.join(__dirname, '..', 'scripts', 'auth', 'google-flow', 'refresh-session.js');
    if (!fs.existsSync(script)) return res.status(404).json({ success: false, error: 'script_not_found' });
    
    // Create a unique session ID for this refresh run
    const sessionId = randomUUID();
    
    // Initialize logging session
    LogStreamingService.createSession(sessionId);
    LogStreamingService.addLog(sessionId, 'Starting Google Flow Session Refresh...', 'info');
    
    const args = [
      '--log-session', sessionId,
      '--log-server', `http://localhost:${process.env.PORT || 5000}`
    ];
    
    const child = spawn(process.execPath, [script, ...args], {
      cwd: path.join(__dirname, '..'),
      env: process.env,
      stdio: 'pipe'
    });

    // Attach child process to log session for runtime control
    try {
      LogStreamingService.attachProcess(sessionId, child, path.basename(script));
    } catch (e) {
      console.warn('Failed to attach process to LogStreamingService', e.message || e);
    }

    // Capture script output
    let scriptOutput = '';
    child.stdout?.on('data', (data) => {
      scriptOutput += data.toString();
      LogStreamingService.addLog(sessionId, data.toString().trim(), 'info');
    });

    child.stderr?.on('data', (data) => {
      scriptOutput += data.toString();
      LogStreamingService.addLog(sessionId, data.toString().trim(), 'warn');
    });

    child.on('error', (error) => {
      LogStreamingService.addLog(sessionId, `Process error: ${error.message}`, 'error');
      LogStreamingService.endSession(sessionId, 'failed');
    });

    child.on('exit', (code) => {
      if (code === 0) {
        LogStreamingService.addLog(sessionId, 'Google Flow refresh completed successfully ✓', 'success');
        LogStreamingService.endSession(sessionId, 'completed');
      } else {
        LogStreamingService.addLog(sessionId, `Script exited with code ${code}`, 'error');
        LogStreamingService.endSession(sessionId, 'failed');
      }
      // ensure attached process record is cleaned up
      try { LogStreamingService.detachProcess(sessionId); } catch (e) {}
    });

    res.json({ success: true, sessionId, pid: child.pid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/run/chatgpt-auto-login', (req, res) => {
  try {
    const script = path.join(__dirname, '..', 'scripts', 'auth', 'chatgpt', 'login.js');
    if (!fs.existsSync(script)) return res.status(404).json({ success: false, error: 'script_not_found' });
    
    // Create a unique session ID for this auto-login run
    const sessionId = randomUUID();
    
    // Initialize logging session
    LogStreamingService.createSession(sessionId);
    LogStreamingService.addLog(sessionId, 'Starting ChatGPT Auto-Login Process...', 'info');
    
    const args = [
      '--log-session', sessionId,
      '--log-server', `http://localhost:${process.env.PORT || 5000}`
    ];
    if (req.query?.mode === 'refresh') {
      args.push('--refresh');
      LogStreamingService.addLog(sessionId, 'Mode: Refresh existing session', 'info');
    }
    if (req.query?.mode === 'validate') {
      args.push('--validate');
      LogStreamingService.addLog(sessionId, 'Mode: Validate session', 'info');
    }
    
    const child = spawn(process.execPath, [script, ...args], {
      cwd: path.join(__dirname, '..'),
      env: process.env,
      stdio: 'pipe'
    });

    // Attach child process to log session for runtime control
    try {
      LogStreamingService.attachProcess(sessionId, child, path.basename(script));
    } catch (e) {
      console.warn('Failed to attach process to LogStreamingService', e.message || e);
    }

    // Capture script output
    let scriptOutput = '';
    child.stdout?.on('data', (data) => {
      scriptOutput += data.toString();
      LogStreamingService.addLog(sessionId, data.toString().trim(), 'info');
    });

    child.stderr?.on('data', (data) => {
      scriptOutput += data.toString();
      LogStreamingService.addLog(sessionId, data.toString().trim(), 'warn');
    });

    child.on('error', (error) => {
      LogStreamingService.addLog(sessionId, `Process error: ${error.message}`, 'error');
      LogStreamingService.endSession(sessionId, 'failed');
    });

    child.on('exit', (code) => {
      if (code === 0) {
        LogStreamingService.addLog(sessionId, 'ChatGPT Auto-Login completed successfully ✓', 'success');
        LogStreamingService.endSession(sessionId, 'completed');
      } else {
        LogStreamingService.addLog(sessionId, `Script exited with code ${code}`, 'error');
        LogStreamingService.endSession(sessionId, 'failed');
      }
      // ensure attached process record is cleaned up
      try { LogStreamingService.detachProcess(sessionId); } catch (e) {}
    });

    res.json({ success: true, sessionId, pid: child.pid });
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

/**
 * Log Streaming Endpoints
 */

// Get logs for a specific session (for polling)
router.get('/logs/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const logs = LogStreamingService.getLogs(sessionId);
    res.json({ success: true, sessionId, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually add log entry (for scripts to post logs)
router.post('/logs/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, level = 'info' } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    LogStreamingService.addLog(sessionId, message, level);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// End session (for cleanup)
router.post('/logs/:sessionId/end', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status = 'completed' } = req.body;

    LogStreamingService.endSession(sessionId, status);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check if a process is attached to a session
router.get('/session-process/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const info = LogStreamingService.getProcessInfo(sessionId);
    if (!info) return res.json({ success: true, exists: false });
    res.json({ success: true, exists: true, pid: info.pid, scriptName: info.scriptName });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Kill a running process attached to a session
router.post('/run/kill-session', (req, res) => {
  try {
    if (!checkAdminKey(req, res)) return;
    const { sessionId, signal = 'SIGTERM' } = req.body || {};
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });
    const ok = LogStreamingService.sendSignal(sessionId, signal);
    res.json({ success: ok });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Write to stdin of attached process
router.post('/run/session-stdin', (req, res) => {
  try {
    if (!checkAdminKey(req, res)) return;
    const { sessionId, data } = req.body || {};
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });
    const ok = LogStreamingService.writeStdin(sessionId, data || '\n');
    res.json({ success: ok });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run a whitelisted command and attach logs to a session
router.post('/run/command', (req, res) => {
  try {
    if (!checkAdminKey(req, res)) return;
    const { command, args = [], cwd } = req.body || {};
    if (!command) return res.status(400).json({ success: false, error: 'command required' });

    const allowed = (process.env.ALLOWED_COMMANDS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(command)) {
      return res.status(403).json({ success: false, error: 'command_not_allowed' });
    }

    const sessionId = randomUUID();
    LogStreamingService.createSession(sessionId);
    LogStreamingService.addLog(sessionId, `Starting command: ${command} ${args.join(' ')}`, 'info');

    const child = spawn(command, args, {
      cwd: cwd ? path.resolve(cwd) : path.join(__dirname, '..'),
      env: process.env,
      stdio: 'pipe'
    });

    LogStreamingService.attachProcess(sessionId, child, command);

    child.stdout?.on('data', (d) => LogStreamingService.addLog(sessionId, d.toString().trim(), 'info'));
    child.stderr?.on('data', (d) => LogStreamingService.addLog(sessionId, d.toString().trim(), 'warn'));
    child.on('error', (err) => {
      LogStreamingService.addLog(sessionId, `Process error: ${err.message}`, 'error');
      LogStreamingService.endSession(sessionId, 'failed');
      LogStreamingService.detachProcess(sessionId);
    });
    child.on('exit', (code) => {
      if (code === 0) LogStreamingService.endSession(sessionId, 'completed');
      else LogStreamingService.endSession(sessionId, 'failed');
      LogStreamingService.detachProcess(sessionId);
    });

    res.json({ success: true, sessionId, pid: child.pid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Grok Authentication Endpoints
 */

router.post('/run/grok-auto-login', (req, res) => {
  try {
    const script = path.join(__dirname, '..', 'scripts', 'auth', 'grok', 'login.js');
    if (!fs.existsSync(script)) return res.status(404).json({ success: false, error: 'script_not_found' });
    
    // Create a unique session ID for this auto-login run
    const sessionId = randomUUID();
    
    // Initialize logging session
    LogStreamingService.createSession(sessionId);
    LogStreamingService.addLog(sessionId, 'Starting Grok Auto-Login Process...', 'info');
    
    const args = [
      '--log-session', sessionId,
      '--log-server', `http://localhost:${process.env.PORT || 5000}`
    ];
    if (req.query?.mode === 'refresh') {
      args.push('--refresh');
      LogStreamingService.addLog(sessionId, 'Mode: Refresh existing session', 'info');
    }
    if (req.query?.mode === 'validate') {
      args.push('--validate');
      LogStreamingService.addLog(sessionId, 'Mode: Validate session', 'info');
    }
    if (req.query?.mode === 'capture') {
      args.push('--capture');
      LogStreamingService.addLog(sessionId, 'Mode: Capture new session (manual login)', 'info');
    }
    
    // Support Playwright backend for better Cloudflare handling
    if (req.query?.playwright === 'true' || req.query?.backend === 'playwright') {
      args.push('--playwright');
      LogStreamingService.addLog(sessionId, 'Backend: Playwright (Cloudflare optimized)', 'info');
    } else {
      LogStreamingService.addLog(sessionId, 'Backend: Puppeteer (default)', 'info');
    }
    
    const child = spawn(process.execPath, [script, ...args], {
      cwd: path.join(__dirname, '..'),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']  // stdin: ignore (no input needed), stdout/stderr: pipe (logging)
    });

    // Attach child process to log session for runtime control
    try {
      LogStreamingService.attachProcess(sessionId, child, path.basename(script));
    } catch (e) {
      console.warn('Failed to attach process to LogStreamingService', e.message || e);
    }

    // Capture script output
    let scriptOutput = '';
    child.stdout?.on('data', (data) => {
      scriptOutput += data.toString();
      LogStreamingService.addLog(sessionId, data.toString().trim(), 'info');
    });

    child.stderr?.on('data', (data) => {
      scriptOutput += data.toString();
      LogStreamingService.addLog(sessionId, data.toString().trim(), 'warn');
    });

    child.on('error', (error) => {
      LogStreamingService.addLog(sessionId, `Process error: ${error.message}`, 'error');
      LogStreamingService.endSession(sessionId, 'failed');
    });

    child.on('exit', (code) => {
      if (code === 0) {
        LogStreamingService.addLog(sessionId, 'Grok Auto-Login completed successfully ✓', 'success');
        LogStreamingService.endSession(sessionId, 'completed');
      } else {
        LogStreamingService.addLog(sessionId, `Script exited with code ${code}`, 'error');
        LogStreamingService.endSession(sessionId, 'failed');
      }
      // ensure attached process record is cleaned up
      try { LogStreamingService.detachProcess(sessionId); } catch (e) {}
    });

    res.json({ success: true, sessionId, pid: child.pid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/status/grok-session', (req, res) => {
  try {
    const sessionPath = path.join(__dirname, '..', '.sessions', 'grok-session-complete.json');
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

export default router;
