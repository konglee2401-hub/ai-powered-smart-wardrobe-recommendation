# Browser Session Management Guide

## Overview

This guide explains how to use browser session persistence for automated AI services like Z.AI and Grok. Session management allows you to login once and reuse that session for automated testing without logging in again.

## Quick Start

### 1. Login and Save Session

```bash
# For Z.AI
npm run login:zai

# For Grok (when available)
npm run login:grok
```

This will:
1. Open a browser window
2. Wait for you to login manually
3. Save your session to `.sessions/` folder

### 2. Run Tests with Saved Session

```bash
# Test Z.AI with saved session
npm run test:browser:zai

# Test with full flow
npm run test:flow -- --analysis zai-browser
```

The saved session will be automatically loaded, so you don't need to login again.

---

## Session Management Commands

### List All Sessions

```bash
npm run session:list
```

Output:
```
================================================================================
  📋 SAVED SESSIONS
================================================================================

Found 2 session(s):

📦 zai
   Created: 2/14/2026, 10:30:00 AM
   Modified: 2/14/2026, 10:35:00 AM
   Size: 15.23 KB

📦 grok
   Created: 2/14/2026, 11:00:00 AM
   Modified: 2/14/2026, 11:05:00 AM
   Size: 12.45 KB
```

### Show Session Details

```bash
npm run session:info -- zai
```

Output:
```
================================================================================
  📋 SESSION INFO: zai
================================================================================

Session Details:

  Service: zai
  File: .sessions/zai-session.json
  Created: 2/14/2026, 10:30:00 AM
  Size: 15.23 KB

  Cookies: 8
  LocalStorage Origins: 2
```

### Delete a Session

```bash
npm run session:delete -- zai
```

### Clear All Sessions

```bash
npm run session:clear
```

---

## How It Works

### Session Storage

Sessions are stored in the `.sessions/` folder:

```
backend/
├── .sessions/
│   ├── zai-session.json      # Z.AI session
│   └── grok-session.json     # Grok session
├── services/
│   └── browser/
│       ├── sessionManager.js  # Session management
│       ├── browserService.js  # Base browser service
│       └── zaiChatService.js  # Z.AI specific service
└── scripts/
    ├── zai-login.js           # Login helper
    └── session-manager.js     # CLI tool
```

### Session Data

Each session file contains:
- **Cookies**: Authentication cookies
- **LocalStorage**: Session tokens and preferences
- **Origins**: Per-origin storage data

Example session structure:
```json
{
  "cookies": [
    {
      "name": "session_token",
      "value": "...",
      "domain": ".z.ai",
      "path": "/",
      "expires": 1735689600,
      "httpOnly": true,
      "secure": true
    }
  ],
  "origins": [
    {
      "origin": "https://chat.z.ai",
      "localStorage": [
        {"name": "user_prefs", "value": "{...}"}
      ]
    }
  ]
}
```

---

## SessionManager API

### Constructor

```javascript
import SessionManager from './services/browser/sessionManager.js';

const manager = new SessionManager('zai');
```

### Methods

#### hasSession()
Check if a session exists.

```javascript
if (manager.hasSession()) {
  console.log('Session found');
}
```

#### saveSession(context)
Save session from browser context.

```javascript
const saved = await manager.saveSession(browserContext);
if (saved) {
  console.log('Session saved');
}
```

#### loadSession()
Load session data.

```javascript
const sessionData = manager.loadSession();
// Returns: { cookies: [...], origins: [...] }
```

#### deleteSession()
Delete saved session.

```javascript
const deleted = manager.deleteSession();
```

#### getSessionInfo()
Get session metadata.

```javascript
const info = manager.getSessionInfo();
// Returns: { exists, path, created, size, service }
```

---

## Integration with BrowserService

### Automatic Session Loading

When you create a browser service with a session manager, it automatically loads the saved session:

```javascript
import ZAIChatService from './services/browser/zaiChatService.js';

const zaiService = new ZAIChatService({
  headless: true  // Can run headless with saved session
});

// Session is automatically loaded
await zaiService.initialize();
```

