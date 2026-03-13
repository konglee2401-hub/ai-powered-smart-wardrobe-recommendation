import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, '..', '..');
const ENV_TUNNEL_PATH = path.join(BACKEND_ROOT, '.env.tunnel');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const writeTunnelEnv = (url) => {
  const lines = [
    `APP_BASE_URL=${url}`,
    `FACEBOOK_REDIRECT_URI=${url}/api/social-media/facebook/oauth/callback`,
  ];
  fs.writeFileSync(ENV_TUNNEL_PATH, lines.join('\n') + '\n', 'utf8');
  console.log(`[tunnel] wrote ${path.relative(BACKEND_ROOT, ENV_TUNNEL_PATH)} with APP_BASE_URL=${url}`);
};

const resolveTunnel = () => {
  const provider = (process.env.TUNNEL_PROVIDER || 'ngrok').toLowerCase();
  const customDomain = process.env.TUNNEL_DOMAIN || '';
  if (provider === 'cloudflared') {
    return {
      provider,
      command: 'cloudflared',
      args: ['tunnel', '--url', 'http://localhost:5000', '--no-autoupdate'],
      urlRegex: /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i,
    };
  }
  const args = ['http'];
  if (customDomain) {
    args.push(`--url=https://${customDomain}`);
  }
  args.push('5000');
  return {
    provider: 'ngrok',
    command: 'ngrok',
    args,
    urlRegex: /https:\/\/[a-z0-9-]+\.ngrok(?:-free)?\.dev/i,
    customDomain,
  };
};

const startTunnel = () => {
  const { provider, command, args, urlRegex, customDomain } = resolveTunnel();
  if (provider === 'ngrok' && process.env.TUNNEL_KILL_EXISTING !== '0') {
    try {
      if (process.platform === 'win32') {
        const isAdmin = spawnSync('net', ['session'], { stdio: 'ignore', shell: true }).status === 0;
        if (isAdmin) {
          spawn('taskkill', ['/IM', 'ngrok.exe', '/F'], { stdio: 'ignore', shell: true });
        } else {
          console.log('[tunnel] skip taskkill (not running as admin)');
        }
      } else {
        spawn('pkill', ['-f', 'ngrok'], { stdio: 'ignore', shell: true });
      }
      console.log('[tunnel] attempted to stop existing ngrok process');
    } catch (error) {
      console.warn('[tunnel] failed to stop existing ngrok process:', error.message);
    }
  }
  console.log(`[tunnel] starting ${provider}${customDomain ? ` (domain: ${customDomain})` : ''}...`);
  const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });

  let lastUrl = '';
  const onData = (chunk) => {
    const text = String(chunk || '');
    process.stdout.write(text);
    if (/ERR_NGROK_334|already online/i.test(text)) {
      return;
    }
    const match = text.match(urlRegex);
    if (match && match[0] !== lastUrl) {
      lastUrl = match[0];
      writeTunnelEnv(lastUrl);
    }
  };

  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);

  proc.on('error', (err) => {
    console.error(`[tunnel] Failed to start ${provider}:`, err.message);
    console.error(`[tunnel] Install ${provider} and ensure it is in PATH.`);
  });

  proc.on('exit', (code) => {
    console.warn(`[tunnel] ${provider} exited with code ${code}`);
  });

  return proc;
};

const startBackend = () => {
  const proc = spawn(npmCmd, ['run', 'dev'], {
    stdio: 'inherit',
    cwd: BACKEND_ROOT,
    env: process.env,
    shell: true,
  });

  proc.on('exit', (code) => {
    console.warn(`[backend] dev exited with code ${code}`);
  });

  return proc;
};

const tunnelProc = startTunnel();
const backendProc = startBackend();

const shutdown = () => {
  if (tunnelProc && !tunnelProc.killed) tunnelProc.kill();
  if (backendProc && !backendProc.killed) backendProc.kill();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