### Manual Session Handling

```javascript
// Check if logged in
const isLoggedIn = await zaiService.checkIfLoggedIn();

if (!isLoggedIn) {
  // Perform login
  await zaiService.performLogin(true);  // true = save session
}

// Save session manually
await zaiService.saveSession();

// Delete session
await zaiService.deleteSession();

// Get session info
const info = zaiService.getSessionInfo();
```

---

## Best Practices

### 1. Session Expiration

Sessions expire based on the service's cookie expiration. Check periodically:

```bash
# Check session info
npm run session:info -- zai

# If expired, login again
npm run login:zai
```

### 2. Security

- **Never commit sessions to git** - `.sessions/` is in `.gitignore`
- **Sessions contain sensitive data** - Treat them like passwords
- **Delete sessions when done** - `npm run session:clear`

### 3. Multiple Accounts

To use different accounts:

```bash
# Delete current session
npm run session:delete -- zai

# Login with different account
npm run login:zai
```

### 4. Headless Mode

With a saved session, you can run headless:

```javascript
const zaiService = new ZAIChatService({
  headless: true  // Works with saved session
});
```

---

## Troubleshooting

### "No session found"

**Problem:** Running test without saved session.

**Solution:**
```bash
npm run login:zai
```

### "Session expired"

**Problem:** Session cookies have expired.

**Solution:**
```bash
# Delete old session
npm run session:delete -- zai

# Login again
npm run login:zai
```

### "Login failed"

**Problem:** Could not complete login flow.

**Solutions:**
1. Try manual login with visible browser:
   ```bash
   node scripts/zai-login.js
   ```
2. Check if 2FA is required
3. Verify your account is not locked

### "Session not loading"

**Problem:** Saved session not being used.

**Check:**
1. Session file exists:
   ```bash
   npm run session:list
   ```
2. Session has valid cookies:
   ```bash
   npm run session:info -- zai
   ```
3. Service is using SessionManager:
   ```javascript
   // Should have sessionManager property
   console.log(zaiService.sessionManager);
   ```

---

## Advanced Usage

### Custom Session Location

```javascript
const manager = new SessionManager('zai', {
  sessionsDir: './my-sessions'
});
```

### Session Validation

```javascript
// After loading session, verify it works
await zaiService.initialize();
const isValid = await zaiService.checkIfLoggedIn();

if (!isValid) {
  // Session is invalid, need to re-login
  await zaiService.performLogin(true);
}
```

### Multiple Services

```javascript
// Z.AI session
const zaiManager = new SessionManager('zai');

// Grok session
const grokManager = new SessionManager('grok');

// Check both
const sessions = [
  { name: 'zai', hasSession: zaiManager.hasSession() },
  { name: 'grok', hasSession: grokManager.hasSession() }
];

console.table(sessions);
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Browser Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
          npx playwright install chromium
      
      - name: Create sessions directory
        run: mkdir -p backend/.sessions
      
      - name: Restore cached session
        uses: actions/cache@v2
        with:
          path: backend/.sessions
          key: zai-session-${{ hashFiles('backend/.sessions/*.json') }}
      
      - name: Run browser tests
        run: |
          cd backend
          npm run test:browser:zai
        env:
          # Session should be restored from cache
          # If not, tests may fail
          CI: true
```

### Session Caching

Cache sessions between CI runs:

```yaml
- name: Cache sessions
  uses: actions/cache@v2
  with:
    path: backend/.sessions
    key: sessions-${{ runner.os }}-${{ hashFiles('backend/.sessions/*.json') }}
    restore-keys: |
      sessions-${{ runner.os }}-
```

---

## Related Documentation

- [Browser Automation Guide](./BROWSER_AUTOMATION_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [API Keys Setup](./API_KEYS_SETUP.md)

---

## Support

If you encounter issues:

1. Check this guide first
2. Run `npm run session:info -- <service>` to diagnose
3. Try deleting and recreating the session
4. Check the browser automation logs for errors

For more help, see the project documentation or create an issue.
